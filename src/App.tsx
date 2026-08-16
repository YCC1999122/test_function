import { useState } from 'react';
import HockeyGame from './components/HockeyGame';
import PlatformGame from './components/PlatformGame';
import MazeGame from './components/MazeGame';
import FPSGame from './components/FPSGame';
import BrickBreakerGame from './components/BrickBreakerGame';
import TowerDefenseGame from './components/TowerDefenseGame';
import ParticleBackground from './components/ParticleBackground';
import HeroSection from './components/HeroSection';
import Countdown from './components/Countdown';
import InteractiveCard from './components/InteractiveCard';
import WishMessage from './components/WishMessage';
import MusicPlayer from './components/MusicPlayer';
import ShareButton from './components/ShareButton';

type View = 'game6' | 'game1' | 'game2' | 'game3' | 'game4' | 'game5' | 'birthday';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('game6');

  // game6: 激光塔防 → game1: 弹珠打砖块
  const handleEnterLevel1 = () => {
    setCurrentView('game1');
  };

  // game1: 弹珠打砖块 → game2: 迷宫探险
  const handleEnterLevel2 = () => {
    setCurrentView('game2');
  };

  // game2: 迷宫探险 → game3: FPS射击
  const handleEnterLevel3 = () => {
    setCurrentView('game3');
  };

  // game3: FPS射击 → game4: 平台跳跃
  const handleEnterLevel4 = () => {
    setCurrentView('game4');
  };

  // game4: 平台跳跃 → game5: 冰球对战
  const handleEnterLevel5 = () => {
    setCurrentView('game5');
  };

  // game5: 冰球对战 → 生日祝福
  const handleEnterBirthday = () => {
    setCurrentView('birthday');
  };

  const handleBackToGame = () => {
    setCurrentView('game6');
  };

  if (currentView === 'game6') {
    return <TowerDefenseGame onCompleteGame={handleEnterLevel1} />;
  }

  if (currentView === 'game1') {
    return <BrickBreakerGame onCompleteGame={handleEnterLevel2} />;
  }

  if (currentView === 'game2') {
    return <MazeGame onCompleteGame={handleEnterLevel3} />;
  }

  if (currentView === 'game3') {
    return <FPSGame onCompleteGame={handleEnterLevel4} />;
  }

  if (currentView === 'game4') {
    return <PlatformGame onCompleteLevel1={handleEnterLevel5} />;
  }

  if (currentView === 'game5') {
    return <HockeyGame onCompleteGame={handleEnterBirthday} />;
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
