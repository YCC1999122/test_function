import { useRef, useCallback, useEffect } from 'react';

class GameAudio {
  private audioContext: AudioContext | null = null;
  private bgmInterval: number | null = null;
  private isBgmPlaying = false;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  playJump() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playStar() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  playHit() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  playLevelComplete() {
    const ctx = this.getContext();
    const notes = [523, 659, 784, 1046];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
      
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  }

  playVictory() {
    const ctx = this.getContext();
    const notes = [523, 659, 784, 1046, 784, 1046, 1318];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
      
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  playSelect() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  playLand() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  startBGM() {
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    
    const ctx = this.getContext();
    const bgmNotes = [
      { freq: 261.63, duration: 0.5 },
      { freq: 293.66, duration: 0.5 },
      { freq: 329.63, duration: 0.5 },
      { freq: 349.23, duration: 0.5 },
      { freq: 392.00, duration: 0.5 },
      { freq: 349.23, duration: 0.5 },
      { freq: 329.63, duration: 0.5 },
      { freq: 293.66, duration: 0.5 },
      { freq: 261.63, duration: 1 },
    ];
    
    let noteIndex = 0;
    
    const playBgmNote = () => {
      if (!this.isBgmPlaying) return;
      
      const note = bgmNotes[noteIndex];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.value = note.freq;
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.duration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + note.duration);
      
      noteIndex = (noteIndex + 1) % bgmNotes.length;
      this.bgmInterval = window.setTimeout(playBgmNote, note.duration * 1000);
    };
    
    playBgmNote();
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearTimeout(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const gameAudio = new GameAudio();

export const useGameAudio = () => {
  const audioRef = useRef(new GameAudio());
  
  useEffect(() => {
    return () => {
      audioRef.current.stopBGM();
    };
  }, []);

  const jump = useCallback(() => audioRef.current.playJump(), []);
  const star = useCallback(() => audioRef.current.playStar(), []);
  const hit = useCallback(() => audioRef.current.playHit(), []);
  const levelComplete = useCallback(() => audioRef.current.playLevelComplete(), []);
  const victory = useCallback(() => audioRef.current.playVictory(), []);
  const select = useCallback(() => audioRef.current.playSelect(), []);
  const land = useCallback(() => audioRef.current.playLand(), []);
  const startBGM = useCallback(() => audioRef.current.startBGM(), []);
  const stopBGM = useCallback(() => audioRef.current.stopBGM(), []);

  return { jump, star, hit, levelComplete, victory, select, land, startBGM, stopBGM };
};
