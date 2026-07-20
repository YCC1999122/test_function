import { useEffect, useState } from 'react';
import { Sparkles, Star, Heart, Zap, Rainbow } from 'lucide-react';
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

const HeroSection = () => {
  const [activeWords, setActiveWords] = useState<string[]>([]);
  const [showContent, setShowContent] = useState(false);
  const beat = useMusicBeat();
  const isBeating = beat > 0 && (Date.now() - beat) < 300;

  useEffect(() => {
    setShowContent(true);

    const interval = setInterval(() => {
      const randomWords = CELEBRATION_WORDS.sort(() => Math.random() - 0.5).slice(0, 4);
      setActiveWords(randomWords);
    }, 3000);

    setActiveWords(CELEBRATION_WORDS.slice(0, 4));

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12 overflow-hidden">
      {EMOJIS.slice(0, 8).map((emoji, index) => (
        <FloatingEmoji
          key={index}
          emoji={emoji}
          delay={index * 0.5}
          left={`${10 + (index % 4) * 25}%`}
          top={`${10 + Math.floor(index / 4) * 40}%`}
        />
      ))}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              background: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][i % 5],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${4 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.5 + 0.3,
            }}
          />
        ))}
      </div>

      <div className="text-center z-10">
        <div className={`animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-neon-blue" />
            <span className="text-neon-blue text-sm uppercase tracking-[0.3em] font-display">
              Happy Birthday
            </span>
            <Sparkles className="w-6 h-6 text-neon-blue" />
          </div>
        </div>

        <div className={`relative animate-scale-in mt-4 transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute -inset-4 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 rounded-full blur-xl opacity-20 animate-pulse" />
          <div className={`relative neon-box rounded-full p-8 md:p-12 music-reactive ${isBeating ? 'beat' : ''}`}>
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-8 h-8 md:w-12 md:h-12 text-neon-blue animate-bounce" />
              <span className="text-5xl md:text-7xl font-bold gradient-text font-display">
                生日
              </span>
              <Rainbow className="w-8 h-8 md:w-12 md:h-12 text-neon-purple animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>

        <div className={`mt-8 animate-slide-up transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8">
            {activeWords.map((word, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: `rgba(${[0, 212, 255, 934, 78, 221, 255, 107, 157][index % 3 * 3]}, ${[212, 255, 78, 221, 107, 157, 206, 15, 255][index % 3 * 3 + 1]}, ${[255, 78, 221, 157, 255, 206, 15, 255, 78][index % 3 * 3 + 2]}, 0.15)`,
                  color: [`#00d4ff`, `#9d4edd`, `#ff6b9d`][index % 3],
                  border: `1px solid ${[`#00d4ff`, `#9d4edd`, `#ff6b9d`][index % 3]}`,
                  animation: 'slideUp 0.5s ease-out forwards',
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        <div className={`mt-8 animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
            {WISH_MESSAGES.slice(0, 6).map((message, index) => (
              <div
                key={index}
                className="glass-effect rounded-lg p-3 text-center hover-lift group"
                style={{
                  animation: 'slideUp 0.6s ease-out forwards',
                  animationDelay: `${0.7 + index * 0.1}s`,
                  opacity: 0,
                }}
              >
                <p
                  className="text-sm md:text-base font-medium transition-all duration-300 group-hover:scale-105"
                  style={{ color: message.color }}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-12 animate-fade-in transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '1.2s' }}>
          <div className="flex justify-center gap-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'][i],
                  animation: 'pulseGlow 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
