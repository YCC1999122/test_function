import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import { gameAudio } from './GameAudio';

const BGM_SRC = './bgm.mp3';

const MusicPlayer = ({ autoPlay = true }: { autoPlay?: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [activated, setActivated] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasAttemptedPlay = useRef(false);

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
        setActivated(true);
        setShowHint(false);
      }).catch(() => {
        setIsPlaying(false);
        setShowHint(true);
      });
    }
  }, [initAudioContext]);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // 监听首次用户交互以激活播放
  useEffect(() => {
    if (!autoPlay || activated) return;

    const handleFirstInteraction = async () => {
      if (hasAttemptedPlay.current) return;
      hasAttemptedPlay.current = true;
      
      await initAudioContext();
      if (audioRef.current) {
        audioRef.current.volume = 0.5;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setActivated(true);
          setShowHint(false);
        }).catch(() => {
          setShowHint(true);
        });
      }
    };

    const events = ['click', 'touchstart', 'keydown', 'pointerdown'];
    events.forEach(evt => {
      document.addEventListener(evt, handleFirstInteraction, { once: true, passive: true });
    });

    // 显示提示
    const timer = setTimeout(() => {
      if (!activated) setShowHint(true);
    }, 1500);

    return () => {
      events.forEach(evt => {
        document.removeEventListener(evt, handleFirstInteraction);
      });
      clearTimeout(timer);
    };
  }, [autoPlay, activated, initAudioContext]);

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
        preload="auto"
      />

      {/* 轻柔的提示气泡 */}
      {showHint && !activated && (
        <div className="fixed bottom-24 right-6 z-50 animate-bounce">
          <div className="glass-effect neon-border rounded-full px-4 py-2 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
               onClick={() => playMusic()}>
            <Music className="w-4 h-4 text-neon-blue" />
            <span className="text-xs text-light-gray">点击播放音乐 🎵</span>
          </div>
        </div>
      )}

      {/* 播放控制 */}
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
      </div>
    </>
  );
};

export default MusicPlayer;
