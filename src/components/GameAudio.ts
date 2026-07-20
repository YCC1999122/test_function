import { useRef, useCallback, useEffect } from 'react';

class GameAudio {
  private audioContext: AudioContext | null = null;
  private bgmInterval: number | null = null;
  private isBgmPlaying = false;

  setContext(ctx: AudioContext) {
    this.audioContext = ctx;
  }

  getContext(): AudioContext {
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

  playFirework(baseFreq?: number) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const duration = 0.5;
    
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + duration);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);
    
    const frequencies = baseFreq 
      ? [baseFreq * 2, baseFreq * 3, baseFreq * 4, baseFreq * 1.5, baseFreq * 0.5]
      : [400, 600, 800, 1000, 1200];
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const detune = (Math.random() - 0.5) * 50;
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + detune, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + duration * (0.8 + Math.random() * 0.4));
      
      const startTime = now + Math.random() * 0.05;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * (0.6 + Math.random() * 0.4));
      
      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
    
    const sparkleCount = 8;
    for (let i = 0; i < sparkleCount; i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const sparkleFreq = baseFreq 
          ? baseFreq * (2 + Math.random() * 3)
          : 800 + Math.random() * 800;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(sparkleFreq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }, Math.random() * 300);
    }
  }

  playPop() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 + Math.random() * 800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
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
  const firework = useCallback((baseFreq?: number) => audioRef.current.playFirework(baseFreq), []);
  const pop = useCallback(() => audioRef.current.playPop(), []);

  return { jump, star, hit, levelComplete, victory, select, land, startBGM, stopBGM, firework, pop };
};
