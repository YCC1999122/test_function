import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Star, ArrowRight } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const CANVAS_SIZE = 840;
const CELL_SIZE = 60;
const GRID_SIZE = 14;

// 0=空, 1=实墙, 2=可破坏墙, 3=怪物, 4=玩家起点, 5=礼物
const MAZE_LAYOUT = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,4,0,0,2,0,0,0,0,2,0,0,3,1],
  [1,0,1,0,1,0,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,1,0,1],
  [1,2,0,0,1,2,1,0,1,2,0,0,0,1],
  [1,0,1,0,0,0,1,0,0,0,0,1,2,1],
  [1,0,1,1,2,0,0,0,0,2,1,0,0,1],
  [1,0,0,0,1,0,1,1,0,1,0,0,1,1],
  [1,1,2,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,0,1,2,1,0,1,1,2,0,1],
  [1,0,2,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,0,1,2,1,0,1,0,1],
  [1,3,0,0,2,0,0,0,0,0,0,0,5,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

interface WallCell {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  destructible: boolean;
  hitFlash: number;
}

interface Monster {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  wanderTimer: number;
  wanderAngle: number;
  speed: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number; // angle in radians
  shootCooldown: number;
}

const COLORS = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'];

const MazeGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [monstersLeft, setMonstersLeft] = useState(0);
  const [scale, setScale] = useState(1);

  const { hit, select, star: playStar, victory, startBGM, stopBGM } = useGameAudio();

  const playerRef = useRef<Player>({
    x: CELL_SIZE * 1.5,
    y: CELL_SIZE * 1.5,
    vx: 0,
    vy: 0,
    facing: 0,
    shootCooldown: 0,
  });

  const wallsRef = useRef<WallCell[]>([]);
  const monstersRef = useRef<Monster[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });
  const isPlayingRef = useRef(false);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const updateScale = () => {
      const availW = window.innerWidth - 32;
      const availH = window.innerHeight - 200;
      const s = Math.min(availW / CANVAS_SIZE, availH / CANVAS_SIZE, 1);
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
    const walls: WallCell[] = [];
    const monsters: Monster[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = MAZE_LAYOUT[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        if (cell === 1) {
          walls.push({ x, y, hp: -1, maxHp: -1, destructible: false, hitFlash: 0 });
        } else if (cell === 2) {
          walls.push({ x, y, hp: 3, maxHp: 3, destructible: true, hitFlash: 0 });
        } else if (cell === 3) {
          monsters.push({
            x: x + CELL_SIZE / 2,
            y: y + CELL_SIZE / 2,
            vx: 0,
            vy: 0,
            hp: 2,
            maxHp: 2,
            hitFlash: 0,
            wanderTimer: 0,
            wanderAngle: Math.random() * Math.PI * 2,
            speed: 1.2 + Math.random() * 0.6,
          });
        } else if (cell === 4) {
          playerRef.current = {
            x: x + CELL_SIZE / 2,
            y: y + CELL_SIZE / 2,
            vx: 0,
            vy: 0,
            facing: 0,
            shootCooldown: 0,
          };
        }
      }
    }

    wallsRef.current = walls;
    monstersRef.current = monsters;
    bulletsRef.current = [];
    setMonstersLeft(monsters.length);
  }, []);

  const checkWallCollision = useCallback((x: number, y: number, radius: number): boolean => {
    for (const w of wallsRef.current) {
      if (x + radius > w.x && x - radius < w.x + CELL_SIZE &&
          y + radius > w.y && y - radius < w.y + CELL_SIZE) {
        return true;
      }
    }
    return false;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    timeRef.current += 0.05;

    // Background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid pattern
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw walls
    wallsRef.current.forEach((w) => {
      if (!w.destructible) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(w.x, w.y, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, CELL_SIZE, CELL_SIZE);
      } else {
        const hpRatio = w.hp / w.maxHp;
        const flash = w.hitFlash > 0;
        ctx.fillStyle = flash ? '#ffffff' : `rgba(168, 85, 247, ${0.3 + hpRatio * 0.4})`;
        ctx.fillRect(w.x + 2, w.y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeStyle = flash ? '#fff' : '#a855f7';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x + 2, w.y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Crack pattern based on damage
        if (hpRatio < 0.67) {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w.x + 10, w.y + 10);
          ctx.lineTo(w.x + 25, w.y + 30);
          ctx.lineTo(w.x + 20, w.y + 50);
          ctx.stroke();
        }
        if (hpRatio < 0.34) {
          ctx.beginPath();
          ctx.moveTo(w.x + 40, w.y + 15);
          ctx.lineTo(w.x + 30, w.y + 40);
          ctx.lineTo(w.x + 50, w.y + 50);
          ctx.stroke();
        }
      }
    });

    // Draw gift (exit)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (MAZE_LAYOUT[r][c] === 5) {
          const gx = c * CELL_SIZE + CELL_SIZE / 2;
          const gy = r * CELL_SIZE + CELL_SIZE / 2;
          const pulse = 0.5 + 0.5 * Math.sin(timeRef.current * 3);
          ctx.save();
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 30 + pulse * 20;
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(gx, gy, 15 + pulse * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎁', gx, gy);
          ctx.restore();
        }
      }
    }

    // Draw monsters
    monstersRef.current.forEach((m) => {
      const color = m.hitFlash > 0 ? '#ffffff' : '#ef4444';
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👾', m.x, m.y);
      ctx.restore();

      // HP bar
      if (m.hp < m.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(m.x - 18, m.y - 24, 36, 4);
        ctx.fillStyle = m.hp / m.maxHp > 0.5 ? '#22c55e' : '#facc15';
        ctx.fillRect(m.x - 18, m.y - 24, 36 * (m.hp / m.maxHp), 4);
      }
    });

    // Draw bullets
    bulletsRef.current.forEach((b) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, b.life / 10);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(b.x - b.vx, b.y - b.vy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw player
    const p = playerRef.current;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Aura
    const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
    auraGrad.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(-25, -25, 50, 50);

    // Body
    ctx.rotate(p.facing);
    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Gun barrel
    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(8, -3, 14, 6);

    ctx.restore();
  }, []);

  const update = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isPlayingRef.current) return;

    const p = playerRef.current;
    const keys = keysRef.current;
    const speed = 3;

    // Movement
    let mx = 0, my = 0;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('left')) mx = -1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('right')) mx = 1;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('up')) my = -1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('down')) my = 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      mx /= len;
      my /= len;
    }

    const newX = p.x + mx * speed;
    const newY = p.y + my * speed;

    if (!checkWallCollision(newX, p.y, 12)) p.x = newX;
    if (!checkWallCollision(p.x, newY, 12)) p.y = newY;

    p.x = Math.max(12, Math.min(CANVAS_SIZE - 12, p.x));
    p.y = Math.max(12, Math.min(CANVAS_SIZE - 12, p.y));

    // Facing: aim at mouse
    p.facing = Math.atan2(mouseRef.current.y - p.y, mouseRef.current.x - p.x);

    // Shooting
    if (p.shootCooldown > 0) p.shootCooldown--;
    if ((keys.has('j') || keys.has('f') || keys.has('shoot')) && p.shootCooldown <= 0) {
      bulletsRef.current.push({
        x: p.x + Math.cos(p.facing) * 18,
        y: p.y + Math.sin(p.facing) * 18,
        vx: Math.cos(p.facing) * 9,
        vy: Math.sin(p.facing) * 9,
        life: 80,
        color: '#00d4ff',
      });
      p.shootCooldown = 10;
      select();
    }

    // Update bullets
    const bullets = bulletsRef.current;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      if (b.life <= 0 || b.x < 0 || b.x > CANVAS_SIZE || b.y < 0 || b.y > CANVAS_SIZE) {
        bullets.splice(i, 1);
        continue;
      }

      // Bullet vs walls
      let hitWall = false;
      for (let j = wallsRef.current.length - 1; j >= 0; j--) {
        const w = wallsRef.current[j];
        if (b.x > w.x && b.x < w.x + CELL_SIZE && b.y > w.y && b.y < w.y + CELL_SIZE) {
          if (w.destructible) {
            w.hp--;
            w.hitFlash = 6;
            if (w.hp <= 0) {
              wallsRef.current.splice(j, 1);
            }
          }
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        bullets.splice(i, 1);
        continue;
      }

      // Bullet vs monsters
      for (let j = monstersRef.current.length - 1; j >= 0; j--) {
        const m = monstersRef.current[j];
        const dx = b.x - m.x;
        const dy = b.y - m.y;
        if (Math.sqrt(dx * dx + dy * dy) < 18) {
          m.hp--;
          m.hitFlash = 6;
          bullets.splice(i, 1);
          hit();
          if (m.hp <= 0) {
            monstersRef.current.splice(j, 1);
            setMonstersLeft(monstersRef.current.length);
          }
          break;
        }
      }
    }

    // Update monsters
    monstersRef.current.forEach((m) => {
      if (m.hitFlash > 0) m.hitFlash--;
      m.wanderTimer++;

      if (m.wanderTimer > 40 + Math.random() * 60) {
        m.wanderAngle = Math.random() * Math.PI * 2;
        m.wanderTimer = 0;
      }

      // Chase player if close
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let mvx, mvy;
      if (dist < 250) {
        mvx = dx / dist;
        mvy = dy / dist;
      } else {
        mvx = Math.cos(m.wanderAngle);
        mvy = Math.sin(m.wanderAngle);
      }

      const mnx = m.x + mvx * m.speed;
      const mny = m.y + mvy * m.speed;
      if (!checkWallCollision(mnx, m.y, 14)) m.x = mnx;
      if (!checkWallCollision(m.x, mny, 14)) m.y = mny;

      m.x = Math.max(14, Math.min(CANVAS_SIZE - 14, m.x));
      m.y = Math.max(14, Math.min(CANVAS_SIZE - 14, m.y));

      // Monster hits player
      if (dist < 20) {
        // Knockback player
        const knockX = -dx / dist * 15;
        const knockY = -dy / dist * 15;
        if (!checkWallCollision(p.x + knockX, p.y, 12)) p.x += knockX;
        if (!checkWallCollision(p.x, p.y + knockY, 12)) p.y += knockY;
      }
    });

    // Check gift collection
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (MAZE_LAYOUT[r][c] === 5) {
          const gx = c * CELL_SIZE + CELL_SIZE / 2;
          const gy = r * CELL_SIZE + CELL_SIZE / 2;
          const dx = p.x - gx;
          const dy = p.y - gy;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            victory();
            setShowVictory(true);
            setIsPlaying(false);
            cancelAnimationFrame(animationRef.current);
            return;
          }
        }
      }
    }

    draw(ctx);
    animationRef.current = requestAnimationFrame(() => update(ctx));
  }, [checkWallCollision, draw, hit, select, victory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current || showVictory) return;
      keysRef.current.add(e.key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    const handleMouseDown = () => {
      if (!isPlayingRef.current || showVictory) return;
      keysRef.current.add('shoot');
    };
    const handleMouseUp = () => {
      keysRef.current.delete('shoot');
    };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / scale;
      mouseRef.current.y = (e.clientY - rect.top) / scale;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(() => update(ctx));
    } else {
      draw(ctx);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, showVictory, update, draw, scale]);

  const handleStart = () => {
    initLevel();
    setIsPlaying(true);
    startBGM();
  };

  const handleRestart = () => {
    initLevel();
    setShowVictory(false);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-charcoal flex flex-col items-center justify-start p-2 md:p-4 md:justify-center">
      <div className="mb-2 md:mb-4 text-center">
        <h1 className="text-xl md:text-4xl font-bold text-white font-display mb-1 md:mb-2">
          <span className="gradient-text">迷宫探险 - 第二关</span>
        </h1>
        <div className="flex items-center justify-center gap-4 text-xs md:text-base">
          <p className="text-silver-gray">怪物剩余: <span className="text-red-400 font-bold">{monstersLeft}</span></p>
          <p className="text-silver-gray/50">找到 🎁 礼物通关！</p>
        </div>
      </div>

      <div className="relative" style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}>
        <div
          className="relative"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CANVAS_SIZE, height: CANVAS_SIZE }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="border-2 border-neon-purple/30 rounded-lg shadow-lg shadow-neon-purple/20 block cursor-crosshair"
          />

          {!isPlaying && !showVictory && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-full hover:scale-105 transition-transform"
              >
                <Play className="w-6 h-6" />
                进入迷宫
              </button>
              <p className="text-silver-gray mt-4 text-sm">在迷宫中找到礼物！</p>
              <p className="text-silver-gray/50 mt-1 text-xs">WASD/方向键移动 / 鼠标瞄准 / 左键或J、F射击</p>
              <p className="text-silver-gray/50 mt-1 text-xs">紫色墙可破坏，灰色墙不可破坏</p>
            </div>
          )}

          {showVictory && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center" style={{ width: '100%' }}>
                <Star className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-4xl font-bold text-white font-display mb-2 gradient-text">
                  🎉 通关成功! 🎉
              </h2>
                <p className="text-silver-gray mb-2">你找到了礼物！</p>
                <p className="text-light-gray mb-8">这是给你的特别惊喜</p>
                <button
                  onClick={() => { stopBGM(); onCompleteGame(); }}
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

      {isPlaying && (
        <div className="mt-3 md:mt-6 flex gap-4">
          <button
            onClick={() => setIsPlaying(false)}
            className="px-4 py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base"
          >
            暂停
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base"
          >
            <RotateCcw className="w-4 h-4" />
            重新开始
          </button>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <div className="w-3 h-3 rounded-full bg-neon-blue shadow-lg shadow-neon-blue/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse" />
      </div>
    </div>
  );
};

export default MazeGame;
