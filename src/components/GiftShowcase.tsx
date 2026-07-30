import { useEffect, useState, useRef } from 'react';
import { Gift, Sparkles, Heart, Star, Rocket, Music, Cake, PartyPopper, Gem, Crown, Flame, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

interface GiftItem {
  id: number;
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  bgGradient: string;
  borderGradient: string;
}

const giftItems: GiftItem[] = [
  {
    id: 1,
    icon: <Gift className="w-10 h-10" />,
    title: '精心准备的礼物',
    message: '愿这份礼物带给你无尽的喜悦与温暖',
    color: '#ff6b9d',
    bgGradient: 'from-pink-500/20 to-rose-500/20',
    borderGradient: 'from-pink-500 to-rose-500',
  },
  {
    id: 2,
    icon: <Heart className="w-10 h-10" />,
    title: '满满的爱',
    message: '愿你被爱包围，每一刻都感受到温暖与幸福',
    color: '#ec4899',
    bgGradient: 'from-rose-500/20 to-pink-500/20',
    borderGradient: 'from-rose-500 to-pink-500',
  },
  {
    id: 3,
    icon: <Star className="w-10 h-10" />,
    title: '闪耀的星光',
    message: '愿你如星辰般闪耀，照亮自己也温暖他人',
    color: '#facc15',
    bgGradient: 'from-yellow-400/20 to-amber-500/20',
    borderGradient: 'from-yellow-400 to-amber-500',
  },
  {
    id: 4,
    icon: <Sparkles className="w-10 h-10" />,
    title: '闪烁的美好',
    message: '愿生活处处有惊喜，时时有美好相伴',
    color: '#22d3ee',
    bgGradient: 'from-cyan-400/20 to-neon-blue/20',
    borderGradient: 'from-cyan-400 to-neon-blue',
  },
  {
    id: 5,
    icon: <Rocket className="w-10 h-10" />,
    title: '梦想的启航',
    message: '愿你的梦想展翅高飞，飞向更远的天空',
    color: '#00d4ff',
    bgGradient: 'from-neon-blue/20 to-cyan-400/20',
    borderGradient: 'from-neon-blue to-cyan-400',
  },
  {
    id: 6,
    icon: <Gem className="w-10 h-10" />,
    title: '珍贵的祝福',
    message: '愿你的每一天都如宝石般璀璨珍贵',
    color: '#a855f7',
    bgGradient: 'from-purple-500/20 to-violet-500/20',
    borderGradient: 'from-purple-500 to-violet-500',
  },
  {
    id: 7,
    icon: <Crown className="w-10 h-10" />,
    title: '专属的荣耀',
    message: '愿你成为自己人生中的王者，绽放最耀眼的光芒',
    color: '#f59e0b',
    bgGradient: 'from-amber-500/20 to-yellow-400/20',
    borderGradient: 'from-amber-500 to-yellow-400',
  },
  {
    id: 8,
    icon: <Music className="w-10 h-10" />,
    title: '动听的旋律',
    message: '愿你的生活充满动听的旋律，每一天都如音乐般美好',
    color: '#9d4edd',
    bgGradient: 'from-neon-purple/20 to-violet-500/20',
    borderGradient: 'from-neon-purple to-violet-500',
  },
  {
    id: 9,
    icon: <Cake className="w-10 h-10" />,
    title: '甜蜜的时光',
    message: '愿你的生活如蛋糕般甜蜜，每一口都是幸福的味道',
    color: '#fb7185',
    bgGradient: 'from-rose-400/20 to-pink-400/20',
    borderGradient: 'from-rose-400 to-pink-400',
  },
  {
    id: 10,
    icon: <Flame className="w-10 h-10" />,
    title: '热情的火焰',
    message: '愿你永远充满激情，去追逐自己的热爱与梦想',
    color: '#f97316',
    bgGradient: 'from-orange-500/20 to-red-400/20',
    borderGradient: 'from-orange-500 to-red-400',
  },
  {
    id: 11,
    icon: <Zap className="w-10 h-10" />,
    title: '无限的能量',
    message: '愿你永远活力满满，拥有无限的能量去迎接每一个挑战',
    color: '#06b6d4',
    bgGradient: 'from-cyan-500/20 to-teal-500/20',
    borderGradient: 'from-cyan-500 to-teal-500',
  },
  {
    id: 12,
    icon: <PartyPopper className="w-10 h-10" />,
    title: '无尽的庆祝',
    message: '愿你的生活充满欢乐与庆祝，每一刻都值得铭记',
    color: '#ec4899',
    bgGradient: 'from-pink-500/20 to-rose-500/20',
    borderGradient: 'from-pink-500 to-rose-500',
  },
];

const GiftShowcase = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % giftItems.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + giftItems.length) % giftItems.length);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const visibleRange = () => {
    const items: GiftItem[] = [];
    for (let i = -1; i <= 1; i++) {
      const idx = (currentIndex + i + giftItems.length) % giftItems.length;
      items.push(giftItems[idx]);
    }
    return items;
  };

  const visibleItems = visibleRange();

  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gem className="w-8 h-8 text-neon-blue" style={{ filter: 'drop-shadow(0 0 15px #00d4ff)' }} />
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display">
              礼物精选
            </h2>
            <Gem className="w-8 h-8 text-neon-purple" style={{ filter: 'drop-shadow(0 0 15px #9d4edd)' }} />
          </div>
          <p className="text-silver-gray">每一份礼物都承载着特别的心意</p>
          <div className="w-24 h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 mx-auto rounded-full mt-4" />
        </div>

        {/* 轮播展示 */}
        <div 
          className="relative overflow-hidden py-12"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <div className="flex items-center justify-center gap-6">
            {visibleItems.map((item, idx) => {
              const isCenter = idx === 1;
              const isLeft = idx === 0;
              const isRight = idx === 2;

              return (
                <div
                  key={`${item.id}-${idx}`}
                  className={`transition-all duration-500 ease-out cursor-pointer ${
                    isCenter
                      ? 'w-72 md:w-80 scale-100 opacity-100'
                      : 'w-56 md:w-64 scale-90 opacity-50'
                  }`}
                  onClick={() => {
                    if (isLeft) prevSlide();
                    if (isRight) nextSlide();
                  }}
                >
                  <div
                    className="neon-box rounded-xl p-6 text-center relative overflow-hidden group"
                    style={{
                      borderColor: isCenter ? item.color : 'transparent',
                      boxShadow: isCenter ? `0 0 40px ${item.color}40` : undefined,
                    }}
                  >
                    {/* 背景渐变 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.bgGradient} opacity-50`} />
                    
                    {/* 装饰粒子 */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute rounded-full"
                          style={{
                            width: `${Math.random() * 4 + 2}px`,
                            height: `${Math.random() * 4 + 2}px`,
                            backgroundColor: item.color,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                            opacity: 0.3,
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10">
                      <div
                        className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${item.borderGradient} flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110`}
                        style={{ filter: `drop-shadow(0 0 20px ${item.color})` }}
                      >
                        <span className="text-white">{item.icon}</span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-3 font-display">{item.title}</h3>
                      <p className="text-silver-gray text-sm leading-relaxed">{item.message}</p>

                      {isCenter && (
                        <div className="mt-4 flex justify-center gap-2">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="w-2 h-2 rounded-full animate-pulse"
                              style={{ backgroundColor: item.color, animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 左右按钮 */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full neon-box flex items-center justify-center hover:scale-110 transition-transform z-20"
          >
            <ChevronLeft className="w-6 h-6 text-neon-blue" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full neon-box flex items-center justify-center hover:scale-110 transition-transform z-20"
          >
            <ChevronRight className="w-6 h-6 text-neon-blue" />
          </button>

          {/* 指示器 */}
          <div className="flex justify-center gap-2 mt-8">
            {giftItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-6 bg-neon-blue' : 'bg-silver-gray/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 快捷预览 - 网格模式 */}
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-white text-center mb-8 font-display">
            全部礼物
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {giftItems.map((item, index) => (
              <div
                key={item.id}
                className="neon-box rounded-lg p-4 text-center hover-lift cursor-pointer group transition-all duration-300"
                onClick={() => setCurrentIndex(index)}
                style={{
                  borderColor: index === currentIndex ? item.color : undefined,
                  boxShadow: index === currentIndex ? `0 0 20px ${item.color}40` : undefined,
                }}
              >
                <div
                  className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${item.borderGradient} flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110`}
                  style={{ filter: `drop-shadow(0 0 8px ${item.color})` }}
                >
                  <span className="text-white scale-50">{item.icon}</span>
                </div>
                <span className="text-xs text-light-gray truncate block">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftShowcase;
