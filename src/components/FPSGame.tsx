import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Star, ArrowRight, RotateCcw } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const SCREEN_W = 800;
const SCREEN_H = 500;
const HALF_DIM = 8; // 17x17 grid
const MAP_DIM = HALF_DIM * 2 + 1; // 17
const FOV_PLANE = 0.66;
const MOVE_SPEED = 0.045;
const PLAYER_RAD = 0.25;

type Grid = number[][];

interface FPSPlayer {
  x: number; y: number;
  dirX: number; dirY: number;
  planeX: number; planeY: number;
}

interface FPSEnemy {
  x: number; y: number;
  hp: number; alive: boolean;
  hitFlash: number;
  speed: number;
  wanderAngle: number;
  wanderTimer: number;
  attackCooldown: number;
}

// Generate maze: 1=wall, 0=floor
function generateMazeGrid(halfDim: number): Grid {
  const dim = halfDim * 2 + 1;
  const grid: Grid = Array(dim).fill(null).map(() => Array(dim).fill(1));

  const visited: boolean[][] = Array(halfDim).fill(null).map(() => Array(halfDim).fill(false));
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  grid[1][1] = 0;

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: [number, number, number][] = [];
    if (r > 0 && !visited[r - 1][c]) neighbors.push([r - 1, c, 0]);
    if (c < halfDim - 1 && !visited[r][c + 1]) neighbors.push([r, c + 1, 1]);
    if (r < halfDim - 1 && !visited[r + 1][c]) neighbors.push([r + 1, c, 2]);
    if (c > 0 && !visited[r][c - 1]) neighbors.push([r, c - 1, 3]);

    if (neighbors.length > 0) {
      const [nr, nc, dir] = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited[nr][nc] = true;
      grid[2 * nr + 1][2 * nc + 1] = 0;
      if (dir === 0) grid[2 * r][2 * c + 1] = 0;
      if (dir === 1) grid[2 * r + 1][2 * c + 2] = 0;
      if (dir === 2) grid[2 * r + 2][2 * c + 1] = 0;
      if (dir === 3) grid[2 * r + 1][2 * c] = 0;
      stack.push([nr, nc]);
    } else {
      stack.pop();
    }
  }

  // Add loops
  for (let i = 0; i < halfDim * 3; i++) {
    const r = 1 + Math.floor(Math.random() * (dim - 2));
    const c = 1 + Math.floor(Math.random() * (dim - 2));
    if (grid[r][c] === 1) grid[r][c] = 0;
  }

  return grid;
}

const FPSGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [enemiesLeft, setEnemiesLeft] = useState(0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [scale, setScale] = useState(1);

  const { hit, select, victory: playVictory, pop } = useGameAudio();

  const gridRef = useRef<Grid>([]);
  const playerRef = useRef<FPSPlayer>({ x: 1.5, y: 1.5, dirX: 1, dirY: 0, planeX: 0, planeY: FOV_PLANE });
  const enemiesRef = useRef<FPSEnemy[]>([]);
  const zBufferRef = useRef<Float32Array>(new Float32Array(SCREEN_W));
  const keysRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(false);
  const pointerLockedRef = useRef(false);
  const animationRef = useRef<number>(0);
  const shootAnimRef = useRef(0);
  const timeRef = useRef(0);
  const goalRef = useRef({ x: MAP_DIM - 1.5, y: MAP_DIM - 1.5 });
  const damageFlashRef = useRef(0);
  const cameraShakeRef = useRef(0);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { pointerLockedRef.current = pointerLocked; }, [pointerLocked]);

  const handleTouchStart = useCallback((direction: 'forward' | 'backward' | 'left' | 'right' | 'shoot') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isPlayingRef.current || showVictory) return;
    keysRef.current.add(direction);
  }, [showVictory]);

  const handleTouchEnd = useCallback((direction: 'forward' | 'backward' | 'left' | 'right' | 'shoot') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.delete(direction);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min((window.innerWidth - 32) / SCREEN_W, (window.innerHeight - 120) / SCREEN_H, 1.3);
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
    const grid = generateMazeGrid(HALF_DIM);
    gridRef.current = grid;

    playerRef.current = { x: 1.5, y: 1.5, dirX: 1, dirY: 0, planeX: 0, planeY: FOV_PLANE };
    goalRef.current = { x: MAP_DIM - 1.5, y: MAP_DIM - 1.5 };

    // Place enemies
    const enemies: FPSEnemy[] = [];
    const numEnemies = 10;
    let attempts = 0;
    while (enemies.length < numEnemies && attempts < 200) {
      attempts++;
      const r = Math.floor(Math.random() * MAP_DIM);
      const c = Math.floor(Math.random() * MAP_DIM);
      if (grid[r][c] !== 0) continue;
      if (r <= 2 && c <= 2) continue; // Not near player start
      if (r >= MAP_DIM - 2 && c >= MAP_DIM - 2) continue; // Not at goal
      enemies.push({
        x: c + 0.5, y: r + 0.5,
        hp: 2, alive: true, hitFlash: 0,
        speed: 0.015 + Math.random() * 0.01,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderTimer: Math.floor(Math.random() * 60),
        attackCooldown: Math.floor(Math.random() * 30),
      });
    }

    enemiesRef.current = enemies;
    keysRef.current.clear();
    shootAnimRef.current = 0;
    damageFlashRef.current = 0;
    setEnemiesLeft(enemies.length);
  }, []);

  // Game loop and input
  useEffect(() => {
    if (!isPlaying || showVictory) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grid = gridRef.current;

    const isWall = (x: number, y: number) => {
      const mx = Math.floor(x);
      const my = Math.floor(y);
      if (mx < 0 || mx >= MAP_DIM || my < 0 || my >= MAP_DIM) return true;
      return grid[my][mx] > 0;
    };

    const updatePlayer = () => {
      const p = playerRef.current;
      const keys = keysRef.current;
      let mx = 0, my = 0;

      if (keys.has('w') || keys.has('arrowup') || keys.has('forward')) { mx += p.dirX; my += p.dirY; }
      if (keys.has('s') || keys.has('arrowdown') || keys.has('backward')) { mx -= p.dirX; my -= p.dirY; }
      if (keys.has('a') || keys.has('left')) { mx -= p.planeY; my += p.planeX; }
      if (keys.has('d') || keys.has('right')) { mx += p.planeY; my -= p.planeX; }
      if (keys.has('arrowleft')) { mx -= p.planeY; my += p.planeX; }
      if (keys.has('arrowright')) { mx += p.planeY; my -= p.planeX; }

      const len = Math.sqrt(mx * mx + my * my);
      if (len > 0) {
        mx = (mx / len) * MOVE_SPEED;
        my = (my / len) * MOVE_SPEED;
        if (!isWall(p.x + mx, p.y)) p.x += mx;
        if (!isWall(p.x, p.y + my)) p.y += my;
      }
    };

    const updateEnemies = () => {
      const p = playerRef.current;
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (e.hitFlash > 0) e.hitFlash--;
        if (e.attackCooldown > 0) e.attackCooldown--;
        e.wanderTimer++;
        if (e.wanderTimer > 40 + Math.random() * 60) {
          e.wanderAngle = Math.random() * Math.PI * 2;
          e.wanderTimer = 0;
        }

        const dx = p.x - e.x, dy = p.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let mvx: number, mvy: number;

        if (dist < 5) {
          mvx = dx / dist * e.speed;
          mvy = dy / dist * e.speed;
        } else {
          mvx = Math.cos(e.wanderAngle) * e.speed * 0.5;
          mvy = Math.sin(e.wanderAngle) * e.speed * 0.5;
        }

        if (!isWall(e.x + mvx, e.y)) e.x += mvx;
        if (!isWall(e.x, e.y + mvy)) e.y += mvy;

        if (dist < 3.0 && e.attackCooldown <= 0) {
          pop();
          e.attackCooldown = 55;
        }

        // Contact damage
        if (dist < 0.5) {
          damageFlashRef.current = 1.0;
          const kx = -dx / dist * 0.2, ky = -dy / dist * 0.2;
          if (!isWall(p.x + kx, p.y)) p.x += kx;
          if (!isWall(p.x, p.y + ky)) p.y += ky;
        }
      }
    };

    const handleShoot = () => {
      if (shootAnimRef.current > 0) return;
      shootAnimRef.current = 8;
      cameraShakeRef.current = 0.55;
      select();

      // Hitscan: check enemies near center of screen
      const p = playerRef.current;
      const zBuf = zBufferRef.current;
      const centerX = Math.floor(SCREEN_W / 2);

      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        const sx = e.x - p.x, sy = e.y - p.y;
        const invDet = 1.0 / (p.planeX * p.dirY - p.dirX * p.planeY);
        const tX = invDet * (p.dirY * sx - p.dirX * sy);
        const tY = invDet * (-p.planeY * sx + p.planeX * sy);
        if (tY <= 0.1) continue;

        const screenX = (SCREEN_W / 2) * (1 + tX / tY);
        const spriteSize = Math.abs(SCREEN_H / tY) * 0.4;

        if (Math.abs(screenX - SCREEN_W / 2) < spriteSize && tY < zBuf[centerX]) {
          e.hp--;
          e.hitFlash = 6;
          hit();
          if (e.hp <= 0) {
            e.alive = false;
            setEnemiesLeft(enemiesRef.current.filter(en => en.alive).length);
          }
          break;
        }
      }
    };

    const castRays = () => {
      const p = playerRef.current;
      const zBuf = zBufferRef.current;

      const shakeX = (Math.random() - 0.5) * cameraShakeRef.current * 6;
      const shakeY = (Math.random() - 0.5) * cameraShakeRef.current * 4;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Ceiling
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, SCREEN_H / 2);
      ceilGrad.addColorStop(0, '#0c1630');
      ceilGrad.addColorStop(0.45, '#1f4c87');
      ceilGrad.addColorStop(1, '#4b8ad9');
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H / 2);

      // Floor
      const floorGrad = ctx.createLinearGradient(0, SCREEN_H / 2, 0, SCREEN_H);
      floorGrad.addColorStop(0, '#3875a6');
      floorGrad.addColorStop(0.5, '#1f7ea7');
      floorGrad.addColorStop(1, '#11243d');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, SCREEN_H / 2, SCREEN_W, SCREEN_H / 2);

      for (let x = 0; x < SCREEN_W; x++) {
        const cameraX = 2 * x / SCREEN_W - 1;
        const rayDX = p.dirX + p.planeX * cameraX;
        const rayDY = p.dirY + p.planeY * cameraX;

        let mapX = Math.floor(p.x);
        let mapY = Math.floor(p.y);
        const dDX = Math.abs(1 / rayDX);
        const dDY = Math.abs(1 / rayDY);

        let stepX: number, stepY: number, sDX: number, sDY: number;
        if (rayDX < 0) { stepX = -1; sDX = (p.x - mapX) * dDX; }
        else { stepX = 1; sDX = (mapX + 1 - p.x) * dDX; }
        if (rayDY < 0) { stepY = -1; sDY = (p.y - mapY) * dDY; }
        else { stepY = 1; sDY = (mapY + 1 - p.y) * dDY; }

        let hit = false, side = 0;
        let guard = 0;
        while (!hit && guard++ < 64) {
          if (sDX < sDY) { sDX += dDX; mapX += stepX; side = 0; }
          else { sDY += dDY; mapY += stepY; side = 1; }
          if (mapX < 0 || mapX >= MAP_DIM || mapY < 0 || mapY >= MAP_DIM) { hit = true; break; }
          if (grid[mapY][mapX] > 0) hit = true;
        }

        let perpDist: number;
        if (side === 0) perpDist = (mapX - p.x + (1 - stepX) / 2) / rayDX;
        else perpDist = (mapY - p.y + (1 - stepY) / 2) / rayDY;
        if (perpDist < 0.01) perpDist = 0.01;

        zBuf[x] = perpDist;

        const lineH = Math.floor(SCREEN_H / perpDist);
        const drawStart = Math.max(0, -lineH / 2 + SCREEN_H / 2);
        const drawEnd = Math.min(SCREEN_H, lineH / 2 + SCREEN_H / 2);
        const wallHeight = drawEnd - drawStart;

        const stripe = Math.sin((mapX * 0.9 + mapY * 0.6 + x * 0.05)) * 0.5 + 0.5;
        const hue = 180 + Math.round((mapX * 18 + mapY * 12 + x * 0.12) % 180);
        const lightness = Math.max(48, 82 - perpDist * 2.6 + stripe * 10);
        const stripeBand = Math.sin((mapX + mapY) * 1.5 + x * 0.16) * 0.5 + 0.5;

        ctx.fillStyle = `hsl(${hue}, 86%, ${lightness}%)`;
        ctx.fillRect(x, drawStart, 1, wallHeight);

        if (stripeBand > 0.62) {
          ctx.fillStyle = `rgba(255,255,255,${0.16 + stripe * 0.18})`;
          ctx.fillRect(x, drawStart + 4, 1, Math.max(1, wallHeight * 0.42));
        }

        if (stripeBand < 0.38) {
          ctx.fillStyle = `rgba(0,0,0,${0.12 + (1 - stripe) * 0.12})`;
          ctx.fillRect(x, drawStart + Math.max(2, wallHeight * 0.32), 1, Math.max(1, wallHeight * 0.3));
        }
      }
    };

    const renderSprite = (sx: number, sy: number, emoji: string, color: string, baseSize: number) => {
      const p = playerRef.current;
      const zBuf = zBufferRef.current;
      const dx = sx - p.x, dy = sy - p.y;
      const invDet = 1.0 / (p.planeX * p.dirY - p.dirX * p.planeY);
      const tX = invDet * (p.dirY * dx - p.dirX * dy);
      const tY = invDet * (-p.planeY * dx + p.planeX * dy);

      if (tY <= 0.1) return;

      const screenX = (SCREEN_W / 2) * (1 + tX / tY);
      const size = Math.min(SCREEN_H, Math.abs(SCREEN_H / tY) * baseSize);
      const centerX = Math.floor(screenX);

      // Z-buffer check at center
      if (centerX < 0 || centerX >= SCREEN_W || tY >= zBuf[centerX]) return;

      const brightness = Math.max(0.25, 1 - tY / 12);
      const drawY = SCREEN_H / 2;

      ctx.save();
      ctx.globalAlpha = brightness;

      // Glow circle
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(screenX, drawY, size * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Emoji
      ctx.shadowBlur = 0;
      ctx.font = `${Math.floor(size * 0.5)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, screenX, drawY);

      ctx.restore();
    };

    const renderEnemies = () => {
      const p = playerRef.current;
      const sorted = enemiesRef.current
        .filter(e => e.alive)
        .map(e => ({ e, dist: (e.x - p.x) ** 2 + (e.y - p.y) ** 2 }))
        .sort((a, b) => b.dist - a.dist);

      for (const { e } of sorted) {
        const color = e.hitFlash > 0 ? '#ffffff' : '#ef4444';
        renderSprite(e.x, e.y, '👾', color, 0.5);

        // HP bar
        if (e.hp < 2) {
          const dx = e.x - p.x, dy = e.y - p.y;
          const invDet = 1.0 / (p.planeX * p.dirY - p.dirX * p.planeY);
          const tY = invDet * (-p.planeY * dx + p.planeX * dy);
          if (tY > 0.1) {
            const screenX = (SCREEN_W / 2) * (1 + (invDet * (p.dirY * dx - p.dirX * dy)) / tY);
            const size = Math.min(SCREEN_H, Math.abs(SCREEN_H / tY) * 0.5);
            const centerX = Math.floor(screenX);
            if (centerX >= 0 && centerX < SCREEN_W && tY < zBufferRef.current[centerX]) {
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.fillRect(screenX - size * 0.2, SCREEN_H / 2 - size * 0.3, size * 0.4, 3);
              ctx.fillStyle = '#facc15';
              ctx.fillRect(screenX - size * 0.2, SCREEN_H / 2 - size * 0.3, size * 0.4 * (e.hp / 2), 3);
            }
          }
        }
      }
    };

    const renderGift = () => {
      const g = goalRef.current;
      const pulse = 0.5 + 0.5 * Math.sin(timeRef.current * 4);
      renderSprite(g.x, g.y, '🎁', '#ffd700', 0.45 + pulse * 0.05);
    };

    const drawGun = () => {
      const cx = SCREEN_W / 2;
      const by = SCREEN_H;
      const anim = shootAnimRef.current;
      const recoil = anim > 0 ? (anim / 8) * 12 : 0;

      // Muzzle flash
      if (anim > 5) {
        const alpha = (anim - 5) / 3 * 0.5;
        ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx, by - 100 - recoil, 28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gun body
      ctx.fillStyle = '#2a2a3a';
      ctx.beginPath();
      ctx.moveTo(cx - 32, by);
      ctx.lineTo(cx - 28, by - 45 - recoil);
      ctx.lineTo(cx - 12, by - 58 - recoil);
      ctx.lineTo(cx + 12, by - 58 - recoil);
      ctx.lineTo(cx + 28, by - 45 - recoil);
      ctx.lineTo(cx + 32, by);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Barrel
      ctx.fillStyle = '#3a3a4a';
      ctx.fillRect(cx - 5, by - 88 - recoil, 10, 35);

      // Barrel tip glow
      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 3, by - 92 - recoil, 6, 6);
      ctx.shadowBlur = 0;

      // Hands
      ctx.fillStyle = '#ffe0d0';
      ctx.beginPath(); ctx.arc(cx - 22, by - 15 - recoil, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 22, by - 15 - recoil, 7, 0, Math.PI * 2); ctx.fill();
    };

    const drawCrosshair = () => {
      const cx = SCREEN_W / 2, cy = SCREEN_H / 2;
      ctx.strokeStyle = 'rgba(0, 220, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 220, 255, 0.8)';
      ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
    };

    const drawMiniMap = () => {
      const mapPx = 130;
      const cellPx = mapPx / MAP_DIM;
      const ox = 12, oy = 12;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(ox - 2, oy - 2, mapPx + 4, mapPx + 4);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox - 2, oy - 2, mapPx + 4, mapPx + 4);

      for (let r = 0; r < MAP_DIM; r++) {
        for (let c = 0; c < MAP_DIM; c++) {
          if (grid[r][c] > 0) {
            ctx.fillStyle = '#334155';
            ctx.fillRect(ox + c * cellPx, oy + r * cellPx, cellPx, cellPx);
          }
        }
      }

      // Goal
      const g = goalRef.current;
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(ox + g.x * cellPx, oy + g.y * cellPx, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Player
      const p = playerRef.current;
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(ox + p.x * cellPx, oy + p.y * cellPx, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Direction line
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox + p.x * cellPx, oy + p.y * cellPx);
      ctx.lineTo(ox + (p.x + p.dirX * 2) * cellPx, oy + (p.y + p.dirY * 2) * cellPx);
      ctx.stroke();
    };

    const drawNavArrow = () => {
      const p = playerRef.current;
      const g = goalRef.current;
      const dx = g.x - p.x, dy = g.y - p.y;
      const angle = Math.atan2(dy, dx);
      const playerAngle = Math.atan2(p.dirY, p.dirX);
      let relAngle = angle - playerAngle;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;

      const cx = SCREEN_W / 2, cy = 28;
      const dist = Math.sqrt(dx * dx + dy * dy);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(relAngle);
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ffd700';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(dist)}m`, cx, 48);
    };

    const drawHUD = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(SCREEN_W - 160, 12, 148, 28);
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`👾 ${enemiesRef.current.filter(e => e.alive).length}`, SCREEN_W - 148, 30);
      ctx.fillStyle = '#00d4ff';
      ctx.fillText(`FPS Maze`, SCREEN_W - 80, 30);
    };

    const drawDamageFlash = () => {
      if (damageFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlashRef.current * 0.25})`;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        damageFlashRef.current *= 0.88;
        if (damageFlashRef.current < 0.01) damageFlashRef.current = 0;
      }
    };

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current || showVictory) return;
      const k = e.key.toLowerCase();
      keysRef.current.add(k);
      if ((k === 'j' || k === 'f') && pointerLockedRef.current) {
        handleShoot();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      const sensitivity = 0.0022;
      const angle = e.movementX * sensitivity;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const p = playerRef.current;
      const oldDX = p.dirX;
      p.dirX = p.dirX * cosA - p.dirY * sinA;
      p.dirY = oldDX * sinA + p.dirY * cosA;
      const oldPX = p.planeX;
      p.planeX = p.planeX * cosA - p.planeY * sinA;
      p.planeY = oldPX * sinA + p.planeY * cosA;
    };
    const handleMouseDown = () => {
      if (!isPlayingRef.current || showVictory) return;
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
      }
      handleShoot();
    };
    const handlePointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === canvas);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Game loop
    const loop = () => {
      if (!isPlayingRef.current) return;
      timeRef.current += 0.016;

      if (shootAnimRef.current > 0) shootAnimRef.current--;
      cameraShakeRef.current *= 0.88;

      const shouldMove = pointerLockedRef.current || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
      if (shouldMove) {
        updatePlayer();
        updateEnemies();
        if (keysRef.current.has('shoot') && shootAnimRef.current <= 0) {
          handleShoot();
        }
      }

      castRays();
      renderGift();
      renderEnemies();
      drawGun();
      drawCrosshair();
      drawDamageFlash();
      drawMiniMap();
      drawNavArrow();
      drawHUD();
      ctx.restore();

      // Check gift collection
      const p = playerRef.current;
      const g = goalRef.current;
      const dx = p.x - g.x, dy = p.y - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < 0.6) {
        playVictory();
        setShowVictory(true);
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        return;
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, showVictory, hit, select, playVictory]);

  // Mouse hold for shooting
  useEffect(() => {
    const handleMouseDown = () => {
      if (isPlayingRef.current && pointerLockedRef.current) {
        keysRef.current.add('shoot');
      }
    };
    const handleMouseUp = () => { keysRef.current.delete('shoot'); };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleStart = () => {
    initLevel();
    setIsPlaying(true);
    const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    if (!isTouchDevice) {
      setTimeout(() => {
        canvasRef.current?.requestPointerLock();
      }, 100);
    }
  };

  const handleRestart = () => {
    initLevel();
    setShowVictory(false);
    setIsPlaying(true);
    const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    if (!isTouchDevice) {
      setTimeout(() => {
        canvasRef.current?.requestPointerLock();
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-charcoal flex flex-col items-center justify-start p-2 md:p-4 md:justify-center">
      <div className="mb-2 text-center">
        <h1 className="text-xl md:text-3xl font-bold text-white font-display mb-1">
          <span className="gradient-text">3D迷宫探险 - 第三关</span>
        </h1>
        <p className="text-silver-gray/50 text-xs md:text-sm">
          {pointerLocked ? 'WASD移动 / 鼠标转向 / 点击或J、F射击' : '点击画面开始游戏'}
        </p>
      </div>

      <div className="relative" style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}>
        <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: SCREEN_W, height: SCREEN_H }}>
          <canvas
            ref={canvasRef}
            width={SCREEN_W}
            height={SCREEN_H}
            className="border-2 border-neon-purple/30 rounded-lg shadow-lg shadow-neon-purple/20 block cursor-crosshair"
          />

          {!isPlaying && !showVictory && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-full hover:scale-105 transition-transform"
              >
                <Play className="w-6 h-6" />
                进入3D迷宫
              </button>
              <p className="text-silver-gray mt-4 text-sm">在3D迷宫中找到礼物！</p>
              <p className="text-silver-gray/50 mt-1 text-xs">WASD移动 / 鼠标转向 / 点击或J、F射击</p>
              <p className="text-silver-gray/50 mt-1 text-xs">左上角小地图和顶部箭头指引方向</p>
              <p className="text-silver-gray/50 mt-1 text-xs">碰到金色礼物即通关！</p>
            </div>
          )}

          {isPlaying && !pointerLocked && !showVictory && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg cursor-pointer"
              onClick={() => canvasRef.current?.requestPointerLock()}
            >
              <p className="text-white text-lg font-bold mb-2">点击继续游戏</p>
              <p className="text-silver-gray/50 text-xs">鼠标控制视角，ESC暂停</p>
            </div>
          )}

          {showVictory && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center" style={{ width: '100%' }}>
                <Star className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-4xl font-bold text-white font-display mb-2 gradient-text">
                  🎉 全部通关! 🎉
                </h2>
                <p className="text-silver-gray mb-2">你完成了所有关卡！</p>
                <p className="text-light-gray mb-8">这是给你的终极惊喜</p>
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
          <span>W/S 前后</span>
          <span>•</span>
          <span>A/D 左右</span>
          <span>•</span>
          <span>射击键：火焰</span>
        </div>
        <button
          onTouchStart={handleTouchStart('forward')}
          onTouchEnd={handleTouchEnd('forward')}
          onTouchCancel={handleTouchEnd('forward')}
          onMouseDown={handleTouchStart('forward')}
          onMouseUp={handleTouchEnd('forward')}
          onMouseLeave={handleTouchEnd('forward')}
          className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          aria-label="前进"
        >
          <span className="text-2xl">⬆️</span>
        </button>
        <button
          onTouchStart={handleTouchStart('left')}
          onTouchEnd={handleTouchEnd('left')}
          onTouchCancel={handleTouchEnd('left')}
          onMouseDown={handleTouchStart('left')}
          onMouseUp={handleTouchEnd('left')}
          onMouseLeave={handleTouchEnd('left')}
          className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          aria-label="向左平移"
        >
          <span className="text-2xl">A</span>
        </button>
        <button
          onTouchStart={handleTouchStart('right')}
          onTouchEnd={handleTouchEnd('right')}
          onTouchCancel={handleTouchEnd('right')}
          onMouseDown={handleTouchStart('right')}
          onMouseUp={handleTouchEnd('right')}
          onMouseLeave={handleTouchEnd('right')}
          className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          aria-label="向右平移"
        >
          <span className="text-2xl">D</span>
        </button>
        <button
          onTouchStart={handleTouchStart('backward')}
          onTouchEnd={handleTouchEnd('backward')}
          onTouchCancel={handleTouchEnd('backward')}
          onMouseDown={handleTouchStart('backward')}
          onMouseUp={handleTouchEnd('backward')}
          onMouseLeave={handleTouchEnd('backward')}
          className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          aria-label="后退"
        >
          <span className="text-2xl">⬇️</span>
        </button>
        <button
          onTouchStart={handleTouchStart('shoot')}
          onTouchEnd={handleTouchEnd('shoot')}
          onTouchCancel={handleTouchEnd('shoot')}
          onMouseDown={handleTouchStart('shoot')}
          onMouseUp={handleTouchEnd('shoot')}
          onMouseLeave={handleTouchEnd('shoot')}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center text-white active:scale-95 transition-transform touch-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          aria-label="射击"
        >
          <span className="text-2xl">🔥</span>
        </button>
      </div>

      <div className="mt-3 flex gap-4">
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base"
        >
          <RotateCcw className="w-4 h-4" />
          重新开始
        </button>
      </div>
    </div>
  );
};

export default FPSGame;
