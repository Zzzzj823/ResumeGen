import type { CSSProperties } from 'react';
import type { Resume, Entry } from '../types/resume';

export type Block = { id: string; section?: string; keepNext?: boolean } & (
  | { type: 'header'; basics: Resume['basics']; showPhoto: boolean }
  | { type: 'section'; title: string }
  | { type: 'entry'; entry: Entry }
  | { type: 'paragraph'; text: string; continuation?: boolean }
);
export function makeBlocks(resume: Resume): Block[] {
  const blocks: Block[] = [
    {
      id: 'header',
      type: 'header',
      basics: resume.basics,
      showPhoto: resume.settings.showPhoto,
    },
  ];
  for (const section of resume.sections.filter((s) => s.visible)) {
    const entries = section.entries.filter((e) =>
      [e.title, e.subtitle, e.detail, e.description, e.start, e.end].some((s) =>
        s.trim(),
      ),
    );
    if (!entries.length) continue;
    blocks.push({
      id: JSON.stringify(['section', section.id]),
      type: 'section',
      title: section.title,
      section: section.title,
      keepNext: true,
    });
    for (const entry of entries) {
      const paragraphs = entry.description
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (
        [
          entry.title,
          entry.subtitle,
          entry.detail,
          entry.start,
          entry.end,
        ].some(Boolean)
      )
        blocks.push({
          id: JSON.stringify(['entry', section.id, entry.id]),
          type: 'entry',
          entry,
          section: section.title,
          keepNext: paragraphs.length > 0,
        });
      paragraphs.forEach((text, index) =>
        blocks.push({
          id: JSON.stringify(['paragraph', section.id, entry.id, index]),
          type: 'paragraph',
          text,
          section: section.title,
        }),
      );
    }
  }
  return blocks;
}
export function resumeStyle(resume: Resume): CSSProperties {
  return {
    '--resume-size': `${resume.settings.fontSize}pt`,
    '--resume-leading': resume.settings.lineHeight,
    '--page-margin': `${resume.settings.margin}mm`,
  } as CSSProperties;
}
export function ClassicBlock({ block }: { block: Block }) {
  if (block.type === 'header') {
    const b = block.basics;
    return (
      <header
        className={`resume-header ${block.showPhoto && b.photo ? 'with-photo' : ''}`}
      >
        <div className="identity">
          <h1>{b.name || '姓名'}</h1>
          <div className="contact">
            {[b.phone, b.email].filter(Boolean).map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>
          <div className="contact">
            {[b.role && `求职意向：${b.role}`, b.location]
              .filter(Boolean)
              .map((v, i) => (
                <span key={i}>{v}</span>
              ))}
          </div>
        </div>
        {block.showPhoto && b.photo && (
          <img className="resume-photo" src={b.photo} alt="个人证件照" />
        )}
      </header>
    );
  }
  if (block.type === 'section')
    return <h2 className="resume-section-title">{block.title}</h2>;
  if (block.type === 'entry')
    return (
      <div className="resume-entry-heading">
        <div className="entry-title-line">
          <strong>{block.entry.title}</strong>
          <span className="entry-date">
            {[block.entry.start, block.entry.end].filter(Boolean).join(' — ')}
          </span>
        </div>
        {(block.entry.subtitle || block.entry.detail) && (
          <div className="entry-subtitle">
            {[block.entry.subtitle, block.entry.detail]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
      </div>
    );
  return (
    <div
      className={`resume-paragraph ${block.continuation ? 'continued' : ''}`}
    >
      <span aria-hidden="true" className="bullet">
        {block.continuation ? '' : '•'}
      </span>
      <span>{block.text}</span>
    </div>
  );
}
