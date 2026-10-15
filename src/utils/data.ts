import { resumeSchema, type Resume } from '../types/resume';

export const MAX_JSON_BYTES = 4 * 1024 * 1024;
export function parseResume(raw: string): Resume {
  if (new Blob([raw]).size > MAX_JSON_BYTES)
    throw new Error('JSON 文件不能超过 4 MB');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  const result = resumeSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      `简历格式不正确：${result.error.issues[0].path.join('.')} ${result.error.issues[0].message}`,
    );
  return result.data;
}
export function serializeResume(resume: Resume) {
  return JSON.stringify(resumeSchema.parse(resume), null, 2);
}
export function reorder<T extends { id: string }>(
  items: T[],
  from: string,
  to: string,
): T[] {
  const a = items.findIndex((i) => i.id === from),
    b = items.findIndex((i) => i.id === to);
  if (a < 0 || b < 0 || a === b) return items;
  const next = [...items];
  next.splice(b, 0, next.splice(a, 1)[0]);
  return next;
}
export function filename(name: string) {
  return `${
    Array.from(name.trim())
      .map((c) => (c.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(c) ? '_' : c))
      .join('') || '未命名'
  }_简历`;
}
export function downloadJSON(resume: Resume) {
  const url = URL.createObjectURL(
    new Blob([serializeResume(resume)], {
      type: 'application/json;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename(resume.basics.name)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
