import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { gameAudio } from './GameAudio';

// 使用相对路径，兼容 GitHub Pages 子路径部署
const BGM_SRC = './bgm.mp3';

const MusicPlayer = ({ autoPlay = false }: { autoPlay?: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showActivateOverlay, setShowActivateOverlay] = useState(autoPlay);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      gameAudio.setContext(audioContextRef.current);
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const playMusic = useCallback(async () => {
    await initAudioContext();
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('音乐播放失败:', err);
        setIsPlaying(false);
      });
    }
  }, [initAudioContext]);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const activateAudioAndPlay = useCallback(async () => {
    await initAudioContext();
    setShowActivateOverlay(false);
    await playMusic();
  }, [initAudioContext, playMusic]);

  useEffect(() => {
    // 不再尝试自动激活（浏览器会阻止），直接显示覆盖层等待用户点击
  }, []);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopMusic]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopMusic();
      setIsPlaying(false);
    } else {
      playMusic();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={BGM_SRC}
        loop
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={() => setLoadError(true)}
        onCanPlay={() => setLoadError(false)}
        preload="auto"
      />

      {showActivateOverlay && (
        <div
          onClick={activateAudioAndPlay}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          <div className="text-center animate-pulse">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center shadow-lg shadow-neon-blue/50">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 font-display">点击开启</h3>
            <p className="text-silver-gray">点击任意位置激活音频体验</p>
            {loadError && (
              <p className="text-red-400 text-xs mt-2">音频加载中，请稍候再试</p>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50">
        <div className="glass-effect neon-border rounded-full p-2 flex items-center gap-2 hover-lift">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center text-white hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>

          <div className="hidden md:block w-32">
            <div className="h-1 bg-cold-blue rounded-full">
              <div
                className="h-full bg-neon-blue rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-full flex items-center justify-center text-silver-gray hover:text-neon-blue transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {!isPlaying && !showActivateOverlay && (
          <div className="md:hidden mt-2 text-xs text-silver-gray text-center">
            点击播放背景音乐
          </div>
        )}
      </div>
    </>
  );
};

export default MusicPlayer;