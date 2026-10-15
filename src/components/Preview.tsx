import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Scan, FileText } from 'lucide-react';
import type { Resume } from '../types/resume';
import {
  ClassicBlock,
  makeBlocks,
  resumeStyle,
  type Block,
} from '../templates/Classic';
import {
  paginate,
  type ResumePage,
  type MeasuredBlock,
} from '../utils/paginate';
import { IconButton } from './IconButton';

export default function Preview({
  resume,
  onReady,
}: {
  resume: Resume;
  onReady: (ready: boolean) => void;
}) {
  const measure = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<ResumePage[]>([]);
  const [zoom, setZoom] = useState(0.8);
  const [fit, setFit] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const [measuredResume, setMeasuredResume] = useState<Resume | null>(null);
  const blocks = useMemo(() => makeBlocks(resume), [resume]);
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive) setFontsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!fit || !viewport.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setZoom(
        Math.min(
          1,
          Math.max(0.25, (entry.contentRect.width - 48) / ((210 * 96) / 25.4)),
        ),
      ),
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [fit]);
  useLayoutEffect(() => {
    if (!measure.current || !fontsReady) return;
    const root = measure.current;
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>('[data-measure]'),
    );
    const measured: MeasuredBlock[] = [];
    blocks.forEach((block, index) => {
      const node = nodes[index];
      const height = node.getBoundingClientRect().height;
      if (block.type !== 'paragraph' || height < 120) {
        measured.push({ block, height });
        return;
      }
      // Split very long paragraphs using the same DOM typography as the printed page.
      const content = node.querySelector(
        '.resume-paragraph > span:last-child',
      )!;
      const chars = Array.from(block.text);
      let offset = 0,
        part = 0;
      while (offset < chars.length) {
        let low = 1,
          high = chars.length - offset;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          content.textContent = chars.slice(offset, offset + mid).join('');
          if (node.getBoundingClientRect().height <= 100) low = mid;
          else high = mid - 1;
        }
        // Prefer a word boundary when splitting Latin text, but always make progress.
        let take = low;
        const candidate = chars.slice(offset, offset + take).join('');
        const space = candidate.lastIndexOf(' ');
        if (offset + take < chars.length && space > candidate.length * 0.7)
          take = Array.from(candidate.slice(0, space + 1)).length;
        const text = chars.slice(offset, offset + take).join('');
        content.textContent = text;
        measured.push({
          block: {
            ...block,
            id: `${block.id}:part${part}`,
            text,
            continuation: part > 0,
          },
          height: node.getBoundingClientRect().height,
        });
        offset += take;
        part++;
      }
      content.textContent = block.text;
    });
    const capacity = ((297 - resume.settings.margin * 2) * 96) / 25.4 - 2;
    const continuationNode = root.querySelector('.continuation-heading')!;
    const originalText = continuationNode.textContent;
    let continuationHeight = continuationNode.getBoundingClientRect().height;
    for (const title of new Set(
      blocks.map((block) => block.section).filter(Boolean),
    )) {
      continuationNode.textContent = `${title}（续）`;
      continuationHeight = Math.max(
        continuationHeight,
        continuationNode.getBoundingClientRect().height,
      );
    }
    continuationNode.textContent = originalText;
    setPages(paginate(measured, capacity, continuationHeight));
    setMeasuredResume(resume);
  }, [blocks, resume, fontsReady]);
  const ready =
    fontsReady &&
    measuredResume === resume &&
    pages.length > 0 &&
    !pages.some((p) => p.overflow);
  useEffect(() => onReady(ready), [ready, onReady]);
  return (
    <main className="preview" aria-label="A4 简历预览" ref={viewport}>
      <div className="preview-toolbar">
        <div className="template-label">
          <FileText size={16} />
          <span>Classic Professional</span>
          <span className="paper-tag">A4</span>
        </div>
        <div className="zoom-tools">
          <IconButton
            label="缩小"
            disabled={zoom <= 0.3}
            onClick={() => {
              setFit(false);
              setZoom(Math.max(0.3, zoom - 0.1));
            }}
          >
            <Minus size={16} />
          </IconButton>
          <output>{Math.round(zoom * 100)}%</output>
          <IconButton
            label="放大"
            disabled={zoom >= 1.5}
            onClick={() => {
              setFit(false);
              setZoom(Math.min(1.5, zoom + 0.1));
            }}
          >
            <Plus size={16} />
          </IconButton>
          <IconButton label="适应宽度" onClick={() => setFit(true)}>
            <Scan size={16} />
          </IconButton>
        </div>
      </div>
      <div className="preview-meta">
        <span>实时预览</span>
        <span>{pages.length} 页 · 210 × 297 mm</span>
      </div>
      {pages.some((p) => p.overflow) && (
        <p role="alert" className="overflow-warning">
          内容超出页面边界，请缩小字号或缩短标题。修复后可导出 PDF。
        </p>
      )}
      <div className="pages" data-ready={ready} style={resumeStyle(resume)}>
        {pages.map((page, index) => (
          <div
            className="page-frame"
            key={index}
            style={{
              width: `${((210 * 96) / 25.4) * zoom}px`,
              height: `${((297 * 96) / 25.4) * zoom}px`,
            }}
          >
            <article
              className="resume-page"
              aria-label={`简历第 ${index + 1} 页`}
              style={{ transform: `scale(${zoom})` }}
            >
              <div className="page-content">
                {page.continuation && (
                  <div className="continuation-heading">
                    {page.continuation}（续）
                  </div>
                )}
                {page.blocks.map((block: Block) => (
                  <div className="resume-block" key={block.id}>
                    <ClassicBlock block={block} />
                  </div>
                ))}
              </div>
            </article>
            <span className="page-number">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
      <div
        ref={measure}
        className="measure resume-page"
        style={resumeStyle(resume)}
        aria-hidden="true"
      >
        <div className="page-content">
          {blocks.map((block) => (
            <div className="resume-block" data-measure key={block.id}>
              <ClassicBlock block={block} />
            </div>
          ))}
          <div className="continuation-heading">模块（续）</div>
        </div>
      </div>
    </main>
  );
}
