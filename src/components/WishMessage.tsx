import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Gift, Trophy, Rocket, Heart, Star, Sparkles, Zap, RefreshCw } from 'lucide-react';
import { WISH_MESSAGES, AUTO_WISH_MESSAGES } from '../utils/constants';

const COLORS = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'];

const useMusicBeat = () => {
  const [beat, setBeat] = useState(0);
  const beatRef = useRef(0);

  useEffect(() => {
    const handler = () => {
      beatRef.current = Date.now();
      setBeat(Date.now());
    };
    window.addEventListener('music-beat', handler as EventListener);
    return () => window.removeEventListener('music-beat', handler as EventListener);
  }, []);

  return beat;
};

interface MessageProps {
  text: string;
  color: string;
  delay: number;
}

const MessageItem = ({ text, color, delay }: MessageProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 animate-slide-up cursor-pointer group"
      style={{ animationDelay: `${delay}s`, opacity: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="w-2 h-2 rounded-full transition-all duration-300"
        style={{
          backgroundColor: color,
          boxShadow: isHovered ? `0 0 15px ${color}` : 'none',
          transform: isHovered ? 'scale(1.5)' : 'scale(1)',
        }}
      />
      <span
        className="text-base md:text-lg transition-all duration-300"
        style={{
          color: isHovered ? color : '#8892a8',
          transform: isHovered ? 'translateX(5px)' : 'translateX(0)',
        }}
      >
        {text}
      </span>
    </div>
  );
};

const AutoWishCard = ({ message, index, beat }: { message: string; index: number; beat: number }) => {
  const color = COLORS[index % COLORS.length];
  const isBeating = beat > 0 && (Date.now() - beat) < 300;

  return (
    <div
      className={`glass-effect rounded-lg p-4 text-center animate-scale-in hover-lift group music-reactive ${isBeating ? 'beat' : ''}`}
      style={{
        animationDelay: `${index * 0.15}s`,
        border: `1px solid ${color}30`,
      }}
    >
      <p
        className="text-sm md:text-base font-medium transition-all duration-300 group-hover:scale-105"
        style={{ color }}
      >
        {message}
      </p>
    </div>
  );
};

const WishMessage = () => {
  const [autoMessages, setAutoMessages] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const beat = useMusicBeat();
  const [scrollWish, setScrollWish] = useState<string>('');
  const [scrollKey, setScrollKey] = useState(0);

  const generateRandomMessages = () => {
    const shuffled = [...AUTO_WISH_MESSAGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  };

  useEffect(() => {
    setAutoMessages(generateRandomMessages());

    const interval = setInterval(() => {
      setAutoMessages(generateRandomMessages());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pickScrollWish = () => {
      const wish = AUTO_WISH_MESSAGES[Math.floor(Math.random() * AUTO_WISH_MESSAGES.length)];
      setScrollWish(wish);
      setScrollKey(k => k + 1);
    };
    pickScrollWish();
    const interval = setInterval(pickScrollWish, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setAutoMessages(generateRandomMessages());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const interactiveItems = [
    { icon: Gift, label: '惊喜', color: '#9d4edd', bgColor: 'from-neon-purple/20 to-pink-500/20' },
    { icon: Trophy, label: '成就', color: '#00d4ff', bgColor: 'from-neon-blue/20 to-cyan-500/20' },
    { icon: Rocket, label: '梦想', color: '#ff6b9d', bgColor: 'from-pink-500/20 to-rose-500/20' },
    { icon: Heart, label: '爱', color: '#ec4899', bgColor: 'from-rose-500/20 to-pink-500/20' },
    { icon: Star, label: '闪耀', color: '#facc15', bgColor: 'from-yellow-500/20 to-amber-500/20' },
    { icon: Sparkles, label: '美好', color: '#22d3ee', bgColor: 'from-cyan-500/20 to-neon-blue/20' },
  ];

  const [clickedItem, setClickedItem] = useState<number | null>(null);
  const isBeating = beat > 0 && (Date.now() - beat) < 300;

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className={`text-2xl md:text-3xl font-bold mb-4 font-display shimmer-text music-reactive ${isBeating ? 'beat' : ''}`}>
            祝福寄语
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 mx-auto rounded-full" />
        </div>

        <div className="mb-12 overflow-hidden py-3 neon-box rounded-lg">
          <div
            key={scrollKey}
            className="wish-scroll text-lg md:text-xl font-medium text-center whitespace-nowrap"
            style={{ color: COLORS[scrollKey % COLORS.length] }}
          >
            ✨ {scrollWish} ✨
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className={`neon-box rounded-xl p-6 music-reactive ${isBeating ? 'beat' : ''}`}>
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-neon-blue" />
              <span className="text-light-gray font-medium">美好祝愿</span>
            </div>
            <div className="space-y-3">
              {WISH_MESSAGES.map((message, index) => (
                <MessageItem
                  key={index}
                  text={message.text}
                  color={message.color}
                  delay={message.delay}
                />
              ))}
            </div>
          </div>

          <div className={`neon-box rounded-xl p-6 music-reactive ${isBeating ? 'beat' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neon-purple" />
                <span className="text-light-gray font-medium">温馨祝福</span>
              </div>
              <button
                onClick={handleRefresh}
                className="p-2 rounded-full text-silver-gray hover:text-neon-blue transition-colors"
                title="刷新祝福"
              >
                <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {autoMessages.map((message, index) => (
                <AutoWishCard key={`${message}-${index}`} message={message} index={index} beat={beat} />
              ))}
            </div>
            <p className="text-silver-gray/50 text-xs text-center mt-4">
              祝福每10秒自动更新 · 共{AUTO_WISH_MESSAGES.length}条
            </p>
          </div>
        </div>

        <div className="mt-12">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-white font-display">点击探索</h3>
            <p className="text-silver-gray text-sm mt-2">每个按钮都有惊喜</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {interactiveItems.map((item, index) => {
              const Icon = item.icon;
              const isClicked = clickedItem === index;

              return (
                <button
                  key={index}
                  onClick={() => setClickedItem(isClicked ? null : index)}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl transition-all duration-500
                    ${isClicked
                      ? `bg-gradient-to-br ${item.bgColor} scale-110 shadow-lg`
                      : 'neon-box hover-lift'
                    }`}
                  style={{
                    animation: 'slideUp 0.5s ease-out forwards',
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                  }}
                >
                  <Icon
                    className={`w-10 h-10 transition-all duration-300 ${isClicked ? 'scale-125' : ''}`}
                    style={{ color: item.color }}
                  />
                  <span
                    className="font-medium transition-all duration-300"
                    style={{ color: isClicked ? item.color : '#e0e6ed' }}
                  >
                    {item.label}
                  </span>
                  {isClicked && (
                    <span className="text-xs animate-bounce" style={{ color: item.color }}>
                      ✨ {['惊喜满满!', '太棒了!', '继续加油!', '热爱!', '闪闪发光!', '美好无限!'][index]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`mt-16 neon-box rounded-xl p-8 text-center glow-pulse music-reactive ${isBeating ? 'beat' : ''}`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-neon-blue" />
            <h3 className="text-xl font-semibold text-white font-display">特别祝福</h3>
            <Zap className="w-6 h-6 text-neon-purple" />
          </div>
          <p className="text-light-gray leading-relaxed">
            愿你在人生的旅途中，始终保持热爱，奔赴山海。
            <br />
            愿每一个平凡的日子都闪烁着光芒，愿每一个梦想都绽放成花朵。
            <br />
            愿你的世界永远充满色彩与希望，生日快乐！
          </p>
          <div className="flex justify-center gap-3 mt-6">
            {['🎂', '✨', '💫', '🌟', '🎉', '💖'].map((emoji, index) => (
              <span
                key={index}
                className="text-2xl animate-bounce"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishMessage;
