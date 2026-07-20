import { useState } from 'react';
import PlatformGame from './components/PlatformGame';
import ParticleBackground from './components/ParticleBackground';
import HeroSection from './components/HeroSection';
import Countdown from './components/Countdown';
import InteractiveCard from './components/InteractiveCard';
import WishMessage from './components/WishMessage';
import MusicPlayer from './components/MusicPlayer';
import ShareButton from './components/ShareButton';

type View = 'game' | 'birthday';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('game');

  const handleEnterBirthday = () => {
    setCurrentView('birthday');
  };

  const handleBackToGame = () => {
    setCurrentView('game');
  };

  if (currentView === 'game') {
    return <PlatformGame onCompleteGame={handleEnterBirthday} />;
  }

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <div className="fixed inset-0 pointer-events-none z-0 brightness-overlay" />
      <div className="light-ray" style={{ animationDelay: '0s' }} />
      <div className="light-ray" style={{ animationDelay: '3s', width: '30%' }} />
      <ShareButton />
      <MusicPlayer autoPlay />

      <button
        onClick={handleBackToGame}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 glass-effect neon-border rounded-full text-silver-gray hover:text-neon-blue transition-colors"
      >
        ← 返回
      </button>

      <div className="relative z-10">
        <HeroSection />

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

        <InteractiveCard />

        <WishMessage />

        <footer className="py-8 px-4 text-center">
          <p className="text-silver-gray text-sm">
            Made with ❤️ for a special person
          </p>
          <p className="text-silver-gray/50 text-xs mt-2">
            2026 Birthday Celebration
          </p>
        </footer>
      </div>
    </div>
  );
}
