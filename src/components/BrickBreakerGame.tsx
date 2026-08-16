import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const W = 800;
const H = 500;
const PADDLE_W = 100;
const PADDLE_H = 16;
const PADDLE_Y = H - 45;
const PADDLE_MAX_W = 210;
const BALL_R = 7;
const BALL_SPEED = 6.5;
const MAX_BALL_SPEED = 13;
const LIVES = 3;

// 砖块网格（约 500 块）
const GRID_COLS = 26;
const GRID_ROWS = 20;
const BRICK_W = 27;
const BRICK_H = 13;
const BRICK_GAP = 2;
const BRICK_TOP = 30;
const BRICK_LEFT = (W - (GRID_COLS * BRICK_W + (GRID_COLS - 1) * BRICK_GAP)) / 2;

// 中央井道（入口 + 深度）
const WELL_COL_L = 12;
const WELL_COL_R = 13;
const SHAFT_START = GRID_ROWS - 11; // 井道深度（竖井起始行）

const FRAGILE_COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185'];
const HARD_COLOR = '#475569';

type PowerUpType = 'multiball' | 'double' | 'widen';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  color: string;
  hp: number;
  maxHp: number;
  hard: boolean;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const BrickBreakerGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [scale, setScale] = useState(1);

  const paddleRef = useRef({ x: W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H });
  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef(W / 2);
  const gameStateRef = useRef(gameState);
  const ballStuckRef = useRef(true);
  const widenTimerRef = useRef(0);

  const { hit, star, victory, select, pop } = useGameAudio();

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min((window.innerWidth - 32) / W, (window.innerHeight - 160) / H, 1.2);
      setScale(s > 0.1 ? s : 0.1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // 要塞布局：外层坚硬砖块(10血)包裹内层易碎砖块，中央井道深入
  const createBricks = useCallback((): Brick[] => {
    const bricks: Brick[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        // 底部入口缺口
        const isEntrance = row === GRID_ROWS - 1 && col >= WELL_COL_L && col <= WELL_COL_R;
        // 竖井通道（有深度）
        const isShaft = col >= WELL_COL_L && col <= WELL_COL_R && row >= SHAFT_START && row <= GRID_ROWS - 2;
        if (isEntrance || isShaft) continue; // 空
        // 外层边框
        const isBorder = row === 0 || row === GRID_ROWS - 1 || col === 0 || col === GRID_COLS - 1;
        // 井壁（竖井两侧硬砖）
        const isWellWall = (col === WELL_COL_L - 1 || col === WELL_COL_R + 1) && row >= SHAFT_START && row <= GRID_ROWS - 1;
        const hard = isBorder || isWellWall;
        bricks.push({
          x: BRICK_LEFT + col * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          alive: true,
          color: hard ? HARD_COLOR : FRAGILE_COLORS[row % FRAGILE_COLORS.length],
          hp: hard ? 10 : 1,
          maxHp: hard ? 10 : 1,
          hard,
        });
      }
    }
    return bricks;
  }, []);

  const resetBall = useCallback(() => {
    ballsRef.current = [{ x: W / 2, y: PADDLE_Y - BALL_R - 5, vx: 0, vy: 0 }];
    ballStuckRef.current = true;
  }, []);

  const launchBall = useCallback(() => {
    if (!ballStuckRef.current) return;
    ballStuckRef.current = false;
    const ball = ballsRef.current[0];
    ball.vx = (Math.random() - 0.5) * 4;
    ball.vy = -BALL_SPEED;
  }, []);

  const spawnPowerUp = useCallback((x: number, y: number) => {
    const r = Math.random();
    let type: PowerUpType;
    if (r < 0.4) type = 'multiball';
    else if (r < 0.6) type = 'double';
    else type = 'widen';
    powerUpsRef.current.push({ x, y, type, vy: 2.2 });
  }, []);

  const applyPowerUp = useCallback((type: PowerUpType) => {
    const paddle = paddleRef.current;
    if (type === 'widen') {
      paddle.w = Math.min(PADDLE_MAX_W, paddle.w + 60);
      widenTimerRef.current = 600; // 10 秒后恢复
    } else if (type === 'multiball') {
      // 每个球在其当前位置立刻分身
      const cur = ballsRef.current.slice();
      for (const b of cur) {
        ballsRef.current.push({
          x: b.x, y: b.y,
          vx: -b.vx + (Math.random() - 0.5) * 1.5,
          vy: b.vy,
        });
      }
    } else if (type === 'double') {
      // 每个球在其实时位置 +2
      const cur = ballsRef.current.slice();
      for (const b of cur) {
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = Math.max(4, Math.sqrt(b.vx * b.vx + b.vy * b.vy));
          ballsRef.current.push({
            x: b.x, y: b.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
          });
        }
      }
    }
  }, []);

  const initGame = useCallback(() => {
    paddleRef.current = { x: W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
    bricksRef.current = createBricks();
    powerUpsRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    livesRef.current = LIVES;
    widenTimerRef.current = 0;
    setScore(0);
    setLives(LIVES);
    resetBall();
  }, [createBricks, resetBall]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 20 + Math.random() * 15,
          maxLife: 35,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    };

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;

      const paddle = paddleRef.current;
      const balls = ballsRef.current;
      const bricks = bricksRef.current;
      const powerUps = powerUpsRef.current;
      const particles = particlesRef.current;
      const keys = keysRef.current;

      // ── 挡板控制 ──
      let dir = 0;
      if (keys.has('arrowleft') || keys.has('a')) dir = -1;
      if (keys.has('arrowright') || keys.has('d')) dir = 1;
      if (dir !== 0) {
        paddle.x += dir * 9;
      } else {
        paddle.x += (mouseRef.current - paddle.w / 2 - paddle.x) * 0.35;
      }
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

      // 加宽计时恢复
      if (widenTimerRef.current > 0) {
        widenTimerRef.current--;
        if (widenTimerRef.current <= 0) paddle.w = PADDLE_W;
      }

      // ── 发球 ──
      if (ballStuckRef.current) {
        balls[0].x = paddle.x + paddle.w / 2;
        balls[0].y = paddle.y - BALL_R - 5;
        if (keys.has(' ') || keys.has('arrowup') || keys.has('w')) {
          keys.delete(' ');
          keys.delete('arrowup');
          keys.delete('w');
          launchBall();
        }
      } else {
        // ── 球更新 ──
        for (let bi = balls.length - 1; bi >= 0; bi--) {
          const ball = balls[bi];
          ball.x += ball.vx;
          ball.y += ball.vy;

          // 墙壁反弹
          if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
          if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
          if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

          // 掉落 → 移除球
          if (ball.y > H + BALL_R) {
            balls.splice(bi, 1);
            continue;
          }

          // 挡板碰撞
          if (
            ball.vy > 0 &&
            ball.y + BALL_R >= paddle.y &&
            ball.y + BALL_R <= paddle.y + paddle.h + 8 &&
            ball.x >= paddle.x - BALL_R &&
            ball.x <= paddle.x + paddle.w + BALL_R
          ) {
            const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
            const angle = Math.max(-1, Math.min(1, hitPos)) * (Math.PI / 3);
            const speed = Math.min(
              Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) + 0.25,
              MAX_BALL_SPEED
            );
            ball.vx = speed * Math.sin(angle);
            ball.vy = -speed * Math.cos(angle);
            ball.y = paddle.y - BALL_R;
            hit();
          }

          // 砖块碰撞
          for (const brick of bricks) {
            if (!brick.alive) continue;
            if (
              ball.x + BALL_R > brick.x &&
              ball.x - BALL_R < brick.x + brick.w &&
              ball.y + BALL_R > brick.y &&
              ball.y - BALL_R < brick.y + brick.h
            ) {
              const overlapLeft = ball.x + BALL_R - brick.x;
              const overlapRight = brick.x + brick.w - (ball.x - BALL_R);
              const overlapTop = ball.y + BALL_R - brick.y;
              const overlapBottom = brick.y + brick.h - (ball.y - BALL_R);
              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
              if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                ball.vx = -ball.vx;
              } else {
                ball.vy = -ball.vy;
              }

              brick.hp--;
              if (brick.hp <= 0) {
                brick.alive = false;
                scoreRef.current += brick.hard ? 30 : 10;
                setScore(scoreRef.current);
                spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 10);
                // 掉落 buff
                const dropChance = brick.hard ? 0.4 : 0.14;
                if (Math.random() < dropChance) {
                  spawnPowerUp(brick.x + brick.w / 2, brick.y + brick.h / 2);
                }
                hit();
              } else {
                spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#94a3b8', 3);
              }
              break;
            }
          }
        }

        // 所有球掉落 → 扣命
        if (balls.length === 0) {
          livesRef.current--;
          setLives(livesRef.current);
          pop();
          if (livesRef.current <= 0) {
            gameStateRef.current = 'gameover';
            setGameState('gameover');
            return;
          }
          resetBall();
        }
      }

      // ── 掉落物更新 ──
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.y += pu.vy;
        // 挡板接住
        if (
          pu.y + 12 >= paddle.y &&
          pu.y <= paddle.y + paddle.h &&
          pu.x >= paddle.x &&
          pu.x <= paddle.x + paddle.w
        ) {
          powerUps.splice(i, 1);
          applyPowerUp(pu.type);
          star();
          spawnParticles(pu.x, paddle.y, '#fbbf24', 12);
          continue;
        }
        // 落出屏幕
        if (pu.y > H + 20) powerUps.splice(i, 1);
      }

      // ── 胜利判定 ──
      if (!bricks.some((b) => b.alive)) {
        victory();
        gameStateRef.current = 'victory';
        setGameState('victory');
        return;
      }

      // ── 粒子更新 ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.1;
        pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // ── 渲染 ──
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0b2545');
      bg.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 砖块
      for (const brick of bricks) {
        if (!brick.alive) continue;
        if (brick.hard) {
          // 坚硬砖块：金属质感
          const g = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
          g.addColorStop(0, '#64748b');
          g.addColorStop(1, '#334155');
          ctx.fillStyle = g;
          ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
          // 铆钉
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(brick.x + 4, brick.y + 4, 3, 3);
          ctx.fillRect(brick.x + brick.w - 7, brick.y + 4, 3, 3);
          ctx.fillRect(brick.x + 4, brick.y + brick.h - 7, 3, 3);
          ctx.fillRect(brick.x + brick.w - 7, brick.y + brick.h - 7, 3, 3);
        } else {
          const g = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
          g.addColorStop(0, brick.color);
          g.addColorStop(1, '#1e1b4b');
          ctx.fillStyle = g;
          ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
        }
        // 裂纹（受击后）
        if (brick.hp < brick.maxHp) {
          ctx.strokeStyle = brick.hard ? '#f8fafc' : 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(brick.x + brick.w * 0.3, brick.y);
          ctx.lineTo(brick.x + brick.w * 0.55, brick.y + brick.h * 0.5);
          ctx.lineTo(brick.x + brick.w * 0.35, brick.y + brick.h);
          ctx.stroke();
          if (brick.hp < brick.maxHp - 1) {
            ctx.beginPath();
            ctx.moveTo(brick.x + brick.w * 0.7, brick.y);
            ctx.lineTo(brick.x + brick.w * 0.5, brick.y + brick.h * 0.5);
            ctx.lineTo(brick.x + brick.w * 0.75, brick.y + brick.h);
            ctx.stroke();
          }
        }
      }

      // 粒子
      for (const pt of particles) {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 掉落物
      for (const pu of powerUps) {
        const color = pu.type === 'multiball' ? '#38bdf8' : pu.type === 'double' ? '#22c55e' : '#f97316';
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pu.type === 'multiball' ? '+' : pu.type === 'double' ? 'x2' : '宽', pu.x, pu.y + 4);
        ctx.textAlign = 'left';
      }

      // 挡板
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      const pGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
      pGrad.addColorStop(0, '#7dd3fc');
      pGrad.addColorStop(1, '#2563eb');
      ctx.fillStyle = pGrad;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.restore();

      // 球
      for (const ball of balls) {
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 18;
        const bGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
        bGrad.addColorStop(0, '#ffffff');
        bGrad.addColorStop(0.5, '#fbbf24');
        bGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // HUD
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('得分: ' + scoreRef.current, 20, 32);
      ctx.textAlign = 'right';
      ctx.fillText('生命: ' + '❤'.repeat(Math.max(0, livesRef.current)), W - 20, 32);
      ctx.textAlign = 'left';

      if (ballStuckRef.current) {
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('按 空格 / ↑ 发射弹珠', W / 2, H - 80);
        ctx.textAlign = 'left';
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState, launchBall, resetBall, spawnPowerUp, applyPowerUp, hit, star, victory, pop]);

  // Input
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = (e.clientX - rect.left) / scale;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (gameStateRef.current === 'menu' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        select();
        initGame();
        setGameState('playing');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [scale, select, initGame]);

  // Victory: notify parent
  useEffect(() => {
    if (gameState !== 'victory') return;
    const t = setTimeout(() => onCompleteGame(), 2000);
    return () => clearTimeout(t);
  }, [gameState, onCompleteGame]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-blue-950 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
          <span className="text-yellow-400">🧱</span> 弹珠打砖块
        </h1>
        <p className="text-slate-400 text-sm">攻破外层坚硬砖块 · 打碎全部砖块过关 · 接住掉落 Buff</p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            width: W * scale,
            height: H * scale,
            borderRadius: '16px',
            boxShadow: '0 0 40px rgba(56,189,248,0.4)',
            cursor: 'none',
          }}
        />

        {gameState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-2xl">
            <div className="text-5xl mb-4">🧱</div>
            <h2 className="text-3xl font-bold text-white mb-2">弹珠打砖块</h2>
            <p className="text-slate-300 mb-1 text-sm">约 500 块砖，外层坚硬(10血)包裹内层易碎</p>
            <p className="text-slate-400 mb-4 text-sm">中央井道深入要塞，击碎砖块掉落 Buff：球分身 / 球翻倍 / 挡板变长</p>
            <button
              onClick={() => {
                select();
                initGame();
                setGameState('playing');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold hover:scale-105 transition-transform"
            >
              <Play size={18} /> 开始游戏
            </button>
            <p className="text-slate-500 text-xs mt-4">空格 / ↑ 发射弹珠</p>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
            <Trophy size={48} className="text-yellow-400 mb-3" />
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">过关!</h2>
            <p className="text-white mb-1">得分: {score}</p>
            <p className="text-slate-400 text-sm">正在进入下一关...</p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
            <div className="text-5xl mb-4">💔</div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">失败</h2>
            <p className="text-slate-300 mb-4 text-sm">生命用完了</p>
            <button
              onClick={() => {
                select();
                initGame();
                setGameState('playing');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold hover:scale-105 transition-transform"
            >
              <RotateCcw size={18} /> 重新挑战
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          initGame();
          setGameState('playing');
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-full glass-effect text-slate-200 hover:text-cyan-300 transition-colors text-sm"
      >
        <RotateCcw size={16} /> 重新开始
      </button>
    </div>
  );
};

export default BrickBreakerGame;
