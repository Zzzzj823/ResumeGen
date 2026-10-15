import { useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Camera,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useResume } from '../stores/resume';
import { kinds, labels, type Entry, type Section } from '../types/resume';
import { readPhoto } from '../utils/photo';
import { IconButton } from '../components/IconButton';
import { SortableItem, SortableList } from './SortableList';

function Field({
  label,
  value,
  onChange,
  multiline = false,
  maxLength = 200,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <label className={`field ${multiline ? 'full' : ''}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={4}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
const fieldLabels: Record<Section['kind'], [string, string, string, string]> = {
  education: ['学校', '专业 / 学历', '补充信息', '相关描述'],
  work: ['公司', '职位', '部门 / 地点', '工作内容'],
  project: ['项目名称', '个人职责', '技术栈', '项目成果'],
  skill: ['技能分类', '熟练程度', '补充信息', '技能描述'],
  other: ['标题', '补充说明', '备注', '详细内容'],
};
function EntryForm({
  section,
  entry,
  index,
}: {
  section: Section;
  entry: Entry;
  index: number;
}) {
  const store = useResume();
  const names = fieldLabels[section.kind];
  const patch = (key: keyof Entry) => (value: string) =>
    store.entry(section.id, entry.id, { [key]: value });
  return (
    <SortableItem id={entry.id} label={entry.title || `记录 ${index + 1}`}>
      {(handle) => (
        <div className="entry-form">
          <div className="entry-tools">
            {handle}
            <span>
              {String(index + 1).padStart(2, '0')} · {entry.title || '新记录'}
            </span>
            <IconButton
              label="上移记录"
              disabled={index === 0}
              onClick={() =>
                store.sortEntries(
                  section.id,
                  entry.id,
                  section.entries[index - 1].id,
                )
              }
            >
              <ArrowUp size={14} />
            </IconButton>
            <IconButton
              label="下移记录"
              disabled={index === section.entries.length - 1}
              onClick={() =>
                store.sortEntries(
                  section.id,
                  entry.id,
                  section.entries[index + 1].id,
                )
              }
            >
              <ArrowDown size={14} />
            </IconButton>
            <IconButton
              label="删除记录"
              onClick={() => {
                if (window.confirm('确定删除这条记录？'))
                  store.removeEntry(section.id, entry.id);
              }}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
          <div className="form-grid">
            <Field
              label={names[0]}
              value={entry.title}
              onChange={patch('title')}
            />
            <Field
              label={names[1]}
              value={entry.subtitle}
              onChange={patch('subtitle')}
            />
            <Field
              label={names[2]}
              value={entry.detail}
              onChange={patch('detail')}
            />
            {section.kind !== 'skill' && (
              <>
                <Field
                  label="开始时间"
                  value={entry.start}
                  onChange={patch('start')}
                />
                <Field
                  label="结束时间"
                  value={entry.end}
                  onChange={patch('end')}
                />
              </>
            )}
            <Field
              label={names[3]}
              value={entry.description}
              onChange={patch('description')}
              multiline
              maxLength={15000}
            />
          </div>
        </div>
      )}
    </SortableItem>
  );
}
function SectionForm({ section, index }: { section: Section; index: number }) {
  const store = useResume();
  const [open, setOpen] = useState(true);
  return (
    <SortableItem id={section.id} label={section.title}>
      {(handle) => (
        <section
          className={`editor-section ${!section.visible ? 'muted-section' : ''}`}
        >
          <div className="section-tools">
            {handle}
            <button
              className="section-toggle"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <strong>{section.title}</strong>
              <span className="count">{section.entries.length}</span>
            </button>
            <label className="visibility">
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(e) =>
                  store.section(section.id, { visible: e.target.checked })
                }
                aria-label={`显示${section.title}`}
              />
            </label>
            <IconButton
              label="上移模块"
              disabled={index === 0}
              onClick={() =>
                store.sortSections(
                  section.id,
                  store.resume.sections[index - 1].id,
                )
              }
            >
              <ArrowUp size={14} />
            </IconButton>
            <IconButton
              label="下移模块"
              disabled={index === store.resume.sections.length - 1}
              onClick={() =>
                store.sortSections(
                  section.id,
                  store.resume.sections[index + 1].id,
                )
              }
            >
              <ArrowDown size={14} />
            </IconButton>
            <IconButton
              label={`删除${section.title}`}
              onClick={() => {
                if (
                  window.confirm(`确定删除「${section.title}」及其所有记录？`)
                )
                  store.removeSection(section.id);
              }}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
          {open && (
            <div className="section-body">
              <Field
                label="模块标题"
                value={section.title}
                maxLength={80}
                onChange={(v) =>
                  store.section(section.id, {
                    title: v || labels[section.kind],
                  })
                }
              />
              <SortableList
                ids={section.entries.map((e) => e.id)}
                onSort={(a, b) => store.sortEntries(section.id, a, b)}
              >
                {section.entries.map((e, i) => (
                  <EntryForm key={e.id} section={section} entry={e} index={i} />
                ))}
              </SortableList>
              <button
                className="add-record"
                disabled={section.entries.length >= 60}
                onClick={() => store.addEntry(section.id)}
              >
                <Plus size={15} />
                添加记录
              </button>
            </div>
          )}
        </section>
      )}
    </SortableItem>
  );
}
export default function Editor({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const store = useResume();
  const { basics, sections, settings } = store.resume;
  const [tab, setTab] = useState<'content' | 'style'>('content');
  const [kind, setKind] = useState<Section['kind']>('education');
  const photoInput = useRef<HTMLInputElement>(null);
  return (
    <aside className="editor" aria-label="简历编辑器">
      <div className="editor-heading">
        <div>
          <span className="eyebrow">WORKSPACE</span>
          <h1>我的简历</h1>
        </div>
        <span className="local-badge">
          <span />
          本地草稿
        </span>
      </div>
      <div className="tabs" role="tablist" aria-label="编辑模式">
        <button
          role="tab"
          aria-selected={tab === 'content'}
          onClick={() => setTab('content')}
        >
          简历内容
        </button>
        <button
          role="tab"
          aria-selected={tab === 'style'}
          onClick={() => setTab('style')}
        >
          排版设置
        </button>
      </div>
      <div className="editor-scroll">
        {tab === 'content' ? (
          <>
            <section className="editor-section basics-section">
              <div className="section-tools">
                <strong>基本信息</strong>
                <span className="section-index">01</span>
              </div>
              <div className="section-body">
                <div className="photo-row">
                  <button
                    className="photo-upload"
                    onClick={() => photoInput.current?.click()}
                    aria-label="上传个人照片"
                  >
                    {basics.photo ? (
                      <img src={basics.photo} alt="个人照片" />
                    ) : (
                      <Camera size={21} />
                    )}
                  </button>
                  <div>
                    <button
                      className="text-button"
                      onClick={() => photoInput.current?.click()}
                    >
                      上传证件照
                    </button>
                    <p className="small">JPG / PNG / WebP · 最大 5 MB</p>
                    {basics.photo && (
                      <button
                        className="text-button danger"
                        onClick={() => store.basic('photo', '')}
                      >
                        移除照片
                      </button>
                    )}
                  </div>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) {
                        try {
                          store.basic('photo', await readPhoto(file));
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }
                    }}
                  />
                </div>
                <div className="form-grid">
                  {(
                    [
                      ['name', '姓名'],
                      ['role', '求职意向'],
                      ['phone', '电话'],
                      ['email', '邮箱'],
                      ['location', '所在地'],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      value={basics[key]}
                      onChange={(v) => store.basic(key, v)}
                    />
                  ))}
                </div>
              </div>
            </section>
            <SortableList
              ids={sections.map((s) => s.id)}
              onSort={store.sortSections}
            >
              {sections.map((s, i) => (
                <SectionForm key={s.id} section={s} index={i} />
              ))}
            </SortableList>
            <div className="add-section">
              <select
                aria-label="新模块类型"
                value={kind}
                onChange={(e) => setKind(e.target.value as Section['kind'])}
              >
                {kinds.map((k) => (
                  <option value={k} key={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
              <button
                disabled={sections.length >= 20}
                onClick={() => store.addSection(kind)}
              >
                <Plus size={16} />
                添加模块
              </button>
            </div>
          </>
        ) : (
          <section className="settings-panel">
            <h2>Classic Professional</h2>
            <p className="small">经典专业简历</p>
            {(
              [
                ['fontSize', '正文字号', 9, 14, 0.5, 'pt'],
                ['lineHeight', '正文行距', 1.2, 1.9, 0.05, ''],
                ['margin', '页面边距', 10, 24, 1, 'mm'],
              ] as const
            ).map(([key, label, min, max, step, unit]) => (
              <label className="range-field" key={key}>
                <span>
                  {label}
                  <output>
                    {settings[key]} {unit}
                  </output>
                </span>
                <input
                  type="range"
                  aria-label={label}
                  min={min}
                  max={max}
                  step={step}
                  value={settings[key]}
                  onChange={(e) =>
                    store.settings({ [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
            <label className="check-field">
              <span>显示个人照片</span>
              <input
                type="checkbox"
                checked={settings.showPhoto}
                onChange={(e) =>
                  store.settings({ showPhoto: e.target.checked })
                }
              />
            </label>
          </section>
        )}
      </div>
      <div className="editor-footer">
        <span className="status-dot" />
        {store.dirty
          ? '正在保存更改…'
          : store.savedAt
            ? '所有更改已保存到本机'
            : '草稿仅保存在当前浏览器'}
      </div>
    </aside>
  );
}
