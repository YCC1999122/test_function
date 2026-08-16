import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const W = 800;
const H = 500;
const PADDLE_R = 30;
const PUCK_R = 13;
const WIN_SCORE = 3;
const FRICTION = 0.992;
const MAX_SPEED = 13;
const GOAL_W = 140;
const AI_SPEED = 5.2;

interface Paddle {
  x: number;
  y: number;
}

interface Puck {
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

const HockeyGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory'>('menu');
  const [score, setScore] = useState({ player: 0, ai: 0 });
  const [scale, setScale] = useState(1);

  const playerRef = useRef<Paddle>({ x: W / 2, y: H - 80 });
  const aiRef = useRef<Paddle>({ x: W / 2, y: 80 });
  const puckRef = useRef<Puck>({ x: W / 2, y: H / 2, vx: 0, vy: 0 });
  const scoreRef = useRef({ player: 0, ai: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<{ x: number; y: number }>({ x: W / 2, y: H - 80 });
  const gameStateRef = useRef(gameState);
  const frameRef = useRef(0);

  const { hit, star, victory, select } = useGameAudio();

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

  const resetPuck = useCallback(() => {
    const puck = puckRef.current;
    puck.x = W / 2;
    puck.y = H / 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = 5;
    puck.vx = Math.cos(angle) * speed;
    puck.vy = Math.sin(angle) * speed;
  }, []);

  const initGame = useCallback(() => {
    playerRef.current = { x: W / 2, y: H - 80 };
    aiRef.current = { x: W / 2, y: 80 };
    mouseRef.current = { x: W / 2, y: H - 80 };
    scoreRef.current = { player: 0, ai: 0 };
    setScore({ player: 0, ai: 0 });
    particlesRef.current = [];
    keysRef.current.clear();
    resetPuck();
  }, [resetPuck]);

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
      frameRef.current++;

      const player = playerRef.current;
      const ai = aiRef.current;
      const puck = puckRef.current;
      const particles = particlesRef.current;
      const keys = keysRef.current;

      // ── Player control (mouse + keyboard) ──
      let kx = 0, ky = 0;
      if (keys.has('arrowleft') || keys.has('a')) kx = -1;
      if (keys.has('arrowright') || keys.has('d')) kx = 1;
      if (keys.has('arrowup') || keys.has('w')) ky = -1;
      if (keys.has('arrowdown') || keys.has('s')) ky = 1;

      if (kx !== 0 || ky !== 0) {
        player.x += kx * 7;
        player.y += ky * 7;
      } else {
        // Follow mouse
        player.x += (mouseRef.current.x - player.x) * 0.4;
        player.y += (mouseRef.current.y - player.y) * 0.4;
      }

      // Clamp player to bottom half
      player.x = Math.max(PADDLE_R, Math.min(W - PADDLE_R, player.x));
      player.y = Math.max(H / 2 + PADDLE_R, Math.min(H - PADDLE_R, player.y));

      // ── AI control ──
      const targetX = puck.x;
      const targetY = puck.y;
      const dx = targetX - ai.x;
      const dy = targetY - ai.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const step = Math.min(AI_SPEED, dist);
        ai.x += (dx / dist) * step;
        ai.y += (dy / dist) * step * 0.6;
      }
      ai.x = Math.max(PADDLE_R, Math.min(W - PADDLE_R, ai.x));
      ai.y = Math.max(PADDLE_R, Math.min(H / 2 - PADDLE_R, ai.y));

      // ── Puck physics ──
      puck.x += puck.vx;
      puck.y += puck.vy;
      puck.vx *= FRICTION;
      puck.vy *= FRICTION;

      // Wall bounce (left/right)
      if (puck.x < PUCK_R) { puck.x = PUCK_R; puck.vx = Math.abs(puck.vx); spawnParticles(puck.x, puck.y, '#7dd3fc', 3); }
      if (puck.x > W - PUCK_R) { puck.x = W - PUCK_R; puck.vx = -Math.abs(puck.vx); spawnParticles(puck.x, puck.y, '#7dd3fc', 3); }

      // Top/bottom wall (except goals)
      if (puck.y < PUCK_R) {
        if (puck.x > W / 2 - GOAL_W / 2 && puck.x < W / 2 + GOAL_W / 2) {
          // Player scores (top goal)
          scoreRef.current.player++;
          setScore({ ...scoreRef.current });
          star();
          spawnParticles(puck.x, 20, '#fbbf24', 25);
          resetPuck();
          if (scoreRef.current.player >= WIN_SCORE) {
            victory();
            gameStateRef.current = 'victory';
            setGameState('victory');
          }
        } else {
          puck.y = PUCK_R; puck.vy = Math.abs(puck.vy);
        }
      }
      if (puck.y > H - PUCK_R) {
        if (puck.x > W / 2 - GOAL_W / 2 && puck.x < W / 2 + GOAL_W / 2) {
          // AI scores (bottom goal)
          scoreRef.current.ai++;
          setScore({ ...scoreRef.current });
          spawnParticles(puck.x, H - 20, '#f87171', 25);
          resetPuck();
        } else {
          puck.y = H - PUCK_R; puck.vy = -Math.abs(puck.vy);
        }
      }

      // ── Paddle collision ──
      const hitPaddle = (paddle: Paddle) => {
        const pdx = puck.x - paddle.x;
        const pdy = puck.y - paddle.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        const minDist = PADDLE_R + PUCK_R;
        if (pdist < minDist && pdist > 0) {
          // Normalize
          const nx = pdx / pdist;
          const ny = pdy / pdist;
          // Push puck out
          puck.x = paddle.x + nx * minDist;
          puck.y = paddle.y + ny * minDist;
          // Reflect velocity
          const dot = puck.vx * nx + puck.vy * ny;
          let speed = Math.min(Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy) + 2, MAX_SPEED);
          speed = Math.max(speed, 7);
          puck.vx = (puck.vx - 2 * dot * nx) * 0.5 + nx * speed * 0.5;
          puck.vy = (puck.vy - 2 * dot * ny) * 0.5 + ny * speed * 0.5;
          spawnParticles(puck.x, puck.y, '#ffffff', 8);
          hit();
        }
      };
      hitPaddle(player);
      hitPaddle(ai);

