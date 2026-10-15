import { z } from 'zod';

const text = z.string().max(200);
export const kinds = [
  'education',
  'work',
  'project',
  'skill',
  'other',
] as const;
export const labels: Record<(typeof kinds)[number], string> = {
  education: '教育经历',
  work: '工作经历',
  project: '项目经历',
  skill: '专业技能',
  other: '其他信息',
};
export const entrySchema = z.object({
  id: z.string().min(1).max(80),
  title: text,
  subtitle: text,
  detail: text,
  start: text,
  end: text,
  description: z.string().max(15000),
});
const sectionSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: z.enum(kinds),
    title: z.string().min(1).max(80),
    visible: z.boolean(),
    entries: z.array(entrySchema).max(60),
  })
  .refine(
    (v) => new Set(v.entries.map((e) => e.id)).size === v.entries.length,
    '记录 ID 重复',
  );
export const settingsSchema = z.object({
  fontSize: z.number().min(9).max(14),
  lineHeight: z.number().min(1.2).max(1.9),
  margin: z.number().min(10).max(24),
  showPhoto: z.boolean(),
});
export const resumeSchema = z
  .object({
    version: z.literal(1),
    basics: z.object({
      name: text,
      phone: text,
      email: text,
      role: text,
      location: text,
      photo: z
        .string()
        .max(1500000)
        .refine(
          (v) =>
            v === '' ||
            /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v),
          '照片必须为本地 PNG、JPEG 或 WebP',
        ),
    }),
    sections: z.array(sectionSchema).max(20),
    settings: settingsSchema,
  })
  .refine(
    (v) => new Set(v.sections.map((s) => s.id)).size === v.sections.length,
    '模块 ID 重复',
  );
export type Resume = z.infer<typeof resumeSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Section = Resume['sections'][number];
export type Settings = Resume['settings'];
export const defaultSettings: Settings = {
  fontSize: 10.5,
  lineHeight: 1.5,
  margin: 15,
  showPhoto: true,
};
