import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Star, ArrowRight, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const CANVAS_W = 900;
const CANVAS_H = 560;
const PLAYER_W = 28;
const PLAYER_H = 54;
const GRAVITY = 0.72;
const MOVE_SPEED = 3.45;
const JUMP_VELOCITY = -13.4;
const ATTACK_RANGE = 58;

type Facing = 1 | -1;

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: Facing;
  attackCooldown: number;
  attackTimer: number;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  speed: number;
  minX: number;
  maxX: number;
}

interface Crystal {
  x: number;
  y: number;
  color: string;
  label: string;
  collected: boolean;
}

const BASE_PLATFORMS: Platform[] = [
  { x: 0, y: 520, w: 900, h: 40, color: '#22314a' },
  { x: 80, y: 445, w: 140, h: 18, color: '#4a90ff' },
  { x: 245, y: 390, w: 125, h: 18, color: '#7c4dff' },
  { x: 430, y: 330, w: 130, h: 18, color: '#f59e0b' },
  { x: 590, y: 270, w: 120, h: 18, color: '#22c55e' },
  { x: 730, y: 210, w: 120, h: 18, color: '#f43f5e' },
  { x: 610, y: 145, w: 135, h: 18, color: '#38bdf8' },
];

const CRYSTALS: Crystal[] = [
  { x: 120, y: 405, color: '#22d3ee', label: 'Jump', collected: false },
  { x: 310, y: 350, color: '#facc15', label: 'Maze', collected: false },
  { x: 655, y: 230, color: '#f97316', label: 'Shoot', collected: false },
  { x: 785, y: 170, color: '#a855f7', label: 'Final', collected: false },
];

const EvolutionGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [scale, setScale] = useState(1);
  const [crystalsLeft, setCrystalsLeft] = useState(4);

  const { hit, select, victory: playVictory, pop } = useGameAudio();

  const playerRef = useRef<Player>({
    x: 80,
    y: CANVAS_H - 40 - PLAYER_H,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    attackCooldown: 0,
    attackTimer: 0,
  });
  const platformsRef = useRef<Platform[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const crystalsRef = useRef<Crystal[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>(0);
  const isPlayingRef = useRef(false);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const handleTouchStart = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'shoot' | 'jump') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isPlayingRef.current || showVictory) return;

    if (direction === 'left') keysRef.current.add('a');
    if (direction === 'right') keysRef.current.add('d');
    if (direction === 'jump') keysRef.current.add('jump');
    if (direction === 'shoot') {
      keysRef.current.add('attack');
      keysRef.current.add('f');
    }
  }, [showVictory]);

  const handleTouchEnd = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'shoot' | 'jump') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (direction === 'left') keysRef.current.delete('a');
    if (direction === 'right') keysRef.current.delete('d');
    if (direction === 'jump') keysRef.current.delete('jump');
    if (direction === 'shoot') {
      keysRef.current.delete('attack');
      keysRef.current.delete('f');
    }
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min((window.innerWidth - 32) / CANVAS_W, (window.innerHeight - 140) / CANVAS_H, 1.15);
      setScale(s > 0.1 ? s : 0.1);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, []);

  const initLevel = useCallback(() => {
    platformsRef.current = BASE_PLATFORMS.map((platform) => ({ ...platform }));
    crystalsRef.current = CRYSTALS.map((crystal) => ({ ...crystal, collected: false }));
    playerRef.current = {
      x: 80,
      y: CANVAS_H - 40 - PLAYER_H,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
      vy: 0,
      onGround: true,
      facing: 1,
      attackCooldown: 0,
      attackTimer: 0,
    };
    keysRef.current.clear();

    enemiesRef.current = [
      { x: 230, y: 480, w: 26, h: 30, vx: 0.7, vy: 0, hp: 3, maxHp: 3, alive: true, hitFlash: 0, speed: 0.95, minX: 170, maxX: 310 },
      { x: 470, y: 310, w: 26, h: 30, vx: -0.7, vy: 0, hp: 3, maxHp: 3, alive: true, hitFlash: 0, speed: 0.85, minX: 400, maxX: 530 },
      { x: 690, y: 250, w: 26, h: 30, vx: 0.9, vy: 0, hp: 3, maxHp: 3, alive: true, hitFlash: 0, speed: 1.0, minX: 640, maxX: 760 },
      { x: 760, y: 170, w: 26, h: 30, vx: -0.9, vy: 0, hp: 4, maxHp: 4, alive: true, hitFlash: 0, speed: 1.1, minX: 720, maxX: 820 },
    ];

    setCrystalsLeft(4);
  }, []);

  const triggerAttack = useCallback(() => {
    if (!isPlayingRef.current || showVictory) return;

    const p = playerRef.current;
    if (p.attackCooldown > 0) return;

    p.attackCooldown = 24;
    p.attackTimer = 8;
    hit();

    const attackX = p.facing === 1 ? p.x + p.w + 4 : p.x - ATTACK_RANGE;
    const attackY = p.y + 10;

    for (const enemy of enemiesRef.current) {
      if (!enemy.alive) continue;
      const overlapX = enemy.x + enemy.w > attackX && enemy.x < attackX + ATTACK_RANGE;
      const overlapY = enemy.y < attackY + 36 && enemy.y + enemy.h > attackY;
      if (overlapX && overlapY) {
        enemy.hp -= 1;
        enemy.hitFlash = 8;
        if (enemy.hp <= 0) {
          enemy.alive = false;
          pop();
        } else {
          hit();
        }
      }
    }
  }, [hit, pop, showVictory]);

  useEffect(() => {
    if (!isPlaying || showVictory) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const updatePlayer = () => {
      const p = playerRef.current;
      const keys = keysRef.current;
      const moveLeft = keys.has('a') || keys.has('arrowleft');
      const moveRight = keys.has('d') || keys.has('arrowright');
      const wantsJump = keys.has('jump') || keys.has('w') || keys.has('arrowup');
      const wantsAttack = keys.has('attack') || keys.has('f');

      const previousY = p.y;
      const previousBottom = previousY + p.h;

      let dir = 0;
      if (moveLeft) dir -= 1;
      if (moveRight) dir += 1;

      p.vx = dir * MOVE_SPEED;
      if (dir !== 0) p.facing = dir > 0 ? 1 : -1;

      if (wantsJump && p.onGround) {
        p.vy = JUMP_VELOCITY;
        p.onGround = false;
      }

      if (wantsAttack) triggerAttack();
      if (p.attackCooldown > 0) p.attackCooldown--;
      if (p.attackTimer > 0) p.attackTimer--;

      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;

      let landedOnPlatform = false;
      let targetY = CANVAS_H - 40 - p.h;

      for (const platform of platformsRef.current) {
        const overlapX = p.x < platform.x + platform.w && p.x + p.w > platform.x;
        const currentBottom = p.y + p.h;
        const isLandingFromAbove = p.vy >= 0 && previousBottom <= platform.y + 8 && currentBottom >= platform.y;

        if (overlapX && isLandingFromAbove) {
          targetY = Math.min(targetY, platform.y - p.h);
          landedOnPlatform = true;
        }
      }

      if (landedOnPlatform) {
        p.y = targetY;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }

      p.x = clamp(p.x, 0, CANVAS_W - p.w);
      p.y = clamp(p.y, 0, CANVAS_H - p.h);
    };

    const updateEnemies = () => {
      for (const enemy of enemiesRef.current) {
        if (!enemy.alive) continue;
        enemy.x += enemy.vx;
        if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) enemy.vx *= -1;
        if (enemy.hitFlash > 0) enemy.hitFlash--;

        const close = Math.abs(playerRef.current.x - enemy.x) < 60 && Math.abs(playerRef.current.y - enemy.y) < 50;
        if (close) {
          pop();
        }
      }
    };

    const collectCrystals = () => {
      let collected = 0;
      for (const crystal of crystalsRef.current) {
        if (crystal.collected) {
          collected += 1;
          continue;
        }
        const hitRange = Math.abs(playerRef.current.x + playerRef.current.w / 2 - crystal.x) < 38 && Math.abs(playerRef.current.y + playerRef.current.h / 2 - crystal.y) < 38;
        if (hitRange) {
          crystal.collected = true;
          select();
          collected += 1;
        }
      }
      setCrystalsLeft(4 - collected);
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      gradient.addColorStop(0, '#071120');
      gradient.addColorStop(0.52, '#102a4e');
      gradient.addColorStop(1, '#180b36');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.arc(50 + i * 55, 44 + (i % 4) * 18, 1.8 + (i % 3) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 90 + i * 68);
        ctx.lineTo(CANVAS_W, 80 + i * 68);
        ctx.stroke();
      }
    };

    const drawPlatforms = () => {
      platformsRef.current.forEach((platform, index) => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.32)';
        ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(platform.x, platform.y, platform.w, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(platform.x, platform.y + platform.h - 4, platform.w, 4);
        if (index === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(platform.x, platform.y + 8, platform.w, 10);
        }
      });
    };

    const drawCrystals = () => {
      crystalsRef.current.forEach((crystal) => {
        if (crystal.collected) return;
        ctx.save();
        ctx.translate(crystal.x, crystal.y);
        ctx.shadowColor = crystal.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = crystal.color;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#e5e7eb';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(crystal.label, crystal.x, crystal.y - 16);
      });
    };

    const drawPlayer = () => {
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(p.w / 2, p.h + 8, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f9d4c5';
      ctx.fillRect(8, 8, 12, 12);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(7, 4, 14, 14);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(5, 18, 18, 18);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, 36, 7, 16);
      ctx.fillRect(17, 36, 7, 16);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(0, 18, 4, 14);
      ctx.fillRect(24, 18, 4, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(8, 30, 12, 4);

      if (p.attackTimer > 0) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.facing === 1 ? p.w + 8 : -8, 28, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawEnemies = () => {
      enemiesRef.current.forEach((enemy) => {
        if (!enemy.alive) return;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : '#ef4444';
        ctx.fillRect(0, 0, enemy.w, enemy.h);
        ctx.strokeStyle = '#111827';
        ctx.strokeRect(0, 0, enemy.w, enemy.h);
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, -8, enemy.w, 6);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, -8, enemy.w * (enemy.hp / enemy.maxHp), 6);
        ctx.restore();
      });
    };

    const drawHUD = () => {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
      ctx.fillRect(12, 12, 260, 50);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '15px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Evolution Trial - Stage 4', 24, 32);
      ctx.fillStyle = '#67e8f9';
      ctx.fillText(`Fragments ${crystalsLeft}/4`, 24, 51);
    };

    const loop = () => {
      if (!isPlayingRef.current) return;

      updatePlayer();
      updateEnemies();
      collectCrystals();

      drawBackground();
      drawPlatforms();
      drawCrystals();
      drawEnemies();
      drawPlayer();
      drawHUD();

      if (crystalsLeft <= 0) {
        playVictory();
        setShowVictory(true);
        return;
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, showVictory, crystalsLeft, playVictory, hit, pop, select]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlayingRef.current || showVictory) return;
    const key = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      keysRef.current.add('jump');
      return;
    }
    keysRef.current.add(key);
    if (key === 'f' || key === 'j') {
      triggerAttack();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      keysRef.current.delete('jump');
      return;
    }
    keysRef.current.delete(e.key.toLowerCase());
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerAttack, showVictory]);

  const handleStart = () => {
    initLevel();
    setShowVictory(false);
    setIsPlaying(true);
  };

  const handleRestart = () => {
    initLevel();
    setShowVictory(false);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-charcoal flex flex-col items-center justify-start p-2 md:p-4 md:justify-center">
      <div className="mb-2 text-center">
        <h1 className="text-xl md:text-3xl font-bold text-white font-display mb-1">
          <span className="gradient-text">Evolution Trial - Stage 4</span>
        </h1>
        <p className="text-silver-gray/60 text-xs md:text-sm">
          A clearer jump path, stronger platform rhythm, and a final combat evolution stage.
        </p>
      </div>

      <div className="relative" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
        <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CANVAS_W, height: CANVAS_H }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="border-2 border-neon-purple/30 rounded-lg shadow-lg shadow-neon-purple/20 block"
          />

          {!isPlaying && !showVictory && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
              <button onClick={handleStart} className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-full hover:scale-105 transition-transform">
                <Play className="w-6 h-6" />
                Enter Evolution Trial
              </button>
              <p className="text-silver-gray mt-4 text-sm">The route is now clearer: run, jump across the rising platforms, then punch monsters and collect four fragments.</p>
              <p className="text-silver-gray/50 mt-1 text-xs">Arrow keys / WASD to move · Space to jump · J/F to attack</p>
            </div>
          )}

          {showVictory && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center" style={{ width: '100%' }}>
                <Star className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-4xl font-bold text-white font-display mb-2 gradient-text">Evolution Complete!</h2>
                <p className="text-silver-gray mb-2">You have completed the final evolution from movement to combat and collected every fragment.</p>
                <p className="text-light-gray mb-8">Now enter the final birthday surprise.</p>
                <button onClick={() => onCompleteGame()} className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 text-white font-bold rounded-full hover:scale-110 transition-transform shadow-lg shadow-neon-blue/30">
                  <Star className="w-6 h-6" />
                  Open Surprise
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 md:hidden flex gap-3 select-none justify-center flex-wrap">
        <div className="flex items-center gap-2 text-silver-gray/70 text-[11px] font-medium w-full justify-center mb-1">
          <span>�ƶ�</span>
          <span>?</span>
          <span>��Ծ</span>
          <span>?</span>
          <span>����</span>
        </div>
        <button onTouchStart={handleTouchStart('jump')} onTouchEnd={handleTouchEnd('jump')} onMouseDown={handleTouchStart('jump')} onMouseUp={handleTouchEnd('jump')} className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 flex items-center justify-center text-white active:scale-95 transition-transform touch-none">
          <span className="text-2xl">?</span>
        </button>
        <button onTouchStart={handleTouchStart('left')} onTouchEnd={handleTouchEnd('left')} onMouseDown={handleTouchStart('left')} onMouseUp={handleTouchEnd('left')} className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button onTouchStart={handleTouchStart('right')} onTouchEnd={handleTouchEnd('right')} onMouseDown={handleTouchStart('right')} onMouseUp={handleTouchEnd('right')} className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none">
          <ArrowRight className="w-6 h-6" />
        </button>
        <button onTouchStart={handleTouchStart('shoot')} onTouchEnd={handleTouchEnd('shoot')} onMouseDown={handleTouchStart('shoot')} onMouseUp={handleTouchEnd('shoot')} className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center text-white active:scale-95 transition-transform touch-none">
          <span className="text-2xl">??</span>
        </button>
      </div>

      <div className="mt-3 flex gap-4">
        <button onClick={handleRestart} className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base">
          <RotateCcw className="w-4 h-4" />���¿�ʼ
        </button>
      </div>
    </div>
  );
};

export default EvolutionGame;