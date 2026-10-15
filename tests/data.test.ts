import { describe, it, expect } from 'vitest';
import { example } from '../src/data/example';
import {
  parseResume,
  reorder,
  serializeResume,
  filename,
} from '../src/utils/data';
import { readPhoto } from '../src/utils/photo';
import { makeBlocks } from '../src/templates/Classic';
import { paginate } from '../src/utils/paginate';

describe('JSON validation and round trip', () => {
  it('preserves all editable data', () =>
    expect(parseResume(serializeResume(example))).toEqual(example));
  it.each(['no json', '{}', '{"version":2}'])(
    'rejects malformed input: %s',
    (raw) => expect(() => parseResume(raw)).toThrow(),
  );
  it('rejects remote photos and unsafe settings', () => {
    const resume = structuredClone(example);
    resume.basics.photo = 'https://example.com/tracker.png';
    expect(() => parseResume(JSON.stringify(resume))).toThrow();
    resume.basics.photo = '';
    resume.settings.margin = -1;
    expect(() => parseResume(JSON.stringify(resume))).toThrow();
  });
  it('rejects duplicate IDs and oversized input', () => {
    const resume = structuredClone(example);
    resume.sections.push(resume.sections[0]);
    expect(() => parseResume(JSON.stringify(resume))).toThrow();
    expect(() => parseResume(' '.repeat(4 * 1024 * 1024 + 1))).toThrow();
  });
  it('sanitizes filenames', () => expect(filename('A/B:C')).toBe('A_B_C_简历'));
  it('rejects unsupported and oversized photos before decoding', async () => {
    await expect(
      readPhoto(new File(['x'], 'x.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow();
    await expect(
      readPhoto(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'x.png', {
          type: 'image/png',
        }),
      ),
    ).rejects.toThrow();
  });
});
describe('reordering and template data', () => {
  it('moves items without mutation or data loss', () => {
    const result = reorder(example.sections, 'education', 'project');
    expect(result.map((s) => s.id)).toEqual([
      'work',
      'project',
      'education',
      'skill',
      'other',
    ]);
    expect(example.sections[0].id).toBe('education');
    expect(reorder(example.sections, 'missing', 'project')).toBe(
      example.sections,
    );
  });
  it('honors hidden sections', () => {
    const resume = structuredClone(example);
    resume.sections[0].visible = false;
    expect(makeBlocks(resume).some((b) => b.section === '教育经历')).toBe(
      false,
    );
  });
});
describe('pagination', () => {
  it('keeps render keys unique for imported IDs containing separators', () => {
    const resume = structuredClone(example);
    resume.sections[0].id = 'header';
    resume.sections[1].id = 'header/edu-1';
    const blocks = makeBlocks(resume);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
  });
  it('keeps section and entry headings with the first paragraph', () => {
    const pages = paginate(
      [
        { block: { id: 'a', type: 'paragraph', text: 'A' }, height: 70 },
        {
          block: { id: 'b', type: 'section', title: 'Work', keepNext: true },
          height: 10,
        },
        {
          block: { id: 'c', type: 'paragraph', text: 'B', section: 'Work' },
          height: 30,
        },
      ],
      100,
    );
    expect(pages.map((p) => p.blocks.map((b) => b.id))).toEqual([
      ['a'],
      ['b', 'c'],
    ]);
  });
  it('reserves continuation labels and reports unsplittable overflow', () => {
    const pages = paginate(
      [
        {
          block: { id: 'a', type: 'paragraph', text: 'A', section: 'Work' },
          height: 90,
        },
        {
          block: { id: 'b', type: 'paragraph', text: 'B', section: 'Work' },
          height: 120,
        },
      ],
      100,
      20,
    );
    expect(pages[1].continuation).toBe('Work');
    expect(pages[1].overflow).toBe(true);
  });
});
