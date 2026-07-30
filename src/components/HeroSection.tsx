import { useEffect, useState, useRef } from 'react';
import { Sparkles, Star, Zap, Rainbow, Heart, Flame, Music, Gift, PartyPopper, Cake } from 'lucide-react';
import { WISH_MESSAGES, CELEBRATION_WORDS, EMOJIS } from '../utils/constants';

const useMusicBeat = () => {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const handler = () => setBeat(Date.now());
    window.addEventListener('music-beat', handler as EventListener);
    return () => window.removeEventListener('music-beat', handler as EventListener);
  }, []);
  return beat;
};

const FloatingEmoji = ({ emoji, delay, left, top }: { emoji: string; delay: number; left: string; top: string }) => (
  <div
    className="absolute text-2xl md:text-3xl animate-float"
    style={{ animationDelay: `${delay}s`, left, top }}
  >
    {emoji}
  </div>
);

const FloatingParticle = ({ index }: { index: number }) => (
  <div
    key={index}
    className="absolute rounded-full animate-float"
    style={{
      width: `${Math.random() * 6 + 2}px`,
      height: `${Math.random() * 6 + 2}px`,
      background: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][index % 5],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDuration: `${4 + Math.random() * 4}s`,
      animationDelay: `${Math.random() * 2}s`,
      opacity: Math.random() * 0.6 + 0.4,
      boxShadow: `0 0 ${Math.random() * 10 + 5}px currentColor`,
    }}
  />
);

