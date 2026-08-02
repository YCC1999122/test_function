import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Star, ArrowRight, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const CANVAS_W = 900;
const CANVAS_H = 560;
const PLAYER_RADIUS = 16;
const ENEMY_RADIUS = 14;
const BULLET_SPEED = 5.8;

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  shootCooldown: number;
}

interface Crystal {
  x: number;
  y: number;
  color: string;
  name: string;
  collected: boolean;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  speed: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const evolutionStages = [
  { x: 140, y: 110, color: '#00d4ff', name: '跳跃阶段' },
  { x: 760, y: 110, color: '#facc15', name: '迷宫阶段' },
  { x: 140, y: 450, color: '#f97316', name: '射击阶段' },
  { x: 760, y: 450, color: '#a855f7', name: '进化终局' },
];

const EvolutionGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [scale, setScale] = useState(1);
  const [crystalsLeft, setCrystalsLeft] = useState(4);

  const { hit, select, victory: playVictory, pop } = useGameAudio();

  const playerRef = useRef<Player>({ x: CANVAS_W / 2, y: CANVAS_H / 2, vx: 0, vy: 0, radius: PLAYER_RADIUS, shootCooldown: 0 });
  const crystalsRef = useRef<Crystal[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(false);
  const animationRef = useRef<number>(0);
  const lastMoveRef = useRef({ x: 1, y: 0 });

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

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
    crystalsRef.current = evolutionStages.map((stage, idx) => ({
      ...stage,
      collected: false,
    }));

    playerRef.current = { x: CANVAS_W / 2, y: CANVAS_H / 2, vx: 0, vy: 0, radius: PLAYER_RADIUS, shootCooldown: 0 };
    bulletsRef.current = [];
    keysRef.current.clear();
    lastMoveRef.current = { x: 1, y: 0 };

    // Spawn enemies around the arena to feel like a final evolution boss space
    const enemies: Enemy[] = [];
    const spawnPoints = [
      [120, 170], [260, 130], [720, 200], [800, 340], [180, 370], [420, 270], [620, 460], [820, 80]
    ];

    for (const [x, y] of spawnPoints) {
      enemies.push({
        x, y,
        vx: 0, vy: 0,
        radius: ENEMY_RADIUS,
        hp: 2,
        maxHp: 2,
        hitFlash: 0,
        speed: 0.9 + Math.random() * 0.35,
      });
    }

    enemiesRef.current = enemies;
    setCrystalsLeft(4);
  }, []);

  const handleShoot = useCallback(() => {
    if (!isPlayingRef.current || showVictory) return;
    const p = playerRef.current;
    if (p.shootCooldown > 0) return;

    p.shootCooldown = 180;
    select();

    const dir = lastMoveRef.current.x === 0 && lastMoveRef.current.y === 0
      ? { x: 1, y: 0 }
      : lastMoveRef.current;

    bulletsRef.current.push({
      x: p.x + dir.x * (p.radius + 10),
      y: p.y + dir.y * (p.radius + 10),
      vx: dir.x * BULLET_SPEED,
      vy: dir.y * BULLET_SPEED,
      life: 80,
    });
  }, [showVictory, select]);

  const handleTouchStart = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'shoot') => (e: any) => {
    e.preventDefault();
    if (!isPlayingRef.current || showVictory) return;

    if (direction === 'up') keysRef.current.add('arrowup');
    if (direction === 'down') keysRef.current.add('arrowdown');
    if (direction === 'left') keysRef.current.add('arrowleft');
    if (direction === 'right') keysRef.current.add('arrowright');
    if (direction === 'shoot') {
      keysRef.current.add('shoot');
      handleShoot();
    }
  }, [handleShoot, showVictory]);

  const handleTouchEnd = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'shoot') => (e: any) => {
    e.preventDefault();
    if (direction === 'up') keysRef.current.delete('arrowup');
    if (direction === 'down') keysRef.current.delete('arrowdown');
    if (direction === 'left') keysRef.current.delete('arrowleft');
    if (direction === 'right') keysRef.current.delete('arrowright');
    if (direction === 'shoot') keysRef.current.delete('shoot');
  }, []);

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
      let dx = 0;
      let dy = 0;

      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;

      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 2.35;
      const moveX = (dx / len) * speed;
      const moveY = (dy / len) * speed;

      p.x = clamp(p.x + moveX, p.radius, CANVAS_W - p.radius);
      p.y = clamp(p.y + moveY, p.radius, CANVAS_H - p.radius);

      if (dx !== 0 || dy !== 0) {
        lastMoveRef.current = { x: dx / len, y: dy / len };
      }

      if (p.shootCooldown > 0) p.shootCooldown--;
    };

    const updateEnemies = () => {
      for (const enemy of enemiesRef.current) {
        const dx = playerRef.current.x - enemy.x;
        const dy = playerRef.current.y - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;
        enemy.vx = (dx / dist) * enemy.speed;
        enemy.vy = (dy / dist) * enemy.speed;
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        if (enemy.hitFlash > 0) enemy.hitFlash--;

        if (Math.hypot(playerRef.current.x - enemy.x, playerRef.current.y - enemy.y) < playerRef.current.radius + enemy.radius + 2) {
          pop();
          playerRef.current.x = clamp(playerRef.current.x - enemy.vx * 8, playerRef.current.radius, CANVAS_W - playerRef.current.radius);
          playerRef.current.y = clamp(playerRef.current.y - enemy.vy * 8, playerRef.current.radius, CANVAS_H - playerRef.current.radius);
        }
      }
    };

    const updateBullets = () => {
      bulletsRef.current = bulletsRef.current.filter((bullet) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.life--;

        if (bullet.life <= 0) return false;
        if (bullet.x < 0 || bullet.x > CANVAS_W || bullet.y < 0 || bullet.y > CANVAS_H) return false;

        for (const enemy of enemiesRef.current) {
          if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + 6) {
            enemy.hp--;
            enemy.hitFlash = 6;
            hit();
            if (enemy.hp <= 0) {
              enemy.x = -9999;
              enemy.y = -9999;
            }
            return false;
          }
        }

        return true;
      });
    };

    const collectCrystals = () => {
      let collected = 0;
      for (const crystal of crystalsRef.current) {
        if (crystal.collected) {
          collected++;
          continue;
        }
        if (Math.hypot(playerRef.current.x - crystal.x, playerRef.current.y - crystal.y) < playerRef.current.radius + 18) {
          crystal.collected = true;
          collected++;
          select();
        }
      }
      setCrystalsLeft(4 - collected);
    };

    const drawBackground = () => {
      const bg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
      bg.addColorStop(0, '#060515');
      bg.addColorStop(0.5, '#12233d');
      bg.addColorStop(1, '#1b1240');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = 40; x < CANVAS_W; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      for (let y = 40; y < CANVAS_H; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }
    };

    const drawCrystals = () => {
      for (const crystal of crystalsRef.current) {
        if (crystal.collected) continue;
        ctx.save();
        ctx.translate(crystal.x, crystal.y);
        ctx.strokeStyle = crystal.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = crystal.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = crystal.color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(crystal.name, crystal.x, crystal.y + 34);
      }
    };

    const drawEnemies = () => {
      for (const enemy of enemiesRef.current) {
        if (enemy.x < -1000 || enemy.y < -1000) continue;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.shadowColor = enemy.hitFlash > 0 ? '#ffffff' : '#ef4444';
        ctx.shadowBlur = enemy.hitFlash > 0 ? 12 : 8;
        ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(enemy.x - 16, enemy.y - 24, 32, 5);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(enemy.x - 16, enemy.y - 24, 32 * (enemy.hp / enemy.maxHp), 5);
      }
    };

    const drawBullets = () => {
      ctx.fillStyle = '#8b5cf6';
      for (const bullet of bulletsRef.current) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawPlayer = () => {
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.x, p.y);
      const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
      aura.addColorStop(0, 'rgba(34, 211, 238, 0.8)');
      aura.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -3, 12, 6);
      ctx.restore();
    };

    const drawHUD = () => {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      ctx.fillRect(12, 12, 240, 48);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '15px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('进化遗迹', 24, 30);
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(`碎片剩余：${crystalsLeft}`, 24, 52);
    };

    const loop = () => {
      if (!isPlayingRef.current) return;

      updatePlayer();
      updateEnemies();
      updateBullets();
      collectCrystals();

      drawBackground();
      drawCrystals();
      drawEnemies();
      drawBullets();
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

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, showVictory, hit, select, playVictory, crystalsLeft]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlayingRef.current || showVictory) return;
    const k = e.key.toLowerCase();
    keysRef.current.add(k);
    if ((k === 'j' || k === 'f') || e.code === 'Space') {
      e.preventDefault();
      handleShoot();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleShoot, showVictory]);

  const handleStart = () => {
    initLevel();
    setIsPlaying(true);
    setShowVictory(false);
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
          <span className="gradient-text">进化遗迹 - 第四关</span>
        </h1>
        <p className="text-silver-gray/60 text-xs md:text-sm">
          跳跃、迷宫、射击三种玩法的终极融合：收集四颗进化碎片，终结遗迹守门者
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
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-full hover:scale-105 transition-transform"
              >
                <Play className="w-6 h-6" />
                进入进化遗迹
              </button>
              <p className="text-silver-gray mt-4 text-sm">这是一个“进化结晶”的终章：收集四种阶段碎片，抵御守护者。</p>
              <p className="text-silver-gray/50 mt-1 text-xs">WASD/方向键移动 · J/F 或空格射击</p>
            </div>
          )}

          {showVictory && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center" style={{ width: '100%' }}>
                <Star className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-4xl font-bold text-white font-display mb-2 gradient-text">
                  🌌 进化完成！ 🌌
                </h2>
                <p className="text-silver-gray mb-2">你已经把跳跃、迷宫、射击三种玩法完整演化成了最终形态。</p>
                <p className="text-light-gray mb-8">这是属于你的终极祝福</p>
                <button
                  onClick={() => { onCompleteGame(); }}
                  className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 text-white font-bold rounded-full hover:scale-110 transition-transform shadow-lg shadow-neon-blue/30"
                >
                  <Star className="w-6 h-6" />
                  打开惊喜
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 md:hidden flex gap-3 select-none justify-center flex-wrap">
        <div className="flex items-center gap-2 text-silver-gray/70 text-[11px] font-medium w-full justify-center mb-1">
          <span>移动</span>
          <span>•</span>
          <span>射击：火焰</span>
        </div>
        <button onTouchStart={handleTouchStart('up')} onTouchEnd={handleTouchEnd('up')} onMouseDown={handleTouchStart('up')} onMouseUp={handleTouchEnd('up')} className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white"><ArrowUp className="w-6 h-6" /></button>
        <button onTouchStart={handleTouchStart('left')} onTouchEnd={handleTouchEnd('left')} onMouseDown={handleTouchStart('left')} onMouseUp={handleTouchEnd('left')} className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white"><ArrowLeft className="w-6 h-6" /></button>
        <button onTouchStart={handleTouchStart('right')} onTouchEnd={handleTouchEnd('right')} onMouseDown={handleTouchStart('right')} onMouseUp={handleTouchEnd('right')} className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white">➡️</button>
        <button onTouchStart={handleTouchStart('down')} onTouchEnd={handleTouchEnd('down')} onMouseDown={handleTouchStart('down')} onMouseUp={handleTouchEnd('down')} className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white"><ArrowDown className="w-6 h-6" /></button>
        <button onTouchStart={handleTouchStart('shoot')} onTouchEnd={handleTouchEnd('shoot')} onMouseDown={handleTouchStart('shoot')} onMouseUp={handleTouchEnd('shoot')} className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center text-white"><span className="text-2xl">🔥</span></button>
      </div>

      <div className="mt-3 flex gap-4">
        <button onClick={handleRestart} className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base">
          <RotateCcw className="w-4 h-4" />重新开始
        </button>
      </div>
    </div>
  );
};

export default EvolutionGame;
