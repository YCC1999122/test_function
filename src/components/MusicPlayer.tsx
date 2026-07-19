import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const MusicPlayer = ({ autoPlay = false }: { autoPlay?: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentNoteRef = useRef(0);

  const notes = [
    { freq: 523.25, duration: 0.5 },
    { freq: 523.25, duration: 0.5 },
    { freq: 659.25, duration: 1 },
    { freq: 523.25, duration: 1 },
    { freq: 783.99, duration: 1 },
    { freq: 698.46, duration: 2 },
    { freq: 523.25, duration: 0.5 },
    { freq: 523.25, duration: 0.5 },
    { freq: 659.25, duration: 1 },
    { freq: 523.25, duration: 1 },
    { freq: 880.00, duration: 1 },
    { freq: 783.99, duration: 2 },
    { freq: 523.25, duration: 0.5 },
    { freq: 523.25, duration: 0.5 },
    { freq: 1046.50, duration: 1 },
    { freq: 880.00, duration: 1 },
    { freq: 783.99, duration: 1 },
    { freq: 698.46, duration: 1 },
    { freq: 659.25, duration: 1 },
    { freq: 740.00, duration: 0.5 },
    { freq: 740.00, duration: 0.5 },
    { freq: 698.46, duration: 1 },
    { freq: 523.25, duration: 1 },
    { freq: 783.99, duration: 1 },
    { freq: 698.46, duration: 1 },
    { freq: 659.25, duration: 2 },
  ];

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

  const playMusic = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

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
  };

  const stopMusic = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }
  };

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        setIsPlaying(true);
        playMusic();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay]);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

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

      {!isPlaying && (
        <div className="md:hidden mt-2 text-xs text-silver-gray text-center">
          点击播放背景音乐
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;
