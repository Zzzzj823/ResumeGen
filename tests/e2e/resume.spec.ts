import { test, expect, type Page } from '@playwright/test';
import {
  getDocument,
  OPS,
  type PDFPageProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import { example } from '../../src/data/example';

async function ready(page: Page) {
  await expect(page.locator('.pages')).toHaveAttribute('data-ready', 'true');
}

async function pdfText(page: PDFPageProxy) {
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    // These PDFs contain horizontal text. Check the actual PDF coordinates,
    // since extractable text alone does not prove that it is inside the page.
    const [x, baseline] = viewport.convertToViewportPoint(
      item.transform[4],
      item.transform[5],
    );
    expect(x).toBeGreaterThanOrEqual(-1);
    expect(x + item.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(baseline - item.height).toBeGreaterThanOrEqual(-1);
    expect(baseline).toBeLessThanOrEqual(viewport.height + 1);
  }
  // CJK fonts can map shared glyphs to compatibility radicals (⼯/工,
  // ⼀/一, ⾏/行). PDF.js 4's normalization does not cover those radicals.
  // Normalize extracted text only; keep exact content and page-count checks.
  return content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join('')
    .normalize('NFKC');
}
async function assertBounds(page: Page) {
  const bounds = await page
    .locator('.pages .resume-page')
    .evaluateAll((pages) =>
      pages.map((p) => {
        const content = p.querySelector('.page-content')!;
        const style = getComputedStyle(p);
        return {
          overflowX: content.scrollWidth > content.clientWidth + 1,
          height:
            content.getBoundingClientRect().height /
            (p.getBoundingClientRect().width / ((210 * 96) / 25.4)),
          capacity: (297 * 96) / 25.4 - 2 * parseFloat(style.paddingTop),
        };
      }),
    );
  for (const item of bounds) {
    expect(item.overflowX).toBe(false);
    expect(item.height).toBeLessThanOrEqual(item.capacity + 1);
  }
}
test('default A4, real-time editing, persistence, JSON and PDF', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await ready(page);
  await expect(page.locator('.pages .resume-page')).toHaveCount(1);
  await assertBounds(page);
  await page.screenshot({
    path: info.outputPath('desktop.png'),
    fullPage: true,
  });
  await page.getByLabel('姓名', { exact: true }).fill('测试工程师');
  await expect(page.locator('.pages h1')).toHaveText('测试工程师');
  await expect(page.getByText('所有更改已保存到本机')).toBeVisible();
  await page.reload();
  await ready(page);
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue(
    '测试工程师',
  );
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON', exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toBe(
    '测试工程师_简历.json',
  );
  const pdfBytes = await page.pdf({
    path: info.outputPath('resume.pdf'),
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
  });
  const pdf = await getDocument({
    data: new Uint8Array(pdfBytes),
    useSystemFonts: true,
  }).promise;
  expect(pdf.numPages).toBe(1);
  const first = await pdf.getPage(1);
  const viewport = first.getViewport({ scale: 1 });
  expect(viewport.width).toBeCloseTo(595.28, 0);
  expect(viewport.height).toBeCloseTo(841.89, 0);
  const text = await pdfText(first);
  expect(text).toContain('测试工程师');
  expect(text).toContain('教育经历');
  expect(text).not.toContain('简历工作台');
  await pdf.destroy();
  expect(errors).toEqual([]);
});
test('multi-page long paragraphs, photo, special characters and large typography', async ({
  page,
}, info) => {
  const resume = structuredClone(example);
  resume.settings.fontSize = 14;
  resume.settings.margin = 24;
  resume.settings.lineHeight = 1.9;
  resume.sections[1].entries[0].description =
    '中文长文本 Unicode 测试：React & TypeScript <HTML> 100% ① ★。'.repeat(180);
  const sentinel = '最后一行完整保留END';
  resume.sections[4].entries[0].description += `\n${sentinel}`;
  await page.addInitScript(
    (r) => localStorage.setItem('resumegen.draft.v1', JSON.stringify(r)),
    resume,
  );
  await page.goto('/');
  await ready(page);
  const count = await page.locator('.pages .resume-page').count();
  expect(count).toBeGreaterThan(2);
  await assertBounds(page);
  await expect(page.locator('.pages')).toContainText(sentinel);
  await expect(page.locator('.pages .resume-page').last()).toContainText(
    sentinel,
  );
  await page.emulateMedia({ media: 'print' });
  await ready(page);
  await assertBounds(page);
  const bytes = await page.pdf({
    path: info.outputPath('long-resume.pdf'),
    preferCSSPageSize: true,
    printBackground: true,
  });
  const pdf = await getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  }).promise;
  expect(pdf.numPages).toBe(count);
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    pageTexts.push(await pdfText(await pdf.getPage(i)));
  }
  const text = pageTexts.join('');
  expect(text).toContain(sentinel);
  expect(pageTexts.at(-1)).toContain(sentinel);
  expect(text.split(sentinel)).toHaveLength(2);
  expect(text.match(/Unicode/g)?.length).toBe(180);
  expect(text.match(/中文/g)?.length).toBe(180);
  expect(text.match(/<HTML>/g)?.length).toBe(180);
  expect(text.match(/★。/g)?.length).toBe(180);
  await pdf.destroy();
  await page.emulateMedia({ media: 'screen' });
  await page.screenshot({ path: info.outputPath('multipage.png') });
});
test('module ordering, visibility, photo and mobile layout', async ({
  page,
}, info) => {
  await page.goto('/');
  await ready(page);
  await page.getByLabel('显示教育经历', { exact: true }).uncheck();
  await expect(page.locator('.pages')).not.toContainText('教育经历');
  await page.getByLabel('显示教育经历', { exact: true }).check();
  await page
    .getByRole('button', { name: '下移模块', exact: true })
    .first()
    .click();
  await expect(page.locator('.pages .resume-section-title').first()).toHaveText(
    '实习经历',
  );
  const photo = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 90;
    c.height = 120;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#567f9b';
    ctx.fillRect(0, 0, 90, 120);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page
    .locator('input[accept="image/jpeg,image/png,image/webp"]')
    .setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(photo, 'base64'),
    });
  await expect(page.locator('.pages .resume-photo')).toBeVisible();
  await ready(page);
  await assertBounds(page);
  expect(
    await page
      .locator('.pages .resume-photo')
      .evaluate((img) => (img as HTMLImageElement).naturalWidth),
  ).toBe(90);
  const photoPdf = await getDocument({
    data: new Uint8Array(
      await page.pdf({
        path: info.outputPath('photo.pdf'),
        preferCSSPageSize: true,
      }),
    ),
  }).promise;
  const operators = await (await photoPdf.getPage(1)).getOperatorList();
  expect(operators.fnArray).toContain(OPS.paintImageXObject);
  await photoPdf.destroy();
  await page.getByRole('tab', { name: '排版设置' }).click();
  await page.getByLabel('显示个人照片').uncheck();
  await expect(page.locator('.pages .resume-photo')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.screenshot({
    path: info.outputPath('mobile.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('bad imports and unavailable local storage remain recoverable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await ready(page);
  await page.getByLabel('姓名', { exact: true }).fill('仍可编辑');
  await expect(page.getByRole('alert')).toContainText('草稿保存失败');
  await page.getByLabel('导入简历文件').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator('.toast')).toContainText('简历格式不正确');
  await expect(page.locator('.pages h1')).toHaveText('仍可编辑');
});

test('import, keyboard sorting, editing records, reset and print command', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  page.on('dialog', (dialog) => dialog.accept());
  const imported = structuredClone(example);
  imported.basics.name = '导入用户';
  imported.settings.fontSize = 12;
  await page.getByLabel('导入简历文件').setInputFiles({
    name: 'resume.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue(
    '导入用户',
  );
  // Collapse sections so the keyboard target is within the scroll viewport.
  await page.getByRole('button', { name: '教育经历 1', exact: true }).click();
  await page.getByRole('button', { name: '实习经历 1', exact: true }).click();
  const handle = page.getByRole('button', {
    name: '拖动排序：教育经历',
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(
    page
      .locator('[id^="DndLiveRegion-"]')
      .filter({ hasText: 'over droppable area work' }),
  ).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect(page.locator('.pages .resume-section-title').first()).toHaveText(
    '实习经历',
  );
  await page.getByRole('button', { name: '重置模板', exact: true }).click();
  await expect(page.locator('.pages h1')).toHaveText('导入用户');
  await page.getByRole('button', { name: '新建简历', exact: true }).click();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('');
  await page.getByLabel('新模块类型').selectOption('work');
  await page.getByRole('button', { name: '添加模块', exact: true }).click();
  await page.getByLabel('公司', { exact: true }).fill('新公司');
  await page.getByLabel('工作内容', { exact: true }).fill('新增记录的内容');
  await expect(page.locator('.pages')).toContainText('新公司');
  await page.getByRole('button', { name: '添加记录', exact: true }).click();
  await expect(page.getByLabel('公司', { exact: true })).toHaveCount(2);
  await page
    .getByRole('button', { name: '删除记录', exact: true })
    .last()
    .click();
  await expect(page.getByLabel('公司', { exact: true })).toHaveCount(1);
  await page.getByLabel('姓名', { exact: true }).fill('打印用户');
  await ready(page);
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printTitle = document.title;
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await page.getByRole('button', { name: '导出 PDF', exact: true }).click();
  await page.getByRole('button', { name: '打开打印窗口', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute(
    'data-print-title',
    '打印用户_简历',
  );
  await expect(page).toHaveTitle('ResumeGen');
});
