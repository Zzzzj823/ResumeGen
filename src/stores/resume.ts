import { create } from 'zustand';
import { example, blankResume, emptyEntry } from '../data/example';
import {
  defaultSettings,
  labels,
  type Resume,
  type Section,
  type Entry,
  type Settings,
} from '../types/resume';
import { parseResume, reorder, serializeResume } from '../utils/data';

export const STORAGE_KEY = 'resumegen.draft.v1';
let initial = structuredClone(example);
let initialError = '';
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) initial = parseResume(raw);
} catch {
  initialError =
    '已有草稿无法读取，已载入示例。请先导出或检查旧草稿，再手动保存。';
}
interface Store {
  resume: Resume;
  savedAt: number | null;
  error: string;
  dirty: boolean;
  replace: (resume: Resume) => void;
  basic: (key: keyof Resume['basics'], value: string) => void;
  settings: (patch: Partial<Settings>) => void;
  section: (
    id: string,
    patch: Partial<Pick<Section, 'title' | 'visible'>>,
  ) => void;
  entry: (section: string, id: string, patch: Partial<Entry>) => void;
  addSection: (kind: Section['kind']) => void;
  removeSection: (id: string) => void;
  addEntry: (id: string) => void;
  removeEntry: (section: string, id: string) => void;
  sortSections: (from: string, to: string) => void;
  sortEntries: (section: string, from: string, to: string) => void;
  newResume: () => void;
  resetSettings: () => void;
  save: () => void;
}
export const useResume = create<Store>((set, get) => {
  const update = (fn: (r: Resume) => Resume) =>
    set((s) => ({ resume: fn(s.resume), dirty: true }));
  const mapSection = (id: string, fn: (s: Section) => Section) =>
    update((r) => ({
      ...r,
      sections: r.sections.map((s) => (s.id === id ? fn(s) : s)),
    }));
  return {
    resume: initial,
    savedAt: null,
    error: initialError,
    dirty: false,
    replace: (resume) => update(() => resume),
    basic: (key, value) =>
      update((r) => ({ ...r, basics: { ...r.basics, [key]: value } })),
    settings: (patch) =>
      update((r) => ({ ...r, settings: { ...r.settings, ...patch } })),
    section: (id, patch) => mapSection(id, (s) => ({ ...s, ...patch })),
    entry: (section, id, patch) =>
      mapSection(section, (s) => ({
        ...s,
        entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
    addSection: (kind) =>
      update((r) =>
        r.sections.length >= 20
          ? r
          : {
              ...r,
              sections: [
                ...r.sections,
                {
                  id: crypto.randomUUID(),
                  kind,
                  title: labels[kind],
                  visible: true,
                  entries: [emptyEntry()],
                },
              ],
            },
      ),
    removeSection: (id) =>
      update((r) => ({
        ...r,
        sections: r.sections.filter((s) => s.id !== id),
      })),
    addEntry: (id) =>
      mapSection(id, (s) =>
        s.entries.length >= 60
          ? s
          : { ...s, entries: [...s.entries, emptyEntry()] },
      ),
    removeEntry: (section, id) =>
      mapSection(section, (s) => ({
        ...s,
        entries: s.entries.filter((e) => e.id !== id),
      })),
    sortSections: (a, b) =>
      update((r) => ({ ...r, sections: reorder(r.sections, a, b) })),
    sortEntries: (id, a, b) =>
      mapSection(id, (s) => ({ ...s, entries: reorder(s.entries, a, b) })),
    newResume: () => update(blankResume),
    resetSettings: () =>
      update((r) => ({ ...r, settings: { ...defaultSettings } })),
    save: () => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeResume(get().resume));
        set({ savedAt: Date.now(), error: '', dirty: false });
      } catch {
        set({
          error: '草稿保存失败：本地存储不可用或空间不足。请导出 JSON 备份。',
        });
      }
    },
  };
});
let timer: ReturnType<typeof setTimeout>;
useResume.subscribe((state, previous) => {
  if (state.resume === previous.resume) return;
  clearTimeout(timer);
  timer = setTimeout(() => useResume.getState().save(), 500);
});
window.addEventListener('pagehide', () => {
  if (useResume.getState().dirty) useResume.getState().save();
});
