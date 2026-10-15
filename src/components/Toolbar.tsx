import { useRef, useState } from 'react';
import {
  FilePlus2,
  Save,
  Upload,
  Download,
  Printer,
  RotateCcw,
  X,
  FileText,
} from 'lucide-react';
import { useResume } from '../stores/resume';
import { example } from '../data/example';
import {
  downloadJSON,
  filename,
  MAX_JSON_BYTES,
  parseResume,
} from '../utils/data';
import { IconButton } from './IconButton';

export default function Toolbar({
  ready,
  notify,
}: {
  ready: boolean;
  notify: (message: string) => void;
}) {
  const store = useResume();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [printing, setPrinting] = useState(false);
  const print = async () => {
    setPrinting(true);
    try {
      await document.fonts.ready;
      await Promise.all(
        Array.from(
          document.querySelectorAll<HTMLImageElement>('.pages img'),
        ).map((img) => img.decode()),
      );
      const oldTitle = document.title;
      document.title = filename(store.resume.basics.name);
      dialog.current?.close();
      const restore = () => {
        document.title = oldTitle;
        window.removeEventListener('afterprint', restore);
      };
      window.addEventListener('afterprint', restore);
      try {
        window.print();
      } catch (error) {
        restore();
        throw error;
      }
    } catch {
      notify('打印失败，请检查照片是否有效，并重试。');
    } finally {
      setPrinting(false);
    }
  };
  return (
    <header className="app-toolbar">
      <a href="./" className="brand" aria-label="ResumeGen 首页">
        <span className="brand-mark">
          <FileText size={21} />
        </span>
        <span>
          Resume<span className="brand-light">Gen</span>
        </span>
      </a>
      <span className="toolbar-divider" />
      <span className="workspace-label">简历工作台</span>
      <div className="toolbar-actions">
        <IconButton
          label="新建简历"
          onClick={() => {
            if (confirm('新建将替换当前草稿。请先导出 JSON 备份，是否继续？'))
              store.newResume();
          }}
        >
          <FilePlus2 size={18} />
        </IconButton>
        <IconButton
          label="保存草稿"
          onClick={() => {
            store.save();
            notify(useResume.getState().error || '草稿已保存');
          }}
        >
          <Save size={18} />
        </IconButton>
        <IconButton label="导入 JSON" onClick={() => input.current?.click()}>
          <Upload size={18} />
        </IconButton>
        <IconButton
          label="导出 JSON"
          onClick={() => downloadJSON(store.resume)}
        >
          <Download size={18} />
        </IconButton>
        <IconButton
          label="重置模板"
          onClick={() => {
            store.resetSettings();
            notify('已恢复默认排版设置');
          }}
        >
          <RotateCcw size={18} />
        </IconButton>
        <button
          className="print-button"
          disabled={!ready}
          onClick={() => dialog.current?.showModal()}
        >
          <Printer size={16} />
          <span>导出 PDF</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="导入简历文件"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              if (file.size > MAX_JSON_BYTES)
                throw new Error('JSON 文件不能超过 4 MB');
              const data = parseResume(await file.text());
              if (confirm('导入将替换当前草稿，是否继续？')) {
                store.replace(data);
                notify('简历已导入');
              }
            } catch (error) {
              notify((error as Error).message);
            }
          }}
        />
      </div>
      <dialog ref={dialog} className="print-dialog">
        <div className="dialog-heading">
          <h2>导出简历 PDF</h2>
          <IconButton label="关闭" onClick={() => dialog.current?.close()}>
            <X size={18} />
          </IconButton>
        </div>
        <p>在浏览器打印窗口选择以下设置：</p>
        <ol>
          <li>
            目标打印机：<strong>另存为 PDF</strong>
          </li>
          <li>
            纸张：<strong>A4</strong>，布局：<strong>纵向</strong>，缩放：
            <strong>100%</strong>
          </li>
          <li>
            关闭<strong>页眉和页脚</strong>，启用<strong>背景图形</strong>
          </li>
          <li>
            保存文件名：
            <strong>{filename(store.resume.basics.name)}.pdf</strong>
          </li>
        </ol>
        <p className="small">
          浏览器会弹出打印窗口，最终保存位置和文件名由你确认。
        </p>
        <button
          className="print-button"
          disabled={printing || !ready}
          onClick={print}
        >
          <Printer size={16} />
          {printing ? '准备中…' : '打开打印窗口'}
        </button>
      </dialog>
      <button
        className="example-action"
        onClick={() => {
          if (confirm('载入示例将替换当前草稿，是否继续？'))
            store.replace(structuredClone(example));
        }}
      >
        载入示例
      </button>
    </header>
  );
}
