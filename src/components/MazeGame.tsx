import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Star, ArrowRight } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const CANVAS_SIZE = 900;
const GRID_DIM = 21; // 21x21 cells
const CELL = CANVAS_SIZE / GRID_DIM; // ~42.8px
const WALL_T = 6; // wall thickness

// Maze cell: walls[0]=top, [1]=right, [2]=bottom, [3]=left
interface MazeCell { walls: boolean[]; visited: boolean; }

interface WallSeg {
  x: number; y: number; w: number; h: number;
  destructible: boolean; hp: number; maxHp: number; hitFlash: number;
}

interface Monster {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; hitFlash: number;
  wanderTimer: number; wanderAngle: number; speed: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string;
}

interface Player {
  x: number; y: number; facing: number; shootCooldown: number;
}

// Generate maze using recursive backtracker
function generateMaze(dim: number): MazeCell[][] {
  const grid: MazeCell[][] = [];
  for (let r = 0; r < dim; r++) {
    grid[r] = [];
    for (let c = 0; c < dim; c++) {
      grid[r][c] = { walls: [true, true, true, true], visited: false };
    }
  }

  const stack: [number, number][] = [];
  grid[0][0].visited = true;
  stack.push([0, 0]);

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: [number, number, number, number][] = []; // [nr, nc, wallIdx, oppositeWallIdx]

    if (r > 0 && !grid[r - 1][c].visited) neighbors.push([r - 1, c, 0, 2]);
    if (c < dim - 1 && !grid[r][c + 1].visited) neighbors.push([r, c + 1, 1, 3]);
    if (r < dim - 1 && !grid[r + 1][c].visited) neighbors.push([r + 1, c, 2, 0]);
    if (c > 0 && !grid[r][c - 1].visited) neighbors.push([r, c - 1, 3, 1]);

    if (neighbors.length > 0) {
      const [nr, nc, wi, owi] = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[r][c].walls[wi] = false;
      grid[nr][nc].walls[owi] = false;
      grid[nr][nc].visited = true;
      stack.push([nr, nc]);
    } else {
      stack.pop();
    }
  }

  // Remove some random walls to create loops (more interesting)
  for (let i = 0; i < dim * 2; i++) {
    const r = Math.floor(Math.random() * dim);
    const c = Math.floor(Math.random() * dim);
    const wi = Math.floor(Math.random() * 4);
    if (grid[r][c].walls[wi]) {
      grid[r][c].walls[wi] = false;
      if (wi === 0 && r > 0) grid[r - 1][c].walls[2] = false;
      if (wi === 1 && c < dim - 1) grid[r][c + 1].walls[3] = false;
      if (wi === 2 && r < dim - 1) grid[r + 1][c].walls[0] = false;
      if (wi === 3 && c > 0) grid[r][c - 1].walls[1] = false;
    }
  }

  return grid;
}

function mazeToWalls(grid: MazeCell[][]): WallSeg[] {
  const walls: WallSeg[] = [];
  const dim = grid.length;

  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      const cell = grid[r][c];
      const x = c * CELL;
      const y = r * CELL;

      if (cell.walls[0]) walls.push({ x, y, w: CELL, h: WALL_T, destructible: false, hp: -1, maxHp: -1, hitFlash: 0 });
      if (cell.walls[3]) walls.push({ x, y, w: WALL_T, h: CELL, destructible: false, hp: -1, maxHp: -1, hitFlash: 0 });
      if (r === dim - 1 && cell.walls[2]) walls.push({ x, y: y + CELL, w: CELL, h: WALL_T, destructible: false, hp: -1, maxHp: -1, hitFlash: 0 });
      if (c === dim - 1 && cell.walls[1]) walls.push({ x: x + CELL, y, w: WALL_T, h: CELL, destructible: false, hp: -1, maxHp: -1, hitFlash: 0 });
    }
  }

  // Add some destructible walls in corridors
  for (let i = 0; i < 12; i++) {
    const r = 2 + Math.floor(Math.random() * (dim - 4));
    const c = 2 + Math.floor(Math.random() * (dim - 4));
    const x = c * CELL;
    const y = r * CELL;
    const horiz = Math.random() > 0.5;
    if (horiz) {
      walls.push({ x, y: y + CELL / 2 - WALL_T / 2, w: CELL, h: WALL_T, destructible: true, hp: 3, maxHp: 3, hitFlash: 0 });
    } else {
      walls.push({ x: x + CELL / 2 - WALL_T / 2, y, w: WALL_T, h: CELL, destructible: true, hp: 3, maxHp: 3, hitFlash: 0 });
    }
  }

  return walls;
}

const MazeGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [monstersLeft, setMonstersLeft] = useState(0);
  const [scale, setScale] = useState(1);

  const { hit, select, victory, startBGM, stopBGM } = useGameAudio();

  const playerRef = useRef<Player>({ x: CELL * 1.5, y: CELL * 1.5, facing: 0, shootCooldown: 0 });
  const wallsRef = useRef<WallSeg[]>([]);
  const monstersRef = useRef<Monster[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });
  const isPlayingRef = useRef(false);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const giftPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min((window.innerWidth - 32) / CANVAS_SIZE, (window.innerHeight - 200) / CANVAS_SIZE, 1);
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
    const maze = generateMaze(GRID_DIM);
    const walls = mazeToWalls(maze);

    // Place destructible walls at some corridor openings
    // Player at top-left, gift at bottom-right
    const giftX = (GRID_DIM - 1.5) * CELL;
    const giftY = (GRID_DIM - 1.5) * CELL;
    giftPosRef.current = { x: giftX, y: giftY };

    playerRef.current = { x: CELL * 1.5, y: CELL * 1.5, facing: 0, shootCooldown: 0 };

    // Place monsters in various cells (not too close to player start)
    const monsters: Monster[] = [];
    const monsterCells: [number, number][] = [
      [3, 5], [5, 3], [7, 7], [4, 10], [8, 4], [10, 8],
      [6, 14], [12, 6], [14, 10], [9, 15], [15, 5], [11, 12],
      [16, 8], [7, 17], [13, 16], [17, 13], [5, 18], [18, 3],
    ];

    for (const [r, c] of monsterCells) {
      if (r < GRID_DIM && c < GRID_DIM) {
        monsters.push({
          x: (c + 0.5) * CELL,
          y: (r + 0.5) * CELL,
          vx: 0, vy: 0,
          hp: 2, maxHp: 2,
          hitFlash: 0,
          wanderTimer: Math.floor(Math.random() * 60),
          wanderAngle: Math.random() * Math.PI * 2,
          speed: 1.0 + Math.random() * 0.8,
        });
      }
    }

    wallsRef.current = walls;
    monstersRef.current = monsters;
    bulletsRef.current = [];
    keysRef.current.clear();
    setMonstersLeft(monsters.length);
  }, []);

  const checkWallCollision = useCallback((x: number, y: number, radius: number): boolean => {
    for (const w of wallsRef.current) {
      if (x + radius > w.x && x - radius < w.x + w.w &&
          y + radius > w.y && y - radius < w.y + w.h) {
        return true;
      }
    }
    return false;
  }, []);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    const p = playerRef.current;
    const s = 0.9;

    // Aura
    const auraGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22);
    auraGrad.addColorStop(0, 'rgba(255, 107, 157, 0.4)');
    auraGrad.addColorStop(0.5, 'rgba(255, 107, 157, 0.15)');
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(p.x - 22, p.y - 22, 44, 44);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(s, s);

    // Hair buns
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath(); ctx.ellipse(0, -14, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-9, -10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -10, 5, 0, Math.PI * 2); ctx.fill();

    // Hair front
    ctx.fillStyle = '#2d1810';
    ctx.beginPath(); ctx.ellipse(0, -8, 9, 7, 0, Math.PI, Math.PI * 2); ctx.fill();

    // Face
    ctx.fillStyle = '#ffe0d0';
    ctx.beginPath(); ctx.arc(0, -6, 6, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#2d1810';
    ctx.beginPath(); ctx.arc(-2.5, -7, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5, -7, 1.2, 0, Math.PI * 2); ctx.fill();

    // Mouth
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, -4, 1.5, 0.2, Math.PI - 0.2); ctx.stroke();

    // Body (dress)
    ctx.fillStyle = '#9d4edd';
    ctx.beginPath();
    ctx.moveTo(-8, 5); ctx.lineTo(-5, 3); ctx.lineTo(5, 3); ctx.lineTo(8, 5);
    ctx.lineTo(10, 14); ctx.lineTo(-10, 14); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 0.6; ctx.stroke();

    // Arms
    ctx.fillStyle = '#ffe0d0';
    ctx.beginPath(); ctx.roundRect(-9, 5, 3, 6, 1.5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(6, 5, 3, 6, 1.5); ctx.fill();

    // Gun barrel pointing in facing direction
    ctx.save();
    ctx.rotate(p.facing);
    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(8, -2, 12, 4);
    ctx.restore();

    ctx.restore();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    timeRef.current += 0.05;

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Subtle grid
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_DIM; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(CANVAS_SIZE, i * CELL); ctx.stroke();
    }

    // Draw walls
    wallsRef.current.forEach((w) => {
      if (!w.destructible) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      } else {
        const ratio = w.hp / w.maxHp;
        const flash = w.hitFlash > 0;
        ctx.fillStyle = flash ? '#fff' : `rgba(168, 85, 247, ${0.35 + ratio * 0.35})`;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = flash ? '#fff' : '#a855f7';
        ctx.lineWidth = 1;
        ctx.strokeRect(w.x, w.y, w.w, w.h);

        if (ratio < 0.67) {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(w.x + 3, w.y + 3); ctx.lineTo(w.x + w.w * 0.4, w.y + w.h * 0.6); ctx.stroke();
        }
        if (ratio < 0.34) {
          ctx.beginPath(); ctx.moveTo(w.x + w.w * 0.6, w.y + 2); ctx.lineTo(w.x + w.w * 0.3, w.y + w.h - 2); ctx.stroke();
        }
      }
    });

    // Draw gift
    const gp = giftPosRef.current;
    const pulse = 0.5 + 0.5 * Math.sin(timeRef.current * 3);
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 25 + pulse * 15;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(gp.x, gp.y, 12 + pulse * 2, 0, Math.PI * 2); ctx.fill();
    ctx.font = '18px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🎁', gp.x, gp.y);
    ctx.restore();

    // Draw monsters
    monstersRef.current.forEach((m) => {
      const color = m.hitFlash > 0 ? '#fff' : '#ef4444';
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.font = '16px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👾', m.x, m.y);
      ctx.restore();

      if (m.hp < m.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(m.x - 16, m.y - 22, 32, 3);
        ctx.fillStyle = m.hp / m.maxHp > 0.5 ? '#22c55e' : '#facc15';
        ctx.fillRect(m.x - 16, m.y - 22, 32 * (m.hp / m.maxHp), 3);
      }
    });

    // Draw bullets
    bulletsRef.current.forEach((b) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, b.life / 10);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(b.x - b.vx, b.y - b.vy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    drawPlayer(ctx);
  }, [drawPlayer]);

  const update = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isPlayingRef.current) return;

    const p = playerRef.current;
    const keys = keysRef.current;
    const speed = 2.8;

    let mx = 0, my = 0;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('left')) mx = -1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('right')) mx = 1;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('up')) my = -1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('down')) my = 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      mx /= len; my /= len;
    }

    const rad = 11;
    const nx = p.x + mx * speed;
    const ny = p.y + my * speed;
    if (!checkWallCollision(nx, p.y, rad)) p.x = nx;
    if (!checkWallCollision(p.x, ny, rad)) p.y = ny;
    p.x = Math.max(rad, Math.min(CANVAS_SIZE - rad, p.x));
    p.y = Math.max(rad, Math.min(CANVAS_SIZE - rad, p.y));

    // Face mouse
    p.facing = Math.atan2(mouseRef.current.y - p.y, mouseRef.current.x - p.x);

    // Shoot
    if (p.shootCooldown > 0) p.shootCooldown--;
    if ((keys.has('j') || keys.has('f') || keys.has('shoot')) && p.shootCooldown <= 0) {
      bulletsRef.current.push({
        x: p.x + Math.cos(p.facing) * 16,
        y: p.y + Math.sin(p.facing) * 16,
        vx: Math.cos(p.facing) * 8,
        vy: Math.sin(p.facing) * 8,
        life: 90,
        color: '#00d4ff',
      });
      p.shootCooldown = 9;
      select();
    }

    // Update bullets
    const bullets = bulletsRef.current;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy; b.life--;
      if (b.life <= 0 || b.x < 0 || b.x > CANVAS_SIZE || b.y < 0 || b.y > CANVAS_SIZE) {
        bullets.splice(i, 1); continue;
      }

      // Bullet vs walls
      let blocked = false;
      for (let j = wallsRef.current.length - 1; j >= 0; j--) {
        const w = wallsRef.current[j];
        if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
          if (w.destructible) {
            w.hp--; w.hitFlash = 5;
            if (w.hp <= 0) wallsRef.current.splice(j, 1);
          }
          blocked = true; break;
        }
      }
      if (blocked) { bullets.splice(i, 1); continue; }

      // Bullet vs monsters
      for (let j = monstersRef.current.length - 1; j >= 0; j--) {
        const m = monstersRef.current[j];
        const dx = b.x - m.x, dy = b.y - m.y;
        if (Math.sqrt(dx * dx + dy * dy) < 16) {
          m.hp--; m.hitFlash = 5;
          bullets.splice(i, 1);
          hit();
          if (m.hp <= 0) {
            monstersRef.current.splice(j, 1); // Permanent death, never respawn
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
      if (m.wanderTimer > 30 + Math.random() * 50) {
        m.wanderAngle = Math.random() * Math.PI * 2;
        m.wanderTimer = 0;
      }

      const dx = p.x - m.x, dy = p.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let mvx: number, mvy: number;

      if (dist < 200) {
        mvx = dx / dist; mvy = dy / dist;
      } else {
        mvx = Math.cos(m.wanderAngle); mvy = Math.sin(m.wanderAngle);
      }

      const mr = 13;
      const mnx = m.x + mvx * m.speed;
      const mny = m.y + mvy * m.speed;
      if (!checkWallCollision(mnx, m.y, mr)) m.x = mnx;
      if (!checkWallCollision(m.x, mny, mr)) m.y = mny;
      m.x = Math.max(mr, Math.min(CANVAS_SIZE - mr, m.x));
      m.y = Math.max(mr, Math.min(CANVAS_SIZE - mr, m.y));

      // Knockback on contact
      if (dist < 18) {
        const kx = -dx / dist * 12, ky = -dy / dist * 12;
        if (!checkWallCollision(p.x + kx, p.y, 11)) p.x += kx;
        if (!checkWallCollision(p.x, p.y + ky, 11)) p.y += ky;
      }
    });

    // Check gift
    const gp = giftPosRef.current;
    const gdx = p.x - gp.x, gdy = p.y - gp.y;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < 22) {
      victory();
      setShowVictory(true);
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
      return;
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
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    const handleMouseDown = () => {
      if (!isPlayingRef.current || showVictory) return;
      keysRef.current.add('shoot');
    };
    const handleMouseUp = () => { keysRef.current.delete('shoot'); };
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

  const handleStart = () => { initLevel(); setIsPlaying(true); startBGM(); };
  const handleRestart = () => { initLevel(); setShowVictory(false); setIsPlaying(true); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-charcoal flex flex-col items-center justify-start p-2 md:p-4 md:justify-center">
      <div className="mb-2 md:mb-4 text-center">
        <h1 className="text-xl md:text-4xl font-bold text-white font-display mb-1 md:mb-2">
          <span className="gradient-text">迷宫探险 - 第二关</span>
        </h1>
        <div className="flex items-center justify-center gap-4 text-xs md:text-base">
          <p className="text-silver-gray">怪物: <span className="text-red-400 font-bold">{monstersLeft}</span></p>
          <p className="text-silver-gray/50">找到 🎁 通关！</p>
        </div>
      </div>

      <div className="relative" style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}>
        <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CANVAS_SIZE, height: CANVAS_SIZE }}>
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
