import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

const ShareButton = () => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '特别时刻',
          text: '快来看看这份特别的心意！',
          url: url,
        });
      } catch (err) {
        await copyToClipboard(url);
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50">
      <button
        onClick={handleShare}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover-lift
          ${isCopied
            ? 'bg-neon-purple/20 border border-neon-purple text-neon-purple'
            : 'glass-effect neon-border text-light-gray hover:text-neon-blue'
          }`}
      >
        {isCopied ? (
          <>
            <Check className="w-4 h-4" />
            <span className="text-sm">已复制</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span className="text-sm">分享祝福</span>
          </>
        )}
      </button>
    </div>
  );
};

export default ShareButton;
