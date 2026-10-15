import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH: '/ResumeGen/' },
});
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  {
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, BASE_PATH: '/ResumeGen/' },
  },
);
let browser;
try {
  const url = `http://127.0.0.1:${port}/ResumeGen/`;
  let available = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(url)).ok) {
        available = true;
        break;
      }
    } catch {
      /* Server is starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(available, 'Production preview did not start');
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(url);
  await page.locator('.pages[data-ready="true"]').waitFor();
  assert.equal(await page.locator('.pages h1').textContent(), '林知远');
  await page.reload();
  await page.locator('.pages[data-ready="true"]').waitFor();
  assert.deepEqual(errors, []);
  console.log('GitHub Pages /ResumeGen/ production path and reload passed.');
} finally {
  await browser?.close();
  server.kill();
}
