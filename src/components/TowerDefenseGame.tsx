import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Zap, Snowflake } from 'lucide-react';
import { useGameAudio } from './GameAudio';

const W = 800;
const H = 500;
const CELL = 40;
const PATH_HALF = 18;
const MAX_TOWERS = 12;

// 蛇形曲折路径（入口左侧 → 终点右侧，多转弯）
const WAYPOINTS: [number, number][] = [
  [-30, 55], [620, 55], [620, 135], [180, 135], [180, 215], [620, 215], [620, 295],
  [180, 295], [180, 375], [620, 375], [620, 455], [790, 455],
];

interface Seg { x1: number; y1: number; x2: number; y2: number; dx: number; dy: number; len: number; }
const SEGMENTS: Seg[] = [];
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const [x1, y1] = WAYPOINTS[i];
  const [x2, y2] = WAYPOINTS[i + 1];
  const dx = x2 - x1, dy = y2 - y1;
  SEGMENTS.push({ x1, y1, x2, y2, dx, dy, len: Math.hypot(dx, dy) });
}
const TOTAL_LEN = SEGMENTS.reduce((s, g) => s + g.len, 0);

function posAtDist(d: number) {
  let r = d;
  for (const g of SEGMENTS) {
    if (r <= g.len) {
      const t = r / g.len;
      return { x: g.x1 + g.dx * t, y: g.y1 + g.dy * t };
    }
    r -= g.len;
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return { x: last.x2, y: last.y2 };
}

function pointSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return Math.hypot(px - cx, py - cy);
}

function isOnPath(x: number, y: number) {
  for (const g of SEGMENTS) {
    if (pointSegDist(x, y, g.x1, g.y1, g.x2, g.y2) < PATH_HALF + 8) return true;
  }
  return false;
}

// 障碍物（墙体装饰，阻挡放置）
const OBSTACLES: { x: number; y: number; w: number; h: number }[] = [
  { x: 700, y: 95, w: 36, h: 36 },
  { x: 100, y: 175, w: 36, h: 36 },
  { x: 700, y: 255, w: 36, h: 36 },
  { x: 100, y: 335, w: 36, h: 36 },
  { x: 700, y: 415, w: 36, h: 36 },
];

function inObstacle(x: number, y: number) {
  return OBSTACLES.some((o) =>
    x > o.x - o.w / 2 && x < o.x + o.w / 2 && y > o.y - o.h / 2 && y < o.y + o.h / 2
  );
}

// 塔可放置的墙体网格点
const VALID_POINTS: { x: number; y: number }[] = [];
for (let cy = 0; cy < 12; cy++) {
  for (let cx = 0; cx < 20; cx++) {
    const x = 20 + cx * CELL;
    const y = 20 + cy * CELL;
    if (!isOnPath(x, y) && !inObstacle(x, y)) VALID_POINTS.push({ x, y });
  }
}

type TowerType = 'red' | 'blue';
type MonsterType = 'small' | 'medium' | 'large';

const TOWER_STATS = {
  red: { damage: 40, range: 130, cd: 24, color: '#ef4444', cost: 40 },
  blue: { damage: 8, range: 150, cd: 32, color: '#38bdf8', cost: 30 },
};

const MONSTER_STATS = {
  small: { hp: 40, speed: 1.4, radius: 9, color: '#4ade80', reward: 10, escape: 1 },
  medium: { hp: 110, speed: 1.0, radius: 15, color: '#fbbf24', reward: 20, escape: 2 },
  large: { hp: 280, speed: 0.65, radius: 24, color: '#c084fc', reward: 40, escape: 3 },
};

interface Tower {
  x: number; y: number;
  type: TowerType;
  cooldown: number;
}

interface Connection {
  a: number;
  b: number;
}

interface Monster {
  dist: number;
  hp: number;
  maxHp: number;
  type: MonsterType;
  slowTimer: number;
  alive: boolean;
}

