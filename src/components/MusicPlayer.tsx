import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { gameAudio } from './GameAudio';

const MusicPlayer = ({ autoPlay = false }: { autoPlay?: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showActivateOverlay, setShowActivateOverlay] = useState(autoPlay);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentNoteRef = useRef(0);

  const notes = [
    { freq: 523.25, duration: 0.5 },
    { freq: 523.25, duration: 0.5 },
    { freq: 587.33, duration: 1 },
    { freq: 523.25, duration: 1 },
    { freq: 698.46, duration: 1 },
    { freq: 659.25, duration: 2 },
    { freq: 523.25, duration: 0.5 },
    { freq: 523.25, duration: 0.5 },
    { freq: 587.33, duration: 1 },
    { freq: 523.25, duration: 1 },
    { freq: 783.99, duration: 1 },
    { freq: 698.46, duration: 2 },
    { freq: 523.25, duration: 0.5 },
    { freq: 523.25, duration: 0.5 },
    { freq: 1046.50, duration: 1 },
    { freq: 880.00, duration: 1 },
    { freq: 698.46, duration: 1 },
    { freq: 659.25, duration: 1 },
    { freq: 587.33, duration: 2 },
    { freq: 493.88, duration: 0.5 },
    { freq: 493.88, duration: 0.5 },
    { freq: 880.00, duration: 1 },
    { freq: 698.46, duration: 1 },
    { freq: 783.99, duration: 1 },
    { freq: 698.46, duration: 2 },
  ];

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      gameAudio.setContext(audioContextRef.current);
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const playNote = (freq: number, duration: number) => {
    if (!audioContextRef.current || isMuted) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = freq;

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    window.dispatchEvent(new CustomEvent('music-beat', { detail: { freq, duration } }));
  };

  const playMusic = useCallback(async () => {
    await initAudioContext();

    let noteIndex = currentNoteRef.current;
    const totalNotes = notes.length;

    const playNextNote = () => {
      if (!isPlaying) return;

      const note = notes[noteIndex];
      playNote(note.freq, note.duration);

      currentNoteRef.current = noteIndex;
      setProgress(((noteIndex + 1) / totalNotes) * 100);

      noteIndex = (noteIndex + 1) % totalNotes;

      intervalRef.current = window.setTimeout(playNextNote, note.duration * 1000);
    };

    playNextNote();
  }, [initAudioContext, isPlaying]);

  const stopMusic = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }
  }, []);

  const activateAudioAndPlay = useCallback(async () => {
    await initAudioContext();
    setShowActivateOverlay(false);
    setIsPlaying(true);
    playMusic();
  }, [initAudioContext, playMusic]);

  useEffect(() => {
    if (autoPlay) {
      const checkAndActivate = async () => {
        try {
          const ctx = new AudioContext();
          await ctx.resume();
          if (ctx.state === 'running') {
            audioContextRef.current = ctx;
            setIsPlaying(true);
            playMusic();
          } else {
            ctx.close();
          }
        } catch {
        }
      };
      checkAndActivate();
    }
  }, [autoPlay, playMusic]);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopMusic]);

  const togglePlay = () => {
    if (isPlaying) {
      stopMusic();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playMusic();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <>
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
