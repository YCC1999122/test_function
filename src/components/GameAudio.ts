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

    // Rich melody with varied note lengths
    const melody = [
      { f: 262, d: 0.22 }, { f: 330, d: 0.22 }, { f: 392, d: 0.22 }, { f: 330, d: 0.15 },
      { f: 392, d: 0.22 }, { f: 523, d: 0.15 }, { f: 392, d: 0.15 }, { f: 330, d: 0.22 },
      { f: 294, d: 0.22 }, { f: 349, d: 0.22 }, { f: 440, d: 0.22 }, { f: 349, d: 0.15 },
      { f: 440, d: 0.22 }, { f: 523, d: 0.15 }, { f: 440, d: 0.15 }, { f: 349, d: 0.22 },
      { f: 330, d: 0.22 }, { f: 392, d: 0.22 }, { f: 494, d: 0.22 }, { f: 392, d: 0.15 },
      { f: 494, d: 0.22 }, { f: 587, d: 0.15 }, { f: 494, d: 0.15 }, { f: 392, d: 0.15 },
      { f: 523, d: 0.3 }, { f: 494, d: 0.15 }, { f: 440, d: 0.15 }, { f: 392, d: 0.3 },
      { f: 349, d: 0.3 }, { f: 330, d: 0.15 }, { f: 294, d: 0.15 }, { f: 262, d: 0.5 },
    ];

    // Bass line
    const bass = [
      { f: 131, d: 0.45 }, { f: 131, d: 0.45 },
      { f: 147, d: 0.45 }, { f: 147, d: 0.45 },
      { f: 165, d: 0.45 }, { f: 165, d: 0.45 },
      { f: 147, d: 0.45 }, { f: 147, d: 0.45 },
    ];

    let noteIdx = 0;
    let bassIdx = 0;

    const playRichBgm = () => {
      if (!this.isBgmPlaying) return;

      const now = ctx.currentTime;

      // === Melody (square wave, brighter) ===
      const note = melody[noteIdx];
      const mOsc = ctx.createOscillator();
      const mGain = ctx.createGain();
      mOsc.connect(mGain);
      mGain.connect(ctx.destination);
      mOsc.type = 'square';
      mOsc.frequency.value = note.f;
      mGain.gain.setValueAtTime(0.04, now);
      mGain.gain.exponentialRampToValueAtTime(0.001, now + note.d * 0.95);
      mOsc.start(now);
      mOsc.stop(now + note.d + 0.02);

      // === Harmony (triangle, softer) ===
      const hFreq = note.f * (noteIdx % 4 === 0 ? 1.5 : noteIdx % 4 === 2 ? 1.333 : 1.25);
      const hOsc = ctx.createOscillator();
      const hGain = ctx.createGain();
      hOsc.connect(hGain);
      hGain.connect(ctx.destination);
      hOsc.type = 'triangle';
      hOsc.frequency.value = hFreq;
      hGain.gain.setValueAtTime(0.025, now);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + note.d * 0.8);
      hOsc.start(now);
      hOsc.stop(now + note.d + 0.02);

      // === Pad (sine, very soft background) ===
      const pOsc = ctx.createOscillator();
      const pGain = ctx.createGain();
      pOsc.connect(pGain);
      pGain.connect(ctx.destination);
      pOsc.type = 'sine';
      pOsc.frequency.value = note.f * 0.5;
      pGain.gain.setValueAtTime(0.015, now);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + note.d * 0.7);
      pOsc.start(now);
      pOsc.stop(now + note.d + 0.02);

      noteIdx = (noteIdx + 1) % melody.length;

      // === Bass (every 2 melody notes) ===
      if (noteIdx % 2 === 0) {
        const bNote = bass[bassIdx];
        bassIdx = (bassIdx + 1) % bass.length;
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.connect(bGain);
        bGain.connect(ctx.destination);
        bOsc.type = 'sawtooth';
        bOsc.frequency.value = bNote.f;
        bGain.gain.setValueAtTime(0.06, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + bNote.d);
        bOsc.start(now);
        bOsc.stop(now + bNote.d + 0.02);
      }

      // === Drum hit every 4 notes ===
      if (noteIdx % 4 === 0) {
        const dOsc = ctx.createOscillator();
        const dGain = ctx.createGain();
        dOsc.connect(dGain);
        dGain.connect(ctx.destination);
        dOsc.type = 'sine';
        dOsc.frequency.setValueAtTime(150, now);
        dOsc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        dGain.gain.setValueAtTime(0.08, now);
        dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        dOsc.start(now);
        dOsc.stop(now + 0.15);
      }

      // Snare-like hit every 8 notes
      if (noteIdx % 8 === 4) {
        const sOsc = ctx.createOscillator();
        const sGain = ctx.createGain();
        sOsc.connect(sGain);
        sGain.connect(ctx.destination);
        sOsc.type = 'triangle';
        sOsc.frequency.setValueAtTime(200, now);
        sOsc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
        sGain.gain.setValueAtTime(0.05, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        sOsc.start(now);
        sOsc.stop(now + 0.1);
      }

      this.bgmInterval = window.setTimeout(playRichBgm, note.d * 1000);
    };

    playRichBgm();
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
    
    const rootFreq = baseFreq || 523.25;
    const harmony = [1, 1.25, 1.5, 2, 2.5, 3];
    
    harmony.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const freq = rootFreq * ratio;
      const detune = (Math.random() - 0.5) * 20;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + detune, now);
      
      const delay = i * 0.03;
      const startTime = now + delay;
      const peakGain = 0.06 / (1 + i * 0.3);
      const decay = 0.4 + i * 0.1;
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
      
      osc.start(startTime);
      osc.stop(startTime + decay + 0.05);
    });
    
    const sparkleCount = 5;
    for (let i = 0; i < sparkleCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const sparkleFreq = rootFreq * (4 + Math.random() * 4);
      const startTime = now + 0.05 + i * 0.06 + Math.random() * 0.1;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(sparkleFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(sparkleFreq * 1.5, startTime + 0.15);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.03, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      
      osc.start(startTime);
      osc.stop(startTime + 0.2);
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
