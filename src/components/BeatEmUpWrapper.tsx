import { useEffect, useRef } from 'react';

interface BeatEmUpWrapperProps {
  onCompleteGame: () => void;
}

const BeatEmUpWrapper = ({ onCompleteGame }: BeatEmUpWrapperProps) => {
  const onCompleteRef = useRef(onCompleteGame);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  onCompleteRef.current = onCompleteGame;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'beatEmUpComplete') {
        onCompleteRef.current();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 聚焦 iframe 以接收键盘输入
  useEffect(() => {
    const focusIframe = () => {
      try {
        iframeRef.current?.focus();
        iframeRef.current?.contentWindow?.focus();
      } catch (e) { /* ignore */ }
    };
    // 加载完成后聚焦
    iframeRef.current?.addEventListener('load', focusIframe);
    const t = setTimeout(focusIframe, 500);
    return () => {
      iframeRef.current?.removeEventListener('load', focusIframe);
      clearTimeout(t);
    };
  }, []);

  // 兜底：父页面按键转发到 iframe（不依赖焦点）
  useEffect(() => {
    const send = (down: boolean) => (e: KeyboardEvent) => {
      // 阻止方向键/空格滚动页面
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'gameKey', key: e.key, down },
          '*'
        );
      } catch (err) { /* ignore */ }
    };
    const onDown = send(true);
    const onUp = send(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-black flex items-center justify-center"
      onClick={() => {
        try {
          iframeRef.current?.focus();
          iframeRef.current?.contentWindow?.focus();
        } catch (e) { /* ignore */ }
      }}
    >
      <iframe
        ref={iframeRef}
        src="./beat-em-up.html"
        className="border-0"
        style={{
          width: '800px',
          height: '500px',
          maxWidth: '100vw',
          maxHeight: '100vh',
          aspectRatio: '800 / 500',
        }}
        title="热血格斗 - 第一关"
        allow="autoplay"
        tabIndex={0}
      />
    </div>
  );
};

export default BeatEmUpWrapper;
