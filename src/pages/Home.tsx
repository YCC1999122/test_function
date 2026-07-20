import ParticleBackground from '../components/ParticleBackground';
import HeroSection from '../components/HeroSection';
import Countdown from '../components/Countdown';
import InteractiveCard from '../components/InteractiveCard';
import WishMessage from '../components/WishMessage';
import MusicPlayer from '../components/MusicPlayer';
import ShareButton from '../components/ShareButton';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <ShareButton />
      <MusicPlayer />

      <div className="relative z-10">
        <HeroSection />
        
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-2 font-display">
                距离那一天还有
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
            2026 Special Moment
          </p>
        </footer>
      </div>
    </div>
  );
}
