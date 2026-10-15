import { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import Toolbar from './components/Toolbar';
import Editor from './editor/Editor';
import Preview from './components/Preview';
import { useResume } from './stores/resume';
import { IconButton } from './components/IconButton';

export default function App() {
  const { resume, error } = useResume();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <>
      <Toolbar ready={ready} notify={setMessage} />
      {error && (
        <div className="storage-error" role="alert">
          {error}
        </div>
      )}
      <div className="workspace">
        <Editor notify={setMessage} />
        <Preview resume={resume} onReady={setReady} />
      </div>
      <footer className="app-footer">
        <span>
          <ShieldCheck size={13} />
          本地优先 · 数据不离开你的浏览器
        </span>
        <span>
          ResumeGen <span className="version">v1.0</span>
        </span>
      </footer>
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <IconButton label="关闭消息" onClick={() => setMessage('')}>
            <X size={16} />
          </IconButton>
        </div>
      )}
    </>
  );
}
