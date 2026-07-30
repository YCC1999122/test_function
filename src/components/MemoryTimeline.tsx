import { useEffect, useState, useRef } from 'react';
import { Calendar, Sparkles, Star, Heart, Rocket, Gift, PartyPopper, Flame, Music, Coffee, Sun, Moon, Cloud } from 'lucide-react';

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const timelineEvents: TimelineEvent[] = [
  {
    year: '出生',
    title: '来到这个世界',
    description: '你带着满满的爱与期待，来到了这个精彩的世界',
    icon: <Gift className="w-6 h-6" />,
    color: '#ff6b9d',
    gradient: 'from-pink-500 to-rose-400',
  },
  {
    year: '童年',
    title: '无忧无虑的时光',
    description: '每一个笑容都像阳光一样灿烂，每一天都充满了好奇与惊喜',
    icon: <Sparkles className="w-6 h-6" />,
    color: '#facc15',
    gradient: 'from-yellow-400 to-amber-500',
  },
  {
    year: '少年',
    title: '梦想启航',
    description: '心中有无数的梦想，眼中有星辰大海，脚下有路，未来可期',
    icon: <Rocket className="w-6 h-6" />,
    color: '#00d4ff',
    gradient: 'from-neon-blue to-cyan-400',
  },
  {
    year: '青春',
    title: '绽放光彩',
    description: '在最好的年华里，遇见更好的自己，经历最美好的故事',
    icon: <Star className="w-6 h-6" />,
    color: '#9d4edd',
    gradient: 'from-neon-purple to-purple-500',
  },
  {
    year: '现在',
    title: '闪耀当下',
    description: '此刻的你，比任何时候都更加迷人，更加闪耀',
    icon: <Flame className="w-6 h-6" />,
    color: '#f97316',
    gradient: 'from-orange-500 to-red-400',
  },
  {
    year: '未来',
    title: '无限可能',
    description: '前方的路还很长，更多的精彩正等着你去发现',
    icon: <PartyPopper className="w-6 h-6" />,
    color: '#22d3ee',
    gradient: 'from-cyan-400 to-neon-blue',
  },
];

const FloatingIcon = ({ icon, index }: { icon: React.ReactNode; index: number }) => {
  return (
    <div
      className="absolute animate-float"
      style={{
        left: `${10 + index * 15}%`,
        top: `${20 + (index % 3) * 20}%`,
        animationDelay: `${index * 0.5}s`,
        opacity: 0.2,
      }}
    >
      {icon}
    </div>
  );
};

const MemoryTimeline = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const progress = -rect.top / (rect.height - window.innerHeight);
        setScrollProgress(Math.max(0, Math.min(1, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % timelineEvents.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const decorativeIcons = [
    <Coffee className="w-5 h-5 text-neon-blue" />,
    <Sun className="w-5 h-5 text-yellow-400" />,
    <Moon className="w-5 h-5 text-neon-purple" />,
    <Cloud className="w-5 h-5 text-cyan-400" />,
    <Music className="w-5 h-5 text-pink-400" />,
    <Heart className="w-5 h-5 text-rose-400" />,
  ];

  return (
    <div className="py-20 px-4 relative overflow-hidden">
      {/* 装饰浮动图标 */}
      <div className="absolute inset-0 pointer-events-none">
        {decorativeIcons.map((icon, index) => (
          <FloatingIcon key={index} icon={icon} index={index} />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-neon-blue" style={{ filter: 'drop-shadow(0 0 15px #00d4ff)' }} />
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display">
              时光轴
            </h2>
            <Calendar className="w-8 h-8 text-neon-purple" style={{ filter: 'drop-shadow(0 0 15px #9d4edd)' }} />
          </div>
          <p className="text-silver-gray">回顾美好时光，展望精彩未来</p>
          <div className="w-24 h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 mx-auto rounded-full mt-4" />
        </div>

        <div ref={containerRef} className="relative">
          {/* 时间线 */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-neon-blue via-neon-purple to-pink-500 rounded-full opacity-30" />
            <div
              className="absolute left-0 top-0 w-full bg-gradient-to-b from-neon-blue via-neon-purple to-pink-500 rounded-full transition-all duration-300"
              style={{ height: `${scrollProgress * 100}%`, boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
            />
          </div>

          {/* 事件卡片 */}
          <div className="space-y-16">
            {timelineEvents.map((event, index) => (
              <div
                key={index}
                className={`relative flex items-center ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                style={{
                  animation: `slideUp 0.6s ease-out forwards`,
                  animationDelay: `${index * 0.15}s`,
                  opacity: 0,
                }}
              >
                {/* 圆点 */}
                <div
                  className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full border-4 border-[#0a0e17] z-10 transition-all duration-500"
                  style={{
                    backgroundColor: event.color,
                    boxShadow: activeIndex === index 
                      ? `0 0 30px ${event.color}, 0 0 60px ${event.color}80` 
                      : `0 0 15px ${event.color}80`,
                    transform: activeIndex === index 
                      ? 'translateX(-50%) scale(1.3)' 
                      : 'translateX(-50%) scale(1)',
                  }}
                />

                {/* 卡片 */}
                <div
                  className={`w-full md:w-5/12 neon-box rounded-xl p-6 transition-all duration-500 ${
                    activeIndex === index ? 'scale-105' : 'scale-100'
                  } hover:scale-105 cursor-pointer group`}
                  style={{
                    marginLeft: index % 2 === 0 ? '0' : 'auto',
                    marginRight: index % 2 === 0 ? 'auto' : '0',
                    borderColor: activeIndex === index ? event.color : undefined,
                    boxShadow: activeIndex === index ? `0 0 40px ${event.color}40` : undefined,
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${event.gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                      style={{ filter: `drop-shadow(0 0 10px ${event.color})` }}
                    >
                      <span className="text-white">{event.icon}</span>
                    </div>
                    <div>
                      <span
                        className="text-sm font-medium px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${event.color}20`, color: event.color }}
                      >
                        {event.year}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 font-display">{event.title}</h3>
                  <p className="text-silver-gray leading-relaxed">{event.description}</p>

                  {activeIndex === index && (
                    <div className="mt-4 flex gap-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-1 rounded-full flex-1 animate-pulse"
                          style={{ backgroundColor: event.color, animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部祝福 */}
        <div className="mt-20 text-center">
          <div className="neon-box rounded-xl p-8 inline-block relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${Math.random() * 4 + 2}px`,
                    height: `${Math.random() * 4 + 2}px`,
                    backgroundColor: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15'][i % 4],
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    opacity: 0.4,
                  }}
                />
              ))}
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 font-display relative z-10">
              未来的故事，由你继续书写
            </h3>
            <p className="text-silver-gray relative z-10">
              愿你的人生剧本，精彩绝伦，独一无二
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryTimeline;