const HeroSection = () => {
  const [activeWords, setActiveWords] = useState<string[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const titleRef = useRef<HTMLDivElement>(null);
  const beat = useMusicBeat();
  const isBeating = beat > 0 && (Date.now() - beat) < 300;

  useEffect(() => {
    setShowContent(true);

    const interval = setInterval(() => {
      const randomWords = CELEBRATION_WORDS.sort(() => Math.random() - 0.5).slice(0, 4);
      setActiveWords(randomWords);
    }, 2500);

    setActiveWords(CELEBRATION_WORDS.slice(0, 4));

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const parallaxX = (mousePos.x - 50) * 0.02;
  const parallaxY = (mousePos.y - 50) * 0.02;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12 overflow-hidden">
      {/* 背景3D圆环 - 鼠标视差效果 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${parallaxX * -1}px, ${parallaxY * -1}px)` }}>
        <div 
          className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full border border-neon-blue/10"
          style={{ 
            animation: 'spin 25s linear infinite',
            transformStyle: 'preserve-3d',
            boxShadow: '0 0 100px rgba(0, 212, 255, 0.1) inset'
          }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}>
        <div 
          className="w-[400px] h-[400px] md:w-[550px] md:h-[550px] rounded-full border border-neon-purple/15"
          style={{ animation: 'spin 18s linear infinite reverse' }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${parallaxX * -0.5}px, ${parallaxY * -0.5}px)` }}>
        <div 
          className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full border border-pink-500/15"
          style={{ animation: 'spin 12s linear infinite' }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)` }}>
        <div 
          className="w-[200px] h-[200px] md:w-[250px] md:h-[250px] rounded-full border border-yellow-400/20"
          style={{ animation: 'spin 8s linear infinite reverse' }}
        />
      </div>

      {/* 彩色旋转光束 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div 
          className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full opacity-30"
          style={{
            background: 'conic-gradient(from 0deg, #00d4ff, #9d4edd, #ff6b9d, #facc15, #22d3ee, #a855f7, #ec4899, #00d4ff)',
            animation: 'spin 30s linear infinite',
            maskImage: 'radial-gradient(circle, transparent 20%, black 45%, black 55%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 20%, black 45%, black 55%, transparent 80%)',
          }}
        />
      </div>

      {/* 浮动Emoji */}
      {EMOJIS.slice(0, 12).map((emoji, index) => (
        <FloatingEmoji
          key={index}
          emoji={emoji}
          delay={index * 0.4}
          left={`${5 + (index % 4) * 25}%`}
          top={`${5 + Math.floor(index / 4) * 30}%`}
        />
      ))}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </div>

      {/* 中心辐射光束 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                width: '2px',
                height: '200px',
                background: `linear-gradient(to top, transparent, ${COLORS[i % COLORS.length]}80, transparent)`,
                transform: `translateX(-50%) translateY(-100%) rotate(${i * 30}deg)`,
                animation: `beamPulse ${2 + (i % 3) * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="text-center z-10 relative" ref={titleRef}>
        {/* 标签 - 顶部 */}
        <div className={`animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-neon-blue animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #00d4ff)' }} />
            <span 
              className="text-sm uppercase tracking-[0.4em] font-display"
              style={{
                background: 'linear-gradient(90deg, #00d4ff, #9d4edd, #ff6b9d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Happy Birthday
            </span>
            <Sparkles className="w-6 h-6 text-neon-blue animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #00d4ff)' }} />
          </div>
        </div>

        {/* 主标题 - 生日快乐 */}
        <div className={`relative animate-scale-in mt-4 transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          {/* 多层光晕 */}
          <div className="absolute -inset-12 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="absolute -inset-6 bg-gradient-to-r from-neon-purple via-pink-500 to-yellow-400 rounded-full blur-2xl opacity-25 animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="absolute -inset-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-neon-purple rounded-full blur-xl opacity-20 animate-pulse" style={{ animationDelay: '0.6s' }} />
          
          <div className={`relative neon-box rounded-full p-6 md:p-10 music-reactive ${isBeating ? 'beat' : ''}`} 
               style={{
                 background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.9), rgba(157, 78, 221, 0.2), rgba(255, 107, 157, 0.15))',
                 border: '2px solid transparent',
                 backgroundClip: 'padding-box',
                 boxShadow: '0 0 40px rgba(0, 212, 255, 0.4), 0 0 80px rgba(157, 78, 221, 0.25), inset 0 0 30px rgba(0, 212, 255, 0.1)',
               }}>
            {/* 渐变边框装饰 */}
            <div 
              className="absolute inset-0 rounded-full -z-10 opacity-70"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #9d4edd, #ff6b9d, #facc15)',
                padding: '2px',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMaskComposite: 'xor',
              }}
            />
            
            <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
              <Zap className="w-8 h-8 md:w-14 md:h-14 text-neon-blue" style={{ 
                animation: 'zapBounce 1.5s ease-in-out infinite',
                filter: 'drop-shadow(0 0 15px #00d4ff)'
              }} />
              <span 
                className="text-5xl md:text-8xl font-black font-display"
                style={{
                  background: 'linear-gradient(90deg, #00d4ff, #9d4edd, #ff6b9d, #facc15, #22d3ee, #00d4ff)',
                  backgroundSize: '400% 100%',
                  animation: 'gradientShift 4s linear infinite',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 20px rgba(157, 78, 221, 0.6)) drop-shadow(0 0 40px rgba(0, 212, 255, 0.4))',
                  letterSpacing: '0.1em',
                }}
              >
                生日快乐
              </span>
              <Rainbow className="w-8 h-8 md:w-14 md:h-14 text-neon-purple" style={{ 
                animation: 'rainbowSpin 3s linear infinite',
                filter: 'drop-shadow(0 0 15px #9d4edd)'
              }} />
            </div>
            
            {/* 底部装饰线 */}
            <div className="mt-4 flex justify-center items-center gap-2">
              <div className="h-0.5 w-16 md:w-24 bg-gradient-to-r from-transparent via-neon-blue to-transparent" />
              <Cake className="w-4 h-4 md:w-6 md:h-6 text-pink-400" style={{ filter: 'drop-shadow(0 0 8px #ff6b9d)' }} />
              <Flame className="w-4 h-4 md:w-6 md:h-6 text-orange-400 animate-pulse" style={{ filter: 'drop-shadow(0 0 8px #f97316)' }} />
              <Gift className="w-4 h-4 md:w-6 md:h-6 text-yellow-400" style={{ filter: 'drop-shadow(0 0 8px #facc15)' }} />
              <div className="h-0.5 w-16 md:w-24 bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
            </div>
          </div>
        </div>

        {/* 庆祝词汇 - 带入场动画 */}
        <div className={`mt-8 animate-slide-up transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8">
            {activeWords.map((word, index) => (
              <span
                key={`${word}-${index}-${Date.now()}`}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-110 cursor-default"
                style={{
                  background: `linear-gradient(135deg, ${['#00d4ff22', '#9d4edd22', '#ff6b9d22', '#facc1522'][index % 4]}, ${['#00d4ff44', '#9d4edd44', '#ff6b9d44', '#facc1544'][index % 4]})`,
                  color: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15'][index % 4],
                  border: `1px solid ${['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15'][index % 4]}`,
                  boxShadow: `0 0 20px ${['#00d4ff40', '#9d4edd40', '#ff6b9d40', '#facc1540'][index % 4]}`,
                  animation: 'wordPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* 祝福卡片 - 交错入场 */}
        <div className={`mt-4 animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
            {WISH_MESSAGES.slice(0, 9).map((message, index) => (
              <div
                key={index}
                className="glass-effect neon-border rounded-lg p-4 text-center hover-lift group transition-all duration-300 hover:scale-105 cursor-default relative overflow-hidden"
                style={{
                  animation: 'wishSlideUp 0.6s ease-out forwards',
                  animationDelay: `${0.7 + index * 0.08}s`,
                  opacity: 0,
                  background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.6), rgba(255, 255, 255, 0.03))',
                }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at center, ${message.color}20, transparent 70%)`,
                  }}
                />
                <p
                  className="text-sm md:text-base font-medium relative z-10"
                  style={{ 
                    color: message.color,
                    textShadow: `0 0 10px ${message.color}60`,
                  }}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 底部装饰 - 音符脉冲 */}
        <div className={`mt-10 animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '1.2s' }}>
          <div className="flex justify-center items-center gap-3">
            <Music className="w-4 h-4 text-neon-blue" style={{ filter: 'drop-shadow(0 0 8px #00d4ff)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 md:w-4 md:h-4 rounded-full"
                style={{
                  backgroundColor: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'][i],
                  animation: 'pulseGlow 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                  boxShadow: `0 0 20px ${['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'][i]}`,
                }}
              />
            ))}
            <PartyPopper className="w-4 h-4 text-pink-400" style={{ filter: 'drop-shadow(0 0 8px #ff6b9d)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>

        {/* 滚动祝福语 - 彩色渐变 */}
        <div className={`mt-8 animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '1.5s' }}>
          <div className="overflow-hidden h-8 relative">
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0a0e17] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0a0e17] to-transparent z-10 pointer-events-none" />
            <div 
              className="flex items-center gap-10 animate-scroll-text"
              style={{ whiteSpace: 'nowrap' }}
            >
              {[...Array(3)].map((_, groupIndex) => (
                <div key={groupIndex} className="flex items-center gap-10 flex-shrink-0">
                  {['愿你被这世界温柔以待', '愿所有美好如期而至', '愿你成为自己的太阳', '愿你眼中有光心中有爱', '愿你历尽千帆归来仍是少年'].map((text, i) => (
                    <span
                      key={`${groupIndex}-${i}`}
                      className="text-base md:text-xl font-medium flex-shrink-0"
                      style={{
                        color: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][(groupIndex * 5 + i) % 5],
                        textShadow: `0 0 20px ${['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][(groupIndex * 5 + i) % 5]}80`,
                      }}
                    >
                      {text}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 社交装饰图标行 */}
        <div className={`mt-6 animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '1.8s' }}>
          <div className="flex justify-center items-center gap-4 opacity-60">
            <Heart className="w-4 h-4 text-pink-400" style={{ filter: 'drop-shadow(0 0 6px #ff6b9d)' }} />
            <Gift className="w-4 h-4 text-yellow-400" style={{ filter: 'drop-shadow(0 0 6px #facc15)' }} />
            <Gift className="w-4 h-4 text-neon-purple" style={{ filter: 'drop-shadow(0 0 6px #9d4edd)' }} />
            <Star className="w-4 h-4 text-neon-blue" style={{ filter: 'drop-shadow(0 0 6px #00d4ff)' }} />
            <Heart className="w-4 h-4 text-pink-400" style={{ filter: 'drop-shadow(0 0 6px #ff6b9d)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const COLORS = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'];

export default HeroSection;