      // ── Particles update ──
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

      // Ice rink
      const ice = ctx.createLinearGradient(0, 0, 0, H);
      ice.addColorStop(0, '#0b2545');
      ice.addColorStop(0.5, '#134074');
      ice.addColorStop(1, '#0b2545');
      ctx.fillStyle = ice;
      ctx.fillRect(0, 0, W, H);

      // Ice texture (subtle lines)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 50);
        ctx.lineTo(W, i * 50);
        ctx.stroke();
      }

      // Rink border
      ctx.strokeStyle = 'rgba(125,211,252,0.5)';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, W - 20, H - 20);

      // Center line & circle
      ctx.strokeStyle = 'rgba(125,211,252,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, H / 2);
      ctx.lineTo(W - 10, H / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(125,211,252,0.5)';
      ctx.fill();

      // Goals
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(W / 2 - GOAL_W / 2, 0, GOAL_W, 12);
      ctx.fillRect(W / 2 - GOAL_W / 2, H - 12, GOAL_W, 12);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - GOAL_W / 2, 0, GOAL_W, 12);
      ctx.strokeStyle = '#f87171';
      ctx.strokeRect(W / 2 - GOAL_W / 2, H - 12, GOAL_W, 12);

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

      // AI paddle
      ctx.save();
      ctx.shadowColor = '#f87171';
      ctx.shadowBlur = 15;
      const aiGrad = ctx.createRadialGradient(ai.x - 5, ai.y - 5, 5, ai.x, ai.y, PADDLE_R);
      aiGrad.addColorStop(0, '#fca5a5');
      aiGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = aiGrad;
      ctx.beginPath();
      ctx.arc(ai.x, ai.y, PADDLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Player paddle
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      const pGrad = ctx.createRadialGradient(player.x - 5, player.y - 5, 5, player.x, player.y, PADDLE_R);
      pGrad.addColorStop(0, '#7dd3fc');
      pGrad.addColorStop(1, '#2563eb');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PADDLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Puck
      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 20;
      const puckGrad = ctx.createRadialGradient(puck.x - 3, puck.y - 3, 2, puck.x, puck.y, PUCK_R);
      puckGrad.addColorStop(0, '#ffffff');
      puckGrad.addColorStop(0.5, '#fbbf24');
      puckGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = puckGrad;
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, PUCK_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Score
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('你: ' + scoreRef.current.player, 30, 45);
      ctx.fillStyle = '#f87171';
      ctx.textAlign = 'right';
      ctx.fillText('AI: ' + scoreRef.current.ai, W - 30, 45);

      // Goal text
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px monospace';
      ctx.fillText('先进 ' + WIN_SCORE + ' 球获胜', W / 2, H - 30);
      ctx.textAlign = 'left';

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState, resetPuck, hit, star, victory]);

  // Input
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      mouseRef.current = { x, y };
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

  // Victory: notify parent after delay
  useEffect(() => {
    if (gameState !== 'victory') return;
    const t = setTimeout(() => {
      onCompleteGame();
    }, 2000);
    return () => clearTimeout(t);
  }, [gameState, onCompleteGame]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-blue-950 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
          <span className="text-cyan-400">🏒</span> 冰球大作战
        </h1>
        <p className="text-slate-400 text-sm">鼠标或方向键移动球杆 · 先进 {WIN_SCORE} 球获胜</p>
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
            <div className="text-5xl mb-4">🏒</div>
            <h2 className="text-3xl font-bold text-white mb-2">冰球大作战</h2>
            <p className="text-slate-300 mb-4 text-sm">守住球门，攻破 AI 的球门</p>
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
            <p className="text-slate-500 text-xs mt-4">鼠标移动 / 方向键操控</p>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
            <Trophy size={48} className="text-yellow-400 mb-3" />
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">获胜!</h2>
            <p className="text-white mb-1">你以 {score.player} : {score.ai} 战胜了 AI</p>
            <p className="text-slate-400 text-sm">正在进入下一关...</p>
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

export default HockeyGame;
