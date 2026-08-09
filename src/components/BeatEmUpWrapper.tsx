import { useEffect, useRef } from 'react';

interface BeatEmUpWrapperProps {
  onCompleteGame: () => void;
}

const BeatEmUpWrapper = ({ onCompleteGame }: BeatEmUpWrapperProps) => {
  const onCompleteRef = useRef(onCompleteGame);
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <iframe
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
      />
    </div>
  );
};

export default BeatEmUpWrapper;