interface Beam {
  x1: number; y1: number; x2: number; y2: number;
  life: number;
  color: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

type Phase = 'menu' | 'prepare' | 'wave' | 'victory' | 'defeat';

const buildWave = (): { delay: number; type: MonsterType }[] => {
  const q: { delay: number; type: MonsterType }[] = [];
  let t = 30;
  for (let i = 0; i < 12; i++) { q.push({ delay: t, type: 'small' }); t += 35; }
  for (let i = 0; i < 8; i++) { q.push({ delay: t, type: 'medium' }); t += 50; }
  for (let i = 0; i < 5; i++) { q.push({ delay: t, type: 'large' }); t += 80; }
  return q;
};

const TowerDefenseGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [money, setMoney] = useState(100);
  const [lives, setLives] = useState(10);
  const [scale, setScale] = useState(1);
  const [selected, setSelected] = useState<TowerType>('red');
  const [enemiesLeft, setEnemiesLeft] = useState(0);

  const towersRef = useRef<Tower[]>([]);
  const monstersRef = useRef<Monster[]>([]);
  const beamsRef = useRef<Beam[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const dragConnRef = useRef<{ from: number; x: number; y: number } | null>(null);
  const moneyRef = useRef(100);
  const livesRef = useRef(10);
  const phaseRef = useRef<Phase>('menu');
  const spawnQueueRef = useRef<{ delay: number; type: MonsterType }[]>([]);
  const spawnIndexRef = useRef(0);
  const waveFrameRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef(0);

  const { hit, pop, victory, select } = useGameAudio();

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min((window.innerWidth - 32) / W, (window.innerHeight - 160) / H, 1.2);
      setScale(s > 0.1 ? s : 0.1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const spawnMonster = useCallback((type: MonsterType) => {
    const st = MONSTER_STATS[type];
    monstersRef.current.push({
      dist: 0, hp: st.hp, maxHp: st.hp, type, slowTimer: 0, alive: true,
    });
  }, []);

  const initGame = useCallback(() => {
    towersRef.current = [];
    monstersRef.current = [];
    beamsRef.current = [];
    particlesRef.current = [];
    connectionsRef.current = [];
    dragConnRef.current = null;
    moneyRef.current = 100;
    livesRef.current = 10;
    spawnQueueRef.current = buildWave();
    spawnIndexRef.current = 0;
    waveFrameRef.current = 0;
    setMoney(100);
    setLives(10);
    setEnemiesLeft(spawnQueueRef.current.length);
  }, []);

  const startWave = useCallback(() => {
    if (phaseRef.current !== 'prepare') return;
    spawnQueueRef.current = buildWave();
    spawnIndexRef.current = 0;
    waveFrameRef.current = 0;
    setEnemiesLeft(spawnQueueRef.current.length);
    setPhase('wave');
    select();
  }, [select]);

  // ── Game Loop ──
  useEffect(() => {
    if (phase !== 'prepare' && phase !== 'wave') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 15 + Math.random() * 15,
          maxLife: 30,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    };

    const loop = () => {
      const curPhase = phaseRef.current;
      if (curPhase !== 'prepare' && curPhase !== 'wave') return;
      frameRef.current++;

      const towers = towersRef.current;
      const monsters = monstersRef.current;
      const beams = beamsRef.current;
      const particles = particlesRef.current;

      // ── 出怪 ──
      if (curPhase === 'wave') {
        waveFrameRef.current++;
        const q = spawnQueueRef.current;
        while (spawnIndexRef.current < q.length && waveFrameRef.current >= q[spawnIndexRef.current].delay) {
          spawnMonster(q[spawnIndexRef.current].type);
          spawnIndexRef.current++;
        }
      }

      // ── 怪物移动 ──
      for (const m of monsters) {
        if (!m.alive) continue;
        let spd = MONSTER_STATS[m.type].speed;
        if (m.slowTimer > 0) { m.slowTimer--; spd *= 0.5; }
        m.dist += spd;
        if (m.dist >= TOTAL_LEN) {
          m.alive = false;
          livesRef.current -= MONSTER_STATS[m.type].escape;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            phaseRef.current = 'defeat';
            setPhase('defeat');
            return;
          }
        }
      }

      // 相连塔集合（连线加成）
      const connectedSet = new Set<number>();
      for (const c of connectionsRef.current) { connectedSet.add(c.a); connectedSet.add(c.b); }

      // ── 塔攻击 ──
      for (let ti = 0; ti < towers.length; ti++) {
        const t = towers[ti];
        if (t.cooldown > 0) t.cooldown--;
        const stats = TOWER_STATS[t.type];
        let target: Monster | null = null;
        let minD = Infinity;
        for (const m of monsters) {
          if (!m.alive) continue;
          const p = posAtDist(m.dist);
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < stats.range && d < minD) { minD = d; target = m; }
        }
        if (target && t.cooldown <= 0) {
          // 连线塔攻速 +20%
          t.cooldown = connectedSet.has(ti) ? Math.floor(stats.cd * 0.8) : stats.cd;
          const tp = posAtDist(target.dist);
          target.hp -= stats.damage;
          if (t.type === 'blue') target.slowTimer = 90;
          beams.push({ x1: t.x, y1: t.y, x2: tp.x, y2: tp.y, life: 5, color: stats.color });
          hit();
          if (target.hp <= 0) {
            target.alive = false;
            moneyRef.current += MONSTER_STATS[target.type].reward;
            setMoney(moneyRef.current);
            spawnParticles(tp.x, tp.y, MONSTER_STATS[target.type].color, 14);
            pop();
          }
        }
      }

      // ── 胜利判定 ──
      if (curPhase === 'wave' && spawnIndexRef.current >= spawnQueueRef.current.length && !monsters.some((m) => m.alive)) {
        victory();
        phaseRef.current = 'victory';
        setPhase('victory');
        return;
      }

      // ── 光束衰减 ──
      for (let i = beams.length - 1; i >= 0; i--) {
        beams[i].life--;
        if (beams[i].life <= 0) beams.splice(i, 1);
      }

      // ── 粒子更新 ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // ── 渲染 ──
      ctx.clearRect(0, 0, W, H);

      // 背景（墙体）
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 墙体纹理
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= W; gx += CELL) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy <= H; gy += CELL) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // 路径（蛇形走廊）
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = PATH_HALF * 2 + 8;
      ctx.beginPath();
      ctx.moveTo(WAYPOINTS[0][0], WAYPOINTS[0][1]);
      for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i][0], WAYPOINTS[i][1]);
      ctx.stroke();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = PATH_HALF * 2;
      ctx.beginPath();
      ctx.moveTo(WAYPOINTS[0][0], WAYPOINTS[0][1]);
      for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i][0], WAYPOINTS[i][1]);
      ctx.stroke();
      ctx.restore();

      // 入口 / 终点标记
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▶ 入口', 40, 40);
      ctx.fillStyle = '#f87171';
      ctx.fillText('终点 ◀', 755, 435);
      ctx.textAlign = 'left';

      // 障碍物
      for (const o of OBSTACLES) {
        const g = ctx.createLinearGradient(o.x - o.w / 2, o.y - o.h / 2, o.x, o.y + o.h / 2);
        g.addColorStop(0, '#78350f');
        g.addColorStop(1, '#451a03');
        ctx.fillStyle = g;
        ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(o.x - o.w / 2, o.y - o.h / 2);
        ctx.lineTo(o.x + o.w / 2, o.y + o.h / 2);
        ctx.moveTo(o.x + o.w / 2, o.y - o.h / 2);
        ctx.lineTo(o.x - o.w / 2, o.y + o.h / 2);
        ctx.stroke();
      }

      // ── 塔连线光纤 ──
      for (const c of connectionsRef.current) {
        const a = towers[c.a], b = towers[c.b];
        if (!a || !b) continue;
        const pulse = 0.5 + 0.5 * Math.sin(frameRef.current * 0.1 + c.a + c.b);
        const color = a.type === b.type ? TOWER_STATS[a.type].color : '#e879f9';
        ctx.save();
        ctx.globalAlpha = 0.4 + pulse * 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.restore();
      }

      // 拖动连接预览
      if (dragConnRef.current && towers[dragConnRef.current.from]) {
        const a = towers[dragConnRef.current.from];
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(dragConnRef.current.x, dragConnRef.current.y); ctx.stroke();
        ctx.restore();
      }

      // ── 塔 ──
      for (const t of towers) {
        const color = TOWER_STATS[t.type].color;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(t.x, t.y, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(t.x, t.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 放置预览
      if (curPhase === 'prepare' && mouseRef.current) {
        let nearest: { x: number; y: number } | null = null;
        let nd = Infinity;
        for (const vp of VALID_POINTS) {
          if (towers.some((t) => Math.abs(t.x - vp.x) < 1 && Math.abs(t.y - vp.y) < 1)) continue;
          const d = Math.hypot(vp.x - mouseRef.current.x, vp.y - mouseRef.current.y);
          if (d < nd) { nd = d; nearest = vp; }
        }
        if (nearest && nd < 26) {
          const color = TOWER_STATS[selected].color;
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(nearest.x, nearest.y, 12, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      // ── 光束（攻击） ──
      for (const b of beams) {
        const alpha = b.life / 5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.restore();
      }

      // ── 怪物 ──
      for (const m of monsters) {
        if (!m.alive) continue;
        const p = posAtDist(m.dist);
        const st = MONSTER_STATS[m.type];
        const r = st.radius;
        ctx.save();
        ctx.shadowColor = st.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = st.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(p.x - r * 0.3, p.y - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x + r * 0.3, p.y - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
        if (m.slowTimer > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2); ctx.stroke();
        }
        const bw = r * 2;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(p.x - r, p.y - r - 8, bw, 4);
        ctx.fillStyle = m.hp / m.maxHp > 0.5 ? '#4ade80' : m.hp / m.maxHp > 0.25 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(p.x - r, p.y - r - 8, bw * Math.max(0, m.hp / m.maxHp), 4);
      }

      // ── 粒子 ──
      for (const p of particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, spawnMonster, hit, pop, victory, selected]);

  // ── 放置塔 ──
  const placeTower = useCallback((clientX: number, clientY: number) => {
    if (phaseRef.current !== 'prepare' && phaseRef.current !== 'wave') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;

    let nearest: { x: number; y: number } | null = null;
    let nd = Infinity;
    for (const vp of VALID_POINTS) {
      if (towersRef.current.some((t) => Math.abs(t.x - vp.x) < 1 && Math.abs(t.y - vp.y) < 1)) continue;
      const d = Math.hypot(vp.x - x, vp.y - y);
      if (d < nd) { nd = d; nearest = vp; }
    }
    const stats = TOWER_STATS[selected];
    if (towersRef.current.length >= MAX_TOWERS) return;
    if (nearest && nd < 26 && moneyRef.current >= stats.cost) {
      towersRef.current.push({ x: nearest.x, y: nearest.y, type: selected, cooldown: 0 });
      moneyRef.current -= stats.cost;
      setMoney(moneyRef.current);
      select();
    }
  }, [scale, selected, select]);

  // 鼠标交互：左键放置、右键拖动连接
  useEffect(() => {
    const toCanvas = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
    };
    const findTowerAt = (x: number, y: number) => {
      for (let i = 0; i < towersRef.current.length; i++) {
        const t = towersRef.current[i];
        if (Math.hypot(t.x - x, t.y - y) < 16) return i;
      }
      return -1;
    };
    const handleMove = (e: MouseEvent) => {
      const p = toCanvas(e);
      mouseRef.current = p;
      if (dragConnRef.current) {
        dragConnRef.current.x = p.x;
        dragConnRef.current.y = p.y;
      }
    };
    const handleDown = (e: MouseEvent) => {
      if (e.button === 0) {
        placeTower(e.clientX, e.clientY);
      } else if (e.button === 2) {
        const p = toCanvas(e);
        const idx = findTowerAt(p.x, p.y);
        if (idx >= 0) dragConnRef.current = { from: idx, x: p.x, y: p.y };
      }
    };
    const handleUp = (e: MouseEvent) => {
      if (e.button === 2 && dragConnRef.current) {
        const p = toCanvas(e);
        const idx = findTowerAt(p.x, p.y);
        if (idx >= 0 && idx !== dragConnRef.current.from) {
          const from = dragConnRef.current.from;
          const exists = connectionsRef.current.some(
            (c) => (c.a === from && c.b === idx) || (c.a === idx && c.b === from)
          );
          if (!exists) {
            connectionsRef.current.push({ a: from, b: idx });
            select();
          }
        }
        dragConnRef.current = null;
      }
    };
    const handleContext = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('contextmenu', handleContext);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('contextmenu', handleContext);
    };
  }, [scale, placeTower, select]);

  // 键盘：1=红塔 2=蓝塔
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '1') setSelected('red');
      if (e.key === '2') setSelected('blue');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Victory notify
  useEffect(() => {
    if (phase !== 'victory') return;
    const t = setTimeout(() => onCompleteGame(), 2000);
    return () => clearTimeout(t);
  }, [phase, onCompleteGame]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-blue-950 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
          <span className="text-yellow-400">🏰</span> 激光塔防
        </h1>
        <p className="text-slate-400 text-sm">蛇形迷宫 · 红塔高伤 · 蓝塔减速 · 相邻塔自动连线激光</p>
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
            cursor: 'crosshair',
          }}
        />

        {phase === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-2xl">
            <div className="text-5xl mb-4">🏰</div>
            <h2 className="text-3xl font-bold text-white mb-2">激光塔防</h2>
            <p className="text-slate-300 mb-1 text-sm">蛇形迷宫，怪物从入口冲向终点</p>
            <p className="text-slate-400 mb-4 text-sm">布置激光塔拦截，守住终点</p>
            <button
              onClick={() => {
                select();
                initGame();
                setPhase('prepare');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold hover:scale-105 transition-transform"
            >
              <Play size={18} /> 开始
            </button>
          </div>
        )}

        {(phase === 'prepare' || phase === 'wave') && (
          <>
            {/* 顶部工具栏 */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelected('red')}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all ${selected === 'red' ? 'bg-red-500 text-white scale-105' : 'bg-slate-800 text-slate-300'}`}
                >
                  <Zap size={14} /> 红塔 高伤(40)
                </button>
                <button
                  onClick={() => setSelected('blue')}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all ${selected === 'blue' ? 'bg-blue-500 text-white scale-105' : 'bg-slate-800 text-slate-300'}`}
                >
                  <Snowflake size={14} /> 蓝塔 减速(30)
                </button>
              </div>
              <div className="text-yellow-400 font-bold text-sm">💰 {money}</div>
              <div className="text-red-400 font-bold text-sm">❤ {lives}</div>
              <div className="text-cyan-300 font-bold text-sm">🏗️ {towersRef.current.length}/{MAX_TOWERS}</div>
              {phase === 'prepare' && (
                <button
                  onClick={startWave}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 text-white text-sm font-bold hover:scale-105 transition-transform"
                >
                  ▶ 开始进攻
                </button>
              )}
            </div>

            {phase === 'prepare' && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-300 text-xs bg-slate-900/70 px-3 py-1.5 rounded-full text-center">
                左键放塔（红=高伤 / 蓝=减速，数字键 1/2 切换）· 右键从塔拖到另一塔连接光纤
              </div>
            )}
          </>
        )}

        {phase === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
            <Trophy size={48} className="text-yellow-400 mb-3" />
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">防守成功!</h2>
            <p className="text-slate-400 text-sm">正在进入下一关...</p>
          </div>
        )}

        {phase === 'defeat' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
            <div className="text-5xl mb-4">💀</div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">防守失败</h2>
            <p className="text-slate-300 mb-4 text-sm">怪物突破了终点</p>
            <button
              onClick={() => {
                select();
                initGame();
                setPhase('prepare');
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
          setPhase('prepare');
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-full glass-effect text-slate-200 hover:text-cyan-300 transition-colors text-sm"
      >
        <RotateCcw size={16} /> 重新开始
      </button>
    </div>
  );
};

export default TowerDefenseGame;
