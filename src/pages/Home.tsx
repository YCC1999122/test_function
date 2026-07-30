import ParticleBackground from '../components/ParticleBackground';
import HeroSection from '../components/HeroSection';
import Countdown from '../components/Countdown';
import InteractiveCard from '../components/InteractiveCard';
import WishMessage from '../components/WishMessage';
import MusicPlayer from '../components/MusicPlayer';
import ShareButton from '../components/ShareButton';
import MemoryTimeline from '../components/MemoryTimeline';
import GiftShowcase from '../components/GiftShowcase';
import StarWish from '../components/StarWish';
import ConstellationMessage from '../components/ConstellationMessage';
import { ArrowUp, PartyPopper, Sparkles, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <ShareButton />
      <MusicPlayer autoPlay />

      <div className="relative z-10">
        {/* 主标题区 */}
        <HeroSection />
        
        {/* 倒计时区 */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-2 font-display">
                距离生日还有
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-neon-blue to-neon-purple mx-auto rounded-full" />
            </div>
            <Countdown />
          </div>
        </section>

        {/* 互动卡片 */}
        <InteractiveCard />

        {/* 时光轴 */}
        <MemoryTimeline />

        {/* 礼物精选 */}
        <GiftShowcase />

        {/* 星空许愿 */}
        <StarWish />

        {/* 星座密语 */}
        <ConstellationMessage />

        {/* 祝福寄语 */}
        <WishMessage />

        {/* 循环祝福墙 */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <PartyPopper className="w-8 h-8 text-pink-400" style={{ filter: 'drop-shadow(0 0 15px #ff6b9d)' }} />
                <h2 className="text-3xl md:text-4xl font-bold text-white font-display">
                  祝福墙
                </h2>
                <PartyPopper className="w-8 h-8 text-yellow-400" style={{ filter: 'drop-shadow(0 0 15px #facc15)' }} />
              </div>
              <p className="text-silver-gray">无尽的祝福，只为你而写</p>
              <div className="w-24 h-1 bg-gradient-to-r from-pink-500 via-yellow-400 to-neon-blue mx-auto rounded-full mt-4" />
            </div>

            {/* 横向滚动祝福条 */}
            <div className="relative overflow-hidden py-6 neon-box rounded-xl">
              <div className="flex gap-16 animate-scroll-text" style={{ whiteSpace: 'nowrap' }}>
                {[...Array(4)].map((_, groupIndex) => (
                  <div key={groupIndex} className="flex gap-16 flex-shrink-0">
                    {[
                      '🎂 生日快乐 🎂',
                      '✨ 愿你永远闪耀 ✨',
                      '💫 心想事成 💫',
                      '🌟 前程似锦 🌟',
                      '🎉 幸福美满 🎉',
                      '💖 被爱包围 💖',
                      '🎁 惊喜不断 🎁',
                      '🌈 永远年轻 🌈',
                      '⭐ 星光璀璨 ⭐',
                      '💐 美好常伴 💐',
                    ].map((text, i) => (
                      <span
                        key={`${groupIndex}-${i}`}
                        className="text-2xl md:text-3xl font-bold font-display"
                        style={{
                          color: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][i % 5],
                          textShadow: `0 0 20px ${['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][i % 5]}80`,
                        }}
                      >
                        {text}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 祝福卡片网格 */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(16)].map((_, index) => {
                const colors = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899', '#06b6d4'];
                const color = colors[index % colors.length];
                const messages = [
                  '愿你永远年轻',
                  '愿时光温柔以待',
                  '愿你笑容常伴',
                  '愿世界温柔待你',
                  '愿所有美好如约而至',
                  '愿梦想照进现实',
                  '愿你乘风破浪',
                  '愿你归来仍是少年',
                  '愿你一生温暖纯良',
                  '愿你所求皆如愿',
                  '愿你所行皆坦途',
                  '愿你星光璀璨',
                  '愿你被爱包围',
                  '愿你永远闪闪发光',
                  '愿你拥有无限可能',
                  '愿你人生精彩绝伦',
                ];
                return (
                  <div
                    key={index}
                    className="neon-box rounded-lg p-4 text-center hover-lift transition-all duration-300 group"
                    style={{
                      borderColor: `${color}40`,
                      animation: `slideUp 0.5s ease-out forwards`,
                      animationDelay: `${index * 0.05}s`,
                      opacity: 0,
                    }}
                  >
                    <Sparkles className="w-4 h-4 mx-auto mb-2 animate-pulse" style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
                    <p className="text-sm font-medium" style={{ color }}>{messages[index]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 结语 */}
        <footer className="py-16 px-4 text-center relative">
          <div className="max-w-4xl mx-auto">
            <div className="neon-box rounded-xl p-10 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full animate-float"
                    style={{
                      width: `${Math.random() * 4 + 2}px`,
                      height: `${Math.random() * 4 + 2}px`,
                      backgroundColor: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][i % 5],
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${3 + Math.random() * 3}s`,
                      opacity: 0.4,
                    }}
                  />
                ))}
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-center gap-3 mb-6">
                  <Star className="w-6 h-6 text-yellow-400 animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #facc15)' }} />
                  <Sparkles className="w-6 h-6 text-neon-blue animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #00d4ff)' }} />
                  <Star className="w-6 h-6 text-neon-purple animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #9d4edd)' }} />
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 font-display">
                  生日快乐
                </h3>
                <p className="text-silver-gray mb-6 leading-relaxed">
                  愿你的每一天都如星辰般璀璨，
                  <br />
                  愿你的每一个梦想都能照进现实，
                  <br />
                  愿你的人生旅途充满无限的可能与美好。
                </p>

                <div className="flex justify-center gap-2 mb-6">
                  {['🎂', '✨', '💫', '🌟', '🎉', '💖', '🎁', '🌈', '🎈', '🎊'].map((emoji, index) => (
                    <span
                      key={index}
                      className="text-2xl animate-bounce"
                      style={{ animationDelay: `${index * 0.15}s` }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>

                <button
                  onClick={scrollToTop}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple text-white font-medium hover:scale-105 transition-transform"
                >
                  <ArrowUp className="w-4 h-4" />
                  回到顶部
                </button>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-silver-gray text-sm">
                Made with ❤️ for a special person
              </p>
              <p className="text-silver-gray/50 text-xs mt-2">
                2026 Birthday Celebration · 愿你被这世界温柔以待
              </p>
            </div>
          </div>
        </footer>

        {/* 滚动回到顶部按钮 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg hover:scale-110 transition-transform flex items-center justify-center animate-fade-in"
            style={{ boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)' }}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
