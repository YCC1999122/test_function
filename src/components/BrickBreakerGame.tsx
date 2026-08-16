import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const W = 800;
const H = 500;
const PADDLE_W = 120;
const PADDLE_H = 16;
const PADDLE_Y = H - 45;
const BALL_R = 8;
const BALL_SPEED = 6.2;
const MAX_BALL_SPEED = 12;
const LIVES = 3;

const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const BRICK_W = 84;
const BRICK_H = 22;
const BRICK_GAP = 6;
const BRICK_TOP = 60;
const BRICK_LEFT = (W - (BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP)) / 2;

const ROW_COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fbbf24'];

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  color: string;
  hp: number;
  maxHp: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
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
  const ballRef = useRef<Ball>({ x: W / 2, y: PADDLE_Y - BALL_R - 5, vx: 0, vy: 0 });
  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef(W / 2);
  const gameStateRef = useRef(gameState);
  const ballStuckRef = useRef(true);

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

  const createBricks = useCallback((): Brick[] => {
    const bricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const hp = row >= BRICK_ROWS - 2 ? 2 : 1; // 底部两排需 2 次击打
        bricks.push({
          x: BRICK_LEFT + col * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          alive: true,
          color: ROW_COLORS[row],
          hp,
          maxHp: hp,
        });
      }
    }
    return bricks;
  }, []);

  const resetBall = useCallback(() => {
    const ball = ballRef.current;
    ball.x = W / 2;
    ball.y = PADDLE_Y - BALL_R - 5;
    ball.vx = 0;
    ball.vy = 0;
    ballStuckRef.current = true;
  }, []);

  const launchBall = useCallback(() => {
    if (!ballStuckRef.current) return;
    ballStuckRef.current = false;
    const ball = ballRef.current;
    ball.vx = (Math.random() - 0.5) * 4;
    ball.vy = -BALL_SPEED;
  }, []);

  const initGame = useCallback(() => {
    paddleRef.current = { x: W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
    bricksRef.current = createBricks();
    particlesRef.current = [];
    scoreRef.current = 0;
    livesRef.current = LIVES;
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
      const ball = ballRef.current;
      const bricks = bricksRef.current;
      const particles = particlesRef.current;
      const keys = keysRef.current;

      // ── Paddle control ──
      let dir = 0;
      if (keys.has('arrowleft') || keys.has('a')) dir = -1;
      if (keys.has('arrowright') || keys.has('d')) dir = 1;
      if (dir !== 0) {
        paddle.x += dir * 9;
      } else {
        paddle.x += (mouseRef.current - paddle.w / 2 - paddle.x) * 0.35;
      }
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

      // ── Ball (stuck to paddle until launch) ──
      if (ballStuckRef.current) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - BALL_R - 5;
        if (keys.has(' ') || keys.has('arrowup') || keys.has('w')) {
          keys.delete(' ');
          keys.delete('arrowup');
          keys.delete('w');
          launchBall();
        }
      } else {
        // ── Ball movement ──
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall bounce
        if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

        // Bottom → lose life
        if (ball.y > H + BALL_R) {
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

        // Paddle collision
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
            Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) + 0.3,
            MAX_BALL_SPEED
          );
          ball.vx = speed * Math.sin(angle);
          ball.vy = -speed * Math.cos(angle);
          ball.y = paddle.y - BALL_R;
          hit();
        }

        // Brick collision
        for (const brick of bricks) {
          if (!brick.alive) continue;
          if (
            ball.x + BALL_R > brick.x &&
            ball.x - BALL_R < brick.x + brick.w &&
            ball.y + BALL_R > brick.y &&
            ball.y - BALL_R < brick.y + brick.h
          ) {
            // Determine bounce side
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
              scoreRef.current += 10;
              setScore(scoreRef.current);
              spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 10);
              hit();
            } else {
              spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 4);
            }
            break;
          }
        }

        // Win check
        if (!bricks.some((b) => b.alive)) {
          victory();
          gameStateRef.current = 'victory';
          setGameState('victory');
          return;
        }
      }

      // ── Particles ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.1;
        pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // ── Render ──
      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0b2545');
      bg.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Bricks
      for (const brick of bricks) {
        if (!brick.alive) continue;
        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
        grad.addColorStop(0, brick.color);
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
        // 2HP bricks show crack
        if (brick.maxHp === 2 && brick.hp === 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.moveTo(brick.x + brick.w * 0.3, brick.y);
          ctx.lineTo(brick.x + brick.w * 0.5, brick.y + brick.h * 0.5);
          ctx.lineTo(brick.x + brick.w * 0.3, brick.y + brick.h);
          ctx.stroke();
        }
      }

      // Particles
      for (const pt of particles) {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Paddle
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      const pGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
      pGrad.addColorStop(0, '#7dd3fc');
      pGrad.addColorStop(1, '#2563eb');
      ctx.fillStyle = pGrad;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.restore();

      // Ball
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

      // HUD
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('得分: ' + scoreRef.current, 20, 32);
      ctx.textAlign = 'right';
      ctx.fillText('生命: ' + '❤'.repeat(Math.max(0, livesRef.current)), W - 20, 32);
      ctx.textAlign = 'left';

      // Launch hint
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
  }, [gameState, launchBall, resetBall, hit, star, victory, pop]);

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
        <p className="text-slate-400 text-sm">鼠标或方向键移动挡板 · 打碎所有砖块过关</p>
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
            <p className="text-slate-300 mb-4 text-sm">移动挡板反弹弹珠，打碎全部砖块</p>
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
