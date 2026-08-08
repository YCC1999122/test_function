import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Swords, Star } from 'lucide-react';
import { useGameAudio } from './GameAudio';

// ── Constants ──
const CANVAS_W = 960;
const CANVAS_H = 540;
const WORLD_W = 5600;
const GRAVITY = 0.65;
const GROUND_Y = CANVAS_H - 60;

// Player (scaled up for more detail)
const PLAYER_W = 42;
const PLAYER_H = 62;
const PLAYER_MAX_HP = 100;
const REGEN_DELAY = 120;
const REGEN_RATE = 0.05;

// ── Types ──
type Facing = 1 | -1;
type WeaponType = 'sword' | 'axe' | null;
type EnemyType = 'grunt' | 'runner' | 'tank' | 'boss';
type AnimState = 'idle' | 'walk' | 'run' | 'jump_up' | 'jump_down' | 'attack_punch' | 'attack_kick' | 'attack_special' | 'hurt' | 'pickup';

interface Fighter {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  facing: Facing;
  targetFacing: Facing;
  onGround: boolean;
  attackTimer: number;
  attackCooldown: number;
  comboCount: number;
  comboTimer: number;
  hitFlash: number;
  invincible: number;
  idleFrames: number;
  animState: AnimState;
  animTimer: number;
  turnProgress: number;
  // Buffs
  speedBoost: number;
  damageBoost: number;
  shieldActive: number;
  // Weapon
  weapon: WeaponType;
  // Ranged
  shootCooldown: number;
  // Pickup celebrate
  pickupCelebrate: number;
}

interface Enemy {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  type: EnemyType;
  alive: boolean;
  dying: number;
  hitFlash: number;
  stunTimer: number;
  onGround: boolean;
  aiTimer: number;
  aiState: 'idle' | 'chase' | 'attack' | 'retreat';
  animFrame: number;
  deathParticles: number;
}

interface Pickup {
  x: number; y: number;
  type: 'weapon' | 'buff';
  subtype: string;
  collected: boolean;
  bobOffset: number;
}

interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  trail: { x: number; y: number }[];
}

interface DamageNumber {
  x: number; y: number;
  value: number;
  life: number;
  maxLife: number;
  color: string;
  text: string;
}

interface SparkParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SlashTrail {
  x: number; y: number;
  facing: Facing;
  life: number;
  maxLife: number;
  color: string;
  type: 'slash' | 'kick' | 'special';
}

// ── Terrain: varied heights, gaps, slopes ──
interface TerrainBlock {
  x: number; y: number; w: number; h: number;
  type: 'ground' | 'step' | 'slope_up' | 'slope_down' | 'pit_edge';
  color: string;
}

const TERRAIN: TerrainBlock[] = [
  // Section 1 - Starting field (flat, warm-up area)
  { x: 0, y: GROUND_Y, w: 380, h: 30, type: 'ground', color: '#2d4a2e' },
  // Small step up
  { x: 380, y: GROUND_Y - 25, w: 120, h: 55, type: 'step', color: '#3a5938' },
  { x: 500, y: GROUND_Y - 25, w: 250, h: 30, type: 'ground', color: '#2d4a2e' },
  // Gap (pit)
  { x: 750, y: GROUND_Y - 25, w: 30, h: 10, type: 'pit_edge', color: '#1a2a1a' },
  { x: 800, y: GROUND_Y + 15, w: 180, h: 50, type: 'ground', color: '#3a4a2e' },
  { x: 980, y: GROUND_Y + 15, w: 150, h: 30, type: 'ground', color: '#2d4a2e' },

  // Section 2 - Hilly terrain
  { x: 1150, y: GROUND_Y, w: 120, h: 30, type: 'ground', color: '#1a3020' },
  { x: 1270, y: GROUND_Y - 20, w: 100, h: 50, type: 'step', color: '#2d4a2e' },
  { x: 1370, y: GROUND_Y - 20, w: 200, h: 30, type: 'ground', color: '#1a3020' },
  // Gap
  { x: 1570, y: GROUND_Y - 20, w: 15, h: 8, type: 'pit_edge', color: '#0a1a0a' },
  { x: 1600, y: GROUND_Y + 10, w: 200, h: 55, type: 'ground', color: '#3a4a2e' },
  { x: 1800, y: GROUND_Y + 10, w: 160, h: 30, type: 'ground', color: '#2d4a2e' },
  // Elevated section
  { x: 1980, y: GROUND_Y - 35, w: 100, h: 65, type: 'step', color: '#3a5938' },
  { x: 2080, y: GROUND_Y - 35, w: 180, h: 30, type: 'ground', color: '#2d4a2e' },

  // Section 3 - Canyon (many gaps)
  { x: 2280, y: GROUND_Y - 35, w: 30, h: 10, type: 'pit_edge', color: '#0a1a0a' },
  { x: 2330, y: GROUND_Y + 20, w: 140, h: 55, type: 'ground', color: '#3a4a2e' },
  { x: 2470, y: GROUND_Y + 20, w: 30, h: 10, type: 'pit_edge', color: '#0a1a0a' },
  { x: 2520, y: GROUND_Y - 10, w: 160, h: 40, type: 'ground', color: '#2d4a2e' },
  { x: 2680, y: GROUND_Y - 10, w: 20, h: 8, type: 'pit_edge', color: '#0a1a0a' },
  { x: 2720, y: GROUND_Y + 30, w: 120, h: 60, type: 'ground', color: '#3a4a2e' },
  { x: 2840, y: GROUND_Y + 30, w: 160, h: 30, type: 'ground', color: '#2d4a2e' },

  // Section 4 - Stepped ascent
  { x: 3020, y: GROUND_Y + 15, w: 80, h: 45, type: 'step', color: '#4a4030' },
  { x: 3100, y: GROUND_Y - 15, w: 100, h: 55, type: 'step', color: '#5a5040' },
  { x: 3200, y: GROUND_Y - 15, w: 200, h: 30, type: 'ground', color: '#4a3a2e' },
  // Gap
  { x: 3420, y: GROUND_Y - 15, w: 25, h: 8, type: 'pit_edge', color: '#0a0a0a' },
  { x: 3460, y: GROUND_Y + 25, w: 140, h: 55, type: 'ground', color: '#5a4a3e' },
  { x: 3600, y: GROUND_Y + 25, w: 100, h: 30, type: 'ground', color: '#4a3a2e' },
  { x: 3700, y: GROUND_Y - 25, w: 120, h: 55, type: 'step', color: '#6a5040' },
  { x: 3820, y: GROUND_Y - 25, w: 180, h: 30, type: 'ground', color: '#4a3a2e' },

  // Section 5 - Boss arena (wide, elevated)
  { x: 4020, y: GROUND_Y - 40, w: 80, h: 70, type: 'step', color: '#5a4040' },
  { x: 4100, y: GROUND_Y - 40, w: 400, h: 30, type: 'ground', color: '#3a2a2a' },
  { x: 4500, y: GROUND_Y - 40, w: 200, h: 30, type: 'ground', color: '#3a2a2a' },
  { x: 4700, y: GROUND_Y - 40, w: 30, h: 10, type: 'pit_edge', color: '#1a0a0a' },
  { x: 4750, y: GROUND_Y + 10, w: 180, h: 60, type: 'ground', color: '#4a3030' },
  // Victory ramp
  { x: 4950, y: GROUND_Y - 50, w: 120, h: 80, type: 'step', color: '#6a5040' },
  { x: 5070, y: GROUND_Y - 50, w: 300, h: 30, type: 'ground', color: '#5a4040' },
  { x: 5370, y: GROUND_Y - 50, w: 230, h: 30, type: 'ground', color: '#6a5050' },
];

const ELEVATED_PLATFORMS = [
  // Section 1
  { x: 180, y: GROUND_Y - 90, w: 130, h: 14 },
  { x: 420, y: GROUND_Y - 70, w: 100, h: 14 },
  // Section 2
  { x: 1200, y: GROUND_Y - 110, w: 140, h: 14 },
  { x: 1450, y: GROUND_Y - 70, w: 120, h: 14 },
  { x: 1700, y: GROUND_Y - 130, w: 110, h: 14 },
  { x: 2100, y: GROUND_Y - 90, w: 140, h: 14 },
  // Section 3
  { x: 2400, y: GROUND_Y - 100, w: 150, h: 14 },
  { x: 2650, y: GROUND_Y - 70, w: 130, h: 14 },
  // Section 4
  { x: 3100, y: GROUND_Y - 120, w: 160, h: 14 },
  { x: 3350, y: GROUND_Y - 80, w: 130, h: 14 },
  { x: 3650, y: GROUND_Y - 110, w: 140, h: 14 },
  { x: 3950, y: GROUND_Y - 75, w: 120, h: 14 },
  // Section 5
  { x: 4300, y: GROUND_Y - 110, w: 150, h: 14 },
  { x: 4600, y: GROUND_Y - 80, w: 140, h: 14 },
  { x: 4850, y: GROUND_Y - 130, w: 130, h: 14 },
];

const ENEMIES: Enemy[] = [
  // Section 1
  { x: 300, y: GROUND_Y - 30, w: 28, h: 30, vx: 0, vy: 0, hp: 4, maxHp: 4, type: 'grunt', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 550, y: GROUND_Y - 55, w: 28, h: 30, vx: 0, vy: 0, hp: 4, maxHp: 4, type: 'grunt', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 680, y: GROUND_Y - 55, w: 24, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'runner', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  // Section 2
  { x: 1300, y: GROUND_Y - 50, w: 28, h: 30, vx: 0, vy: 0, hp: 4, maxHp: 4, type: 'grunt', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 1500, y: GROUND_Y - 50, w: 24, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'runner', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 1700, y: GROUND_Y - 20, w: 36, h: 36, vx: 0, vy: 0, hp: 8, maxHp: 8, type: 'tank', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 1950, y: GROUND_Y - 20, w: 24, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'runner', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  // Section 3
  { x: 2350, y: GROUND_Y - 10, w: 28, h: 30, vx: 0, vy: 0, hp: 5, maxHp: 5, type: 'grunt', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 2580, y: GROUND_Y - 40, w: 24, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'runner', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 2750, y: GROUND_Y, w: 36, h: 36, vx: 0, vy: 0, hp: 8, maxHp: 8, type: 'tank', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 2900, y: GROUND_Y, w: 24, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'runner', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  // Section 4
  { x: 3150, y: GROUND_Y - 45, w: 28, h: 30, vx: 0, vy: 0, hp: 5, maxHp: 5, type: 'grunt', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 3400, y: GROUND_Y - 45, w: 36, h: 36, vx: 0, vy: 0, hp: 8, maxHp: 8, type: 'tank', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 3650, y: GROUND_Y - 5, w: 28, h: 30, vx: 0, vy: 0, hp: 5, maxHp: 5, type: 'grunt', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 3850, y: GROUND_Y - 55, w: 24, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'runner', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  // Section 5 - Boss + guards
  { x: 4350, y: GROUND_Y - 70, w: 28, h: 30, vx: 0, vy: 0, hp: 5, maxHp: 5, type: 'grunt', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 4600, y: GROUND_Y - 70, w: 48, h: 50, vx: 0, vy: 0, hp: 25, maxHp: 25, type: 'boss', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
  { x: 4800, y: GROUND_Y - 20, w: 24, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'runner', alive: true, dying: 0, hitFlash: 0, stunTimer: 0, onGround: true, aiTimer: 0, aiState: 'idle', animFrame: 0, deathParticles: 0 },
];

const PICKUPS: Pickup[] = [
  // Section 1
  { x: 460, y: GROUND_Y - 75, type: 'buff', subtype: 'health', collected: false, bobOffset: 0 },
  // Section 2
  { x: 1200, y: GROUND_Y - 60, type: 'weapon', subtype: 'sword', collected: false, bobOffset: 20 },
  { x: 1650, y: GROUND_Y - 60, type: 'buff', subtype: 'health', collected: false, bobOffset: 40 },
  { x: 1850, y: GROUND_Y - 60, type: 'buff', subtype: 'speed', collected: false, bobOffset: 60 },
  // Section 3
  { x: 2550, y: GROUND_Y - 60, type: 'weapon', subtype: 'axe', collected: false, bobOffset: 80 },
  { x: 2800, y: GROUND_Y - 60, type: 'buff', subtype: 'damage', collected: false, bobOffset: 100 },
  // Section 4
  { x: 3300, y: GROUND_Y - 65, type: 'buff', subtype: 'health', collected: false, bobOffset: 120 },
  { x: 3700, y: GROUND_Y - 75, type: 'buff', subtype: 'shield', collected: false, bobOffset: 140 },
  { x: 3900, y: GROUND_Y - 75, type: 'buff', subtype: 'damage', collected: false, bobOffset: 160 },
  // Section 5
  { x: 4200, y: GROUND_Y - 90, type: 'buff', subtype: 'health', collected: false, bobOffset: 180 },
  { x: 4500, y: GROUND_Y - 90, type: 'buff', subtype: 'shield', collected: false, bobOffset: 200 },
];

const VICTORY_X = 5200;

// ── Helpers ──
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── Component ──
const BeatEmUpGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory'>('menu');
  const [scale, setScale] = useState(1);

  const { hit: playHit, select, victory: playVictory, pop, startBGM, stopBGM } = useGameAudio();

  const playerRef = useRef<Fighter>(createPlayer());
  const enemiesRef = useRef<Enemy[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const sparkParticlesRef = useRef<SparkParticle[]>([]);
  const slashTrailsRef = useRef<SlashTrail[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const cameraRef = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0, decay: 0.85 });
  const animRef = useRef(0);
  const frameRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const isPlayingRef = useRef(false);

  function createPlayer(): Fighter {
    return {
      x: 80, y: GROUND_Y - PLAYER_H,
      w: PLAYER_W, h: PLAYER_H,
      vx: 0, vy: 0,
      hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
      facing: 1, targetFacing: 1,
      onGround: true,
      attackTimer: 0, attackCooldown: 0,
      comboCount: 0, comboTimer: 0,
      hitFlash: 0, invincible: 0,
      idleFrames: 0,
      animState: 'idle', animTimer: 0,
      turnProgress: 1,
      speedBoost: 0, damageBoost: 0, shieldActive: 0,
      weapon: null,
      shootCooldown: 0,
      pickupCelebrate: 0,
    };
  }

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min((window.innerWidth - 32) / CANVAS_W, (window.innerHeight - 160) / CANVAS_H, 1.1);
      setScale(s > 0.1 ? s : 0.1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const initGame = useCallback(() => {
    playerRef.current = createPlayer();
    enemiesRef.current = ENEMIES.map(e => ({ ...e, alive: true, dying: 0, hitFlash: 0, stunTimer: 0, aiTimer: 0, aiState: 'idle' as const, animFrame: 0, deathParticles: 0 }));
    pickupsRef.current = PICKUPS.map(p => ({ ...p, collected: false }));
    projectilesRef.current = [];
    damageNumbersRef.current = [];
    sparkParticlesRef.current = [];
    slashTrailsRef.current = [];
    keysRef.current.clear();
    cameraRef.current = 0;
    shakeRef.current = { x: 0, y: 0, intensity: 0, decay: 0.85 };
    frameRef.current = 0;
  }, []);

  const addScreenShake = (intensity: number) => {
    shakeRef.current.intensity = Math.max(shakeRef.current.intensity, intensity);
  };

  const spawnSparks = (x: number, y: number, count: number, color: string, spread = 3) => {
    for (let i = 0; i < count; i++) {
      sparkParticlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * spread * 2,
        vy: (Math.random() - 0.8) * spread * 2,
        life: 15 + Math.random() * 15,
        maxLife: 30,
        color,
        size: 1.5 + Math.random() * 3,
      });
    }
  };

  const addSlashTrail = (x: number, y: number, facing: Facing, type: 'slash' | 'kick' | 'special', color: string) => {
    slashTrailsRef.current.push({ x, y, facing, life: 12, maxLife: 12, color, type });
  };

  // ── Game Loop ──
  useEffect(() => {
    if (gameState !== 'playing') return;
    isPlayingRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const allPlatforms = [...TERRAIN, ...ELEVATED_PLATFORMS.map(p => ({...p, type: 'ground' as const, color: '#5b3a6e'}))];

    const loop = () => {
      if (gameStateRef.current !== 'playing') { isPlayingRef.current = false; return; }
      frameRef.current++;

      const player = playerRef.current;
      const enemies = enemiesRef.current;
      const pickups = pickupsRef.current;
      const projectiles = projectilesRef.current;
      const dmgNums = damageNumbersRef.current;
      const sparks = sparkParticlesRef.current;
      const trails = slashTrailsRef.current;
      const keys = keysRef.current;
      const shake = shakeRef.current;
      const frame = frameRef.current;

      // ── Screen Shake ──
      if (shake.intensity > 0.2) {
        shake.x = (Math.random() - 0.5) * shake.intensity * 2;
        shake.y = (Math.random() - 0.5) * shake.intensity * 2;
        shake.intensity *= shake.decay;
      } else {
        shake.x = 0;
        shake.y = 0;
        shake.intensity = 0;
      }

      // ── Player Input ──
      let dir = 0;
      if (keys.has('a') || keys.has('arrowleft')) dir -= 1;
      if (keys.has('d') || keys.has('arrowright')) dir += 1;

      const isMoving = dir !== 0;
      const wantsJump = keys.has('w') || keys.has('arrowup') || keys.has(' ') || keys.has('jump');
      const wantsPunch = keys.has('j');
      const wantsKick = keys.has('k');
      const wantsSpecial = keys.has('l');
      const wantsShoot = keys.has('f');

      // Turn facing with smooth interpolation
      if (isMoving) {
        player.idleFrames = 0;
        player.targetFacing = dir > 0 ? 1 : -1;
      } else {
        player.idleFrames++;
      }
      // Smooth turn progress
      if (player.targetFacing !== player.facing) {
        player.turnProgress = Math.max(0, player.turnProgress - 0.15);
        if (player.turnProgress <= 0) {
          player.facing = player.targetFacing;
          player.turnProgress = 1;
        }
      } else {
        player.turnProgress = Math.min(1, player.turnProgress + 0.1);
      }

      // Animation state machine
      if (player.hitFlash > 0) {
        player.animState = 'hurt';
        player.animTimer = player.hitFlash;
      } else if (player.pickupCelebrate > 0) {
        player.animState = 'pickup';
        player.animTimer = player.pickupCelebrate;
      } else if (player.attackTimer > 0) {
        player.animState = 'attack_special';
      } else if (isMoving && player.onGround) {
        const absVx = Math.abs(player.vx);
        player.animState = absVx > 4.5 ? 'run' : 'walk';
      } else if (!player.onGround) {
        player.animState = player.vy < -1 ? 'jump_up' : 'jump_down';
      } else {
        player.animState = 'idle';
      }

      // Regen
      if (player.idleFrames > REGEN_DELAY && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + REGEN_RATE);
      }

      // Speed
      const moveSpeed = 4.2 + (player.speedBoost > 0 ? 2.8 : 0);
      player.vx = dir * moveSpeed;

      // Jump
      if (wantsJump && player.onGround) {
        player.vy = -13;
        player.onGround = false;
      }

      // Attacks
      if (player.attackCooldown > 0) player.attackCooldown--;
      if (player.attackTimer > 0) player.attackTimer--;

      if (player.comboTimer > 0) {
        player.comboTimer--;
        if (player.comboTimer <= 0) player.comboCount = 0;
      }

      const doAttack = (baseDmg: number, range: number, cooldown: number, slashColor: string, trailType: 'slash' | 'kick' | 'special', shakeAmount: number) => {
        if (player.attackCooldown > 0) return;
        player.attackCooldown = cooldown;
        player.attackTimer = 10;
        player.idleFrames = 0;

        let dmg = baseDmg;
        if (player.weapon === 'sword') dmg += 10;
        if (player.weapon === 'axe') dmg += 16;
        if (player.damageBoost > 0) dmg = Math.floor(dmg * 2);

        playHit();
        addScreenShake(shakeAmount);

        const atkX = player.facing === 1 ? player.x + player.w : player.x - range;
        const atkY = player.y + 8;
        const atkW = range;
        const atkH = player.h - 16;

        addSlashTrail(atkX + (player.facing === 1 ? 0 : range), atkY + atkH / 2, player.facing, trailType, slashColor);

        let hitSomething = false;
        for (const enemy of enemies) {
          if (!enemy.alive || enemy.dying > 0) continue;
          if (rectsOverlap({ x: atkX, y: atkY, w: atkW, h: atkH }, enemy)) {
            enemy.hp -= dmg;
            enemy.hitFlash = 8;
            enemy.stunTimer = 15;
            enemy.aiState = 'chase';
            enemy.vx = player.facing * 7;
            enemy.vy = -4;
            enemy.onGround = false;
            hitSomething = true;
            dmgNums.push({ x: enemy.x + enemy.w / 2, y: enemy.y - 10, value: dmg, life: 35, maxLife: 35, color: slashColor, text: `${Math.floor(dmg)}` });
            spawnSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 6, slashColor);
            if (enemy.hp <= 0) {
              enemy.alive = false;
              enemy.dying = 25;
              enemy.deathParticles = 15;
              spawnSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 20, '#ffffff', 5);
              addScreenShake(3);
              pop();
            }
          }
        }
        if (!hitSomething) {
          // Whiff VFX
          spawnSparks(atkX + atkW / 2, atkY + atkH / 2, 3, '#ccddff', 2);
        }
      };

      if (wantsPunch) {
        player.comboCount++;
        player.comboTimer = 35;
        const isCombo3 = player.comboCount >= 3;
        doAttack(Math.floor(isCombo3 ? 18 : 10), isCombo3 ? 60 : 55, 18, isCombo3 ? '#fbbf24' : '#00d4ff', 'slash', isCombo3 ? 4 : 2);
        if (isCombo3) player.comboCount = 0;
      } else if (wantsKick) {
        player.comboCount = 0;
        doAttack(20, 68, 28, '#f97316', 'kick', 3);
      } else if (wantsSpecial) {
        player.comboCount = 0;
        doAttack(35, 85, 60, '#ef4444', 'special', 6);
      }

      // ── Ranged Attack (F key) ──
      if (player.shootCooldown > 0) player.shootCooldown--;
      if (wantsShoot && player.shootCooldown <= 0) {
        player.shootCooldown = 25;
        player.idleFrames = 0;
        const projDmg = 12 + (player.weapon === 'axe' ? 8 : player.weapon === 'sword' ? 4 : 0);
        const projColor = player.weapon === 'axe' ? '#f97316' : player.weapon === 'sword' ? '#22d3ee' : '#a855f7';
        projectiles.push({
          x: player.x + player.w / 2 + player.facing * 20,
          y: player.y + player.h / 2 - 4,
          vx: player.facing * 7,
          vy: 0,
          life: 55,
          damage: projDmg,
          isPlayer: true,
          color: projColor,
          trail: [],
        });
        playHit();
        spawnSparks(player.x + player.w / 2 + player.facing * 20, player.y + player.h / 2, 5, projColor, 2);
      }

      // Timers
      if (player.invincible > 0) player.invincible--;
      if (player.hitFlash > 0) player.hitFlash--;
      if (player.speedBoost > 0) player.speedBoost--;
      if (player.damageBoost > 0) player.damageBoost--;
      if (player.shieldActive > 0) player.shieldActive--;
      if (player.pickupCelebrate > 0) player.pickupCelebrate--;

      // ── Physics ──
      player.vy += GRAVITY;
      if (player.vy > 18) player.vy = 18;
      player.x += player.vx;
      player.y += player.vy;

      player.onGround = false;
      for (const plat of allPlatforms) {
        if (rectsOverlap(player, plat) && player.vy >= 0) {
          const prevBottom = player.y + player.h - player.vy;
          if (prevBottom <= plat.y + 6) {
            player.y = plat.y - player.h;
            player.vy = 0;
            player.onGround = true;
          }
        }
      }

      player.x = clamp(player.x, 0, WORLD_W - player.w);
      if (player.y > CANVAS_H + 100) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.hp -= 15;
        player.hitFlash = 8;
        spawnSparks(player.x + player.w / 2, player.y + player.h, 10, '#ff4444', 4);
        if (player.hp <= 0) player.hp = player.maxHp;
      }

      // ── Camera ──
      const targetCam = player.x - CANVAS_W * 0.38;
      cameraRef.current += (targetCam - cameraRef.current) * 0.08;
      cameraRef.current = clamp(cameraRef.current, 0, WORLD_W - CANVAS_W);

      // ── Enemies ──
      for (const enemy of enemies) {
        if (!enemy.alive) {
          if (enemy.dying > 0) {
            enemy.dying--;
            if (enemy.deathParticles > 0) {
              enemy.deathParticles--;
              spawnSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 2, enemy.type === 'boss' ? '#facc15' : '#ff6666', 2);
            }
          }
          continue;
        }
        if (enemy.hitFlash > 0) enemy.hitFlash--;
        if (enemy.stunTimer > 0) { enemy.stunTimer--; continue; }

        // Physics
        enemy.vy += GRAVITY;
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        enemy.vx *= 0.9;

        enemy.onGround = false;
        for (const plat of allPlatforms) {
          if (rectsOverlap(enemy, plat) && enemy.vy >= 0) {
            const prevBottom = enemy.y + enemy.h - enemy.vy;
            if (prevBottom <= plat.y + 4) {
              enemy.y = plat.y - enemy.h;
              enemy.vy = 0;
              enemy.onGround = true;
            }
          }
        }
        enemy.x = clamp(enemy.x, 0, WORLD_W - enemy.w);
        if (enemy.y > CANVAS_H + 100) { enemy.alive = false; enemy.dying = 20; enemy.deathParticles = 10; pop(); }

        // AI
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        enemy.aiTimer++;
        enemy.animFrame++;

        switch (enemy.type) {
          case 'grunt': {
            const speed = 1.8;
            if (dist < 320) {
              enemy.aiState = 'chase';
              if (Math.abs(dx) > 15) enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.3;
            } else {
              enemy.aiState = 'idle';
              if (enemy.aiTimer > 120) {
                enemy.vx += (Math.random() > 0.5 ? 1 : -1) * speed * 0.5;
                enemy.aiTimer = 0;
              }
            }
            if (dist < 50 && enemy.onGround && enemy.aiTimer % 50 === 0) {
              enemy.vx = (dx > 0 ? 1 : -1) * 4;
              enemy.vy = -5;
              enemy.onGround = false;
            }
            break;
          }
          case 'runner': {
            const speed = 3.2;
            if (dist < 420) {
              enemy.aiState = 'chase';
              enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.22;
            } else {
              enemy.aiState = 'idle';
              if (enemy.aiTimer > 80) {
                enemy.vx += (Math.random() > 0.5 ? 1 : -1) * speed * 0.6;
                enemy.aiTimer = 0;
              }
            }
            if (dist < 42 && enemy.onGround) {
              enemy.vx = (dx > 0 ? 1 : -1) * 5;
              enemy.vy = -6;
              enemy.onGround = false;
            }
            if (dist < 350 && dist > 80 && enemy.onGround && enemy.aiTimer > 90) {
              projectiles.push({
                x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
                vx: (dx > 0 ? 1 : -1) * 3.5, vy: -1.5,
                life: 70, damage: 4, isPlayer: false, color: '#f97316', trail: [],
              });
              enemy.aiTimer = 0;
            }
            break;
          }
          case 'tank': {
            const speed = 1.3;
            if (dist < 380) {
              enemy.aiState = 'chase';
              if (Math.abs(dx) > 20) enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.18;
              if (dist < 220 && enemy.aiTimer > 90) {
                enemy.vx = (dx > 0 ? 1 : -1) * 9;
                enemy.aiTimer = 0;
              }
            } else {
              enemy.aiState = 'idle';
              if (enemy.aiTimer > 150) {
                enemy.vx += (Math.random() > 0.5 ? 1 : -1) * speed * 0.4;
                enemy.aiTimer = 0;
              }
            }
            break;
          }
          case 'boss': {
            const speed = 2.2;
            enemy.aiState = 'chase';
            if (Math.abs(dx) > 20) enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.18;
            // Jump slam
            if (dist < 280 && enemy.onGround && enemy.aiTimer > 65) {
              enemy.vy = -13;
              enemy.vx = (dx > 0 ? 1 : -1) * 7;
              enemy.onGround = false;
              enemy.aiTimer = 0;
            }
            // Shoot projectile
            if (enemy.aiTimer > 100 && enemy.onGround) {
              projectiles.push({
                x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
                vx: (dx > 0 ? 1 : -1) * 4.5, vy: -2,
                life: 90, damage: 10, isPlayer: false, color: '#ef4444', trail: [],
              });
              // Triple shot sometimes
              if (enemy.hp < enemy.maxHp * 0.5) {
                projectiles.push({
                  x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
                  vx: (dx > 0 ? 1 : -1) * 4.5 + 1.5, vy: -3.5,
                  life: 90, damage: 8, isPlayer: false, color: '#ff6666', trail: [],
                });
                projectiles.push({
                  x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
                  vx: (dx > 0 ? 1 : -1) * 4.5 - 1.5, vy: -0.5,
                  life: 90, damage: 8, isPlayer: false, color: '#ff6666', trail: [],
                });
              }
              enemy.aiTimer = 0;
            }
            break;
          }
        }

        // Enemy collision with player
        if (rectsOverlap(player, enemy) && player.invincible <= 0 && player.shieldActive <= 0 && enemy.dying <= 0) {
          const dmg = enemy.type === 'boss' ? 14 : enemy.type === 'tank' ? 9 : 6;
          player.hp -= dmg;
          player.invincible = 25;
          player.hitFlash = 10;
          player.idleFrames = 0;
          player.vx = -(dx > 0 ? 1 : -1) * 7;
          player.vy = -5;
          player.onGround = false;
          dmgNums.push({ x: player.x + player.w / 2, y: player.y - 5, value: dmg, life: 30, maxLife: 30, color: '#ff4444', text: `${dmg}` });
          spawnSparks(player.x + player.w / 2, player.y + player.h / 2, 8, '#ff4444', 3);
          addScreenShake(3);
        }

        // Enemy collisions with each other
        for (const other of enemies) {
          if (other === enemy || !other.alive || other.dying > 0) continue;
          if (rectsOverlap(enemy, other)) {
            const pushX = (enemy.x + enemy.w / 2 > other.x + other.w / 2) ? 1 : -1;
            enemy.x += pushX * 2;
            other.x -= pushX * 2;
          }
        }
      }

      // ── Projectiles ──
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
        p.x += p.vx;
        p.y += p.vy;
        if (p.isPlayer) {
          p.vy += 0.05; // Slight gravity
        } else {
          p.vy += 0.12;
        }
        p.life--;

        if (p.life <= 0 || p.x < cameraRef.current - 100 || p.x > cameraRef.current + CANVAS_W + 100) {
          spawnSparks(p.x, p.y, 3, p.color, 1);
          projectiles.splice(i, 1);
          continue;
        }

        if (p.isPlayer) {
          // Hit enemies
          for (const enemy of enemies) {
            if (!enemy.alive || enemy.dying > 0) continue;
            const closestX = Math.max(enemy.x, Math.min(p.x, enemy.x + enemy.w));
            const closestY = Math.max(enemy.y, Math.min(p.y, enemy.y + enemy.h));
            if (Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2) < 10) {
              const dmg = p.damage + (player.damageBoost > 0 ? p.damage : 0);
              enemy.hp -= dmg;
              enemy.hitFlash = 8;
              enemy.stunTimer = 10;
              enemy.aiState = 'chase';
              enemy.vx = (p.vx > 0 ? 1 : -1) * 4;
              enemy.vy = -3;
              enemy.onGround = false;
              dmgNums.push({ x: enemy.x + enemy.w / 2, y: enemy.y - 10, value: dmg, life: 30, maxLife: 30, color: p.color, text: `${Math.floor(dmg)}` });
              spawnSparks(p.x, p.y, 8, p.color, 3);
              if (enemy.hp <= 0) {
                enemy.alive = false;
                enemy.dying = 20;
                enemy.deathParticles = 12;
                spawnSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 15, '#ffffff', 4);
                pop();
              }
              projectiles.splice(i, 1);
              break;
            }
          }
        } else {
          // Hit player
          const closestX = Math.max(player.x, Math.min(p.x, player.x + player.w));
          const closestY = Math.max(player.y, Math.min(p.y, player.y + player.h));
          if (Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2) < 8 && player.invincible <= 0 && player.shieldActive <= 0) {
            player.hp -= p.damage;
            player.invincible = 20;
            player.hitFlash = 8;
            player.idleFrames = 0;
            dmgNums.push({ x: player.x + player.w / 2, y: player.y, value: p.damage, life: 25, maxLife: 25, color: '#ff6666', text: `${p.damage}` });
            spawnSparks(p.x, p.y, 6, '#ff4444', 2);
            projectiles.splice(i, 1);
          }
        }
      }

      // ── Pickups ──
      for (const pickup of pickups) {
        if (pickup.collected) continue;
        pickup.bobOffset = (pickup.bobOffset + 0.04) % (Math.PI * 2);
        const pickupRect = { x: pickup.x - 16, y: pickup.y + Math.sin(pickup.bobOffset) * 6 - 16, w: 32, h: 32 };
        if (rectsOverlap(player, pickupRect)) {
          pickup.collected = true;
          player.pickupCelebrate = 20;
          select();
          spawnSparks(pickup.x, pickup.y + Math.sin(pickup.bobOffset) * 6, 12, '#facc15', 4);
          if (pickup.type === 'weapon') {
            player.weapon = pickup.subtype as WeaponType;
            dmgNums.push({ x: pickup.x, y: pickup.y - 20, value: 0, life: 40, maxLife: 40, color: '#facc15', text: pickup.subtype === 'sword' ? '⚔️ 获得长剑!' : '🪓 获得巨斧!' });
          } else if (pickup.type === 'buff') {
            let msg = '';
            switch (pickup.subtype) {
              case 'health': player.hp = Math.min(player.maxHp, player.hp + 35); msg = '❤️ +35HP'; break;
              case 'speed': player.speedBoost = 420; msg = '💨 加速!'; break;
              case 'damage': player.damageBoost = 420; msg = '💥 增伤!'; break;
              case 'shield': player.shieldActive = 360; msg = '🛡️ 护盾!'; break;
            }
            dmgNums.push({ x: pickup.x, y: pickup.y - 20, value: 0, life: 40, maxLife: 40, color: '#22c55e', text: msg });
          }
        }
      }

      // ── Sparks ──
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.1;
        s.life--;
        if (s.life <= 0) sparks.splice(i, 1);
      }

      // ── Trail decay ──
      for (let i = trails.length - 1; i >= 0; i--) {
        trails[i].life--;
        if (trails[i].life <= 0) trails.splice(i, 1);
      }

      // ── Damage Numbers ──
      for (let i = dmgNums.length - 1; i >= 0; i--) {
        dmgNums[i].y -= 1.3;
        dmgNums[i].life--;
        if (dmgNums[i].life <= 0) dmgNums.splice(i, 1);
      }

      // ── Check victory ──
      if (player.x > VICTORY_X) {
        playVictory();
        setGameState('victory');
        stopBGM();
        return;
      }

      // Check player death
      if (player.hp <= 0) {
        player.hp = player.maxHp;
        player.x = 80;
        player.y = GROUND_Y - PLAYER_H;
        player.vx = 0;
        player.vy = 0;
        player.invincible = 60;
        player.hitFlash = 15;
        spawnSparks(player.x + player.w / 2, player.y + player.h / 2, 25, '#ff0000', 6);
        addScreenShake(8);
      }

      // ── Draw ──
      draw(ctx);

      animRef.current = requestAnimationFrame(loop);
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const cam = cameraRef.current;
      const player = playerRef.current;
      const enemies = enemiesRef.current;
      const pickups = pickupsRef.current;
      const projectiles = projectilesRef.current;
      const dmgNums = damageNumbersRef.current;
      const sparks = sparkParticlesRef.current;
      const trails = slashTrailsRef.current;
      const frame = frameRef.current;
      const shake = shakeRef.current;

      const sCamX = cam + shake.x;
      const sCamY = shake.y;

      // Background gradient (deeper colors)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, '#06061a');
      bgGrad.addColorStop(0.4, '#0a1228');
      bgGrad.addColorStop(0.7, '#0d1525');
      bgGrad.addColorStop(1, '#080f18');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Parallax mountains (far)
      ctx.fillStyle = '#0f1525';
      for (let i = 0; i < 14; i++) {
        const mx = (i * 220 - sCamX * 0.15) % (CANVAS_W + 300) - 120;
        const mh = 70 + (i % 5) * 45;
        ctx.beginPath();
        ctx.moveTo(mx, CANVAS_H + sCamY);
        ctx.lineTo(mx + 100, CANVAS_H - mh + sCamY);
        ctx.lineTo(mx + 220, CANVAS_H + sCamY);
        ctx.fill();
      }

      // Parallax buildings (mid)
      ctx.fillStyle = '#151a30';
      for (let i = 0; i < 10; i++) {
        const bx = (i * 320 - sCamX * 0.3) % (CANVAS_W + 400) - 160;
        const bh = 50 + (i % 4) * 55;
        ctx.fillRect(bx, CANVAS_H - bh + sCamY, 75, bh + 10);
        // Window dots
        ctx.fillStyle = 'rgba(255,255,200,0.15)';
        for (let wy = 8; wy < bh; wy += 14) {
          ctx.fillRect(bx + 10, CANVAS_H - bh + wy + sCamY, 6, 6);
          ctx.fillRect(bx + 35, CANVAS_H - bh + wy + sCamY, 6, 6);
          ctx.fillRect(bx + 60, CANVAS_H - bh + wy + sCamY, 6, 6);
        }
        ctx.fillStyle = '#151a30';
      }

      // Stars
      for (let i = 0; i < 50; i++) {
        const sx = (i * 127 + 50) % CANVAS_W;
        const sy = (i * 83 + 20) % (CANVAS_H * 0.55);
        const alpha = 0.2 + Math.sin(frame * 0.015 + i) * 0.35;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Terrain ──
      for (const t of TERRAIN) {
        const tx = t.x - sCamX;
        if (tx < -t.w || tx > CANVAS_W) continue;
        const ty = t.y + sCamY;
        ctx.fillStyle = t.color;
        ctx.fillRect(tx, ty, t.w, t.h + 5);
        // Top edge highlight
        ctx.fillStyle = t.type === 'pit_edge' ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(tx, ty, t.w, 3);
        // Grass tufts on ground type
        if (t.type === 'ground' || t.type === 'step') {
          ctx.fillStyle = '#1a4a1a';
          for (let gx = tx + 4; gx < tx + t.w - 8; gx += 10) {
            const gh = 3 + (Math.sin(gx * 0.3 + frame * 0.02) * 2);
            ctx.fillRect(gx, ty - gh, 3, gh + 2);
          }
        }
      }

      // Elevated platforms
      for (const plat of ELEVATED_PLATFORMS) {
        const px = plat.x - sCamX;
        if (px < -plat.w || px > CANVAS_W) continue;
        const py = plat.y + sCamY;
        ctx.fillStyle = '#4a2e5e';
        ctx.fillRect(px, py, plat.w, plat.h + 4);
        ctx.fillStyle = '#7c4d8f';
        ctx.fillRect(px, py, plat.w, 3);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, plat.w, plat.h);
        // Glow pulse
        const glowAlpha = 0.15 + Math.sin(frame * 0.04 + px) * 0.08;
        ctx.fillStyle = `rgba(168, 85, 247, ${glowAlpha})`;
        ctx.fillRect(px, py - 2, plat.w, 2);
      }

      // Victory gate
      const gateX = VICTORY_X - sCamX;
      if (gateX > -80 && gateX < CANVAS_W + 80) {
        const gateY = GROUND_Y - 50 + sCamY;
        // Glow
        const gGlow = ctx.createRadialGradient(gateX, gateY - 20, 2, gateX, gateY - 20, 60);
        gGlow.addColorStop(0, 'rgba(252, 211, 77, 0.6)');
        gGlow.addColorStop(0.5, 'rgba(252, 211, 77, 0.15)');
        gGlow.addColorStop(1, 'rgba(252, 211, 77, 0)');
        ctx.fillStyle = gGlow;
        ctx.beginPath();
        ctx.arc(gateX, gateY - 20, 60, 0, Math.PI * 2);
        ctx.fill();
        // Pillars
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 25 + Math.sin(frame * 0.04) * 12;
        ctx.fillRect(gateX - 3, gateY - 60, 6, 70);
        ctx.shadowBlur = 0;
        // Label
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎁', gateX, gateY - 70);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText('终点', gateX, gateY - 50);
      }

      // ── Pickups ──
      for (const pickup of pickups) {
        if (pickup.collected) continue;
        const px = pickup.x - sCamX;
        if (px < -30 || px > CANVAS_W + 30) continue;
        const py = pickup.y + Math.sin(pickup.bobOffset) * 7 + sCamY;

        ctx.save();
        ctx.translate(px, py);
        // Glow ring
        const glowAlpha = 0.3 + Math.sin(pickup.bobOffset * 2) * 0.15;
        if (pickup.type === 'weapon') {
          const wc = pickup.subtype === 'sword' ? '#22d3ee' : '#f97316';
          ctx.strokeStyle = `rgba(${pickup.subtype === 'sword' ? '34,211,238' : '249,115,22'},${glowAlpha + 0.2})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = wc;
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(pickup.subtype === 'sword' ? '⚔️' : '🪓', 0, 8);
        } else {
          const bc = pickup.subtype === 'health' ? '#22c55e' : pickup.subtype === 'speed' ? '#3b82f6' : pickup.subtype === 'damage' ? '#ef4444' : '#fbbf24';
          ctx.strokeStyle = `${bc}${Math.floor((glowAlpha + 0.3) * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          const emoji = pickup.subtype === 'health' ? '❤️' : pickup.subtype === 'speed' ? '💨' : pickup.subtype === 'damage' ? '💥' : '🛡️';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(emoji, 0, 6);
        }
        ctx.restore();
      }

      // ── Enemies ──
      for (const enemy of enemies) {
        if (!enemy.alive && enemy.dying <= 0) continue;
        const ex = enemy.x - sCamX;
        const ey = enemy.y + sCamY;
        if (ex < -60 || ex > CANVAS_W + 60) continue;

        ctx.save();
        ctx.translate(ex, ey);

        const deathAlpha = enemy.dying > 0 ? enemy.dying / 25 : 1;
        ctx.globalAlpha = deathAlpha;

        // Shadow
        if (enemy.dying <= 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.ellipse(enemy.w / 2, enemy.h + 4, enemy.w / 2, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        const flashColor = enemy.hitFlash > 0 && enemy.hitFlash % 2 === 0 ? '#ffffff' : '';

        // Draw enemy body
        const bobY = enemy.onGround ? Math.sin(enemy.animFrame * 0.06) * 1.5 : 0;

        switch (enemy.type) {
          case 'grunt': {
            // Body
            ctx.fillStyle = flashColor || '#ef4444';
            ctx.fillRect(2, 5 + bobY, enemy.w - 4, enemy.h - 14);
            // Legs
            ctx.fillStyle = flashColor || '#991b1b';
            ctx.fillRect(4, enemy.h - 10 + bobY, 7, 10);
            ctx.fillRect(enemy.w - 11, enemy.h - 10 + bobY, 7, 10);
            // Head
            ctx.fillStyle = flashColor || '#dc2626';
            ctx.beginPath();
            ctx.arc(enemy.w / 2, 5 + bobY, 8, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(enemy.w / 2 - 5, 2 + bobY, 4, 4);
            ctx.fillRect(enemy.w / 2 + 1, 2 + bobY, 4, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(enemy.w / 2 - 4, 3 + bobY, 2, 2);
            ctx.fillRect(enemy.w / 2 + 2, 3 + bobY, 2, 2);
            // Horns
            ctx.strokeStyle = flashColor || '#991b1b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(enemy.w / 2 - 4, 0 + bobY);
            ctx.lineTo(enemy.w / 2 - 6, -5 + bobY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(enemy.w / 2 + 4, 0 + bobY);
            ctx.lineTo(enemy.w / 2 + 6, -5 + bobY);
            ctx.stroke();
            break;
          }
          case 'runner': {
            // Body - oval
            ctx.fillStyle = flashColor || '#f97316';
            ctx.beginPath();
            ctx.ellipse(enemy.w / 2, enemy.h / 2 - 2 + bobY, enemy.w / 2 - 2, enemy.h / 2 - 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            const legPhase = Math.sin(enemy.animFrame * 0.15) * 3;
            ctx.fillStyle = flashColor || '#c2410c';
            ctx.fillRect(4, enemy.h - 8 + bobY + legPhase, 5, 8);
            ctx.fillRect(enemy.w - 9, enemy.h - 8 + bobY - legPhase, 5, 8);
            // Eye
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(enemy.w / 2 - 2, enemy.h / 2 - 5 + bobY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(enemy.w / 2 - 1, enemy.h / 2 - 5 + bobY, 2, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.strokeStyle = flashColor || '#c2410c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(enemy.w - 2, enemy.h / 2 + bobY);
            ctx.quadraticCurveTo(enemy.w + 6, enemy.h / 2 - 4 + bobY, enemy.w + 3, enemy.h / 2 - 10 + bobY);
            ctx.stroke();
            break;
          }
          case 'tank': {
            // Body
            ctx.fillStyle = flashColor || '#7c3aed';
            ctx.fillRect(0, 8 + bobY, enemy.w, enemy.h - 20);
            // Armor plates
            ctx.fillStyle = flashColor || '#4c1d95';
            ctx.fillRect(2, 8 + bobY, enemy.w - 4, 8);
            ctx.fillRect(2, enemy.h - 16 + bobY, enemy.w - 4, 8);
            // Legs
            ctx.fillStyle = flashColor || '#5b21b6';
            ctx.fillRect(3, enemy.h - 8 + bobY, 8, 8);
            ctx.fillRect(enemy.w - 11, enemy.h - 8 + bobY, 8, 8);
            // Head
            ctx.fillStyle = flashColor || '#6d28d9';
            ctx.beginPath();
            ctx.arc(enemy.w / 2, 7 + bobY, 10, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(enemy.w / 2 - 4, 5 + bobY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(enemy.w / 2 + 4, 5 + bobY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Spikes
            ctx.fillStyle = flashColor || '#a78bfa';
            for (let s = 0; s < 3; s++) {
              ctx.beginPath();
              ctx.moveTo(5 + s * 8, 0 + bobY);
              ctx.lineTo(8 + s * 8, -6 + bobY);
              ctx.lineTo(11 + s * 8, 0 + bobY);
              ctx.fill();
            }
            break;
          }
          case 'boss': {
            // Large body
            ctx.fillStyle = flashColor || '#dc2626';
            ctx.fillRect(4, 8 + bobY, enemy.w - 8, enemy.h - 20);
            // Dark armor
            ctx.fillStyle = flashColor || '#7f1d1d';
            ctx.fillRect(0, enemy.h - 12 + bobY, enemy.w, 12);
            ctx.fillRect(0, 6 + bobY, enemy.w, 6);
            // Crown
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(10, 4 + bobY);
            ctx.lineTo(16, -10 + bobY);
            ctx.lineTo(22, 2 + bobY);
            ctx.lineTo(enemy.w / 2, -16 + bobY);
            ctx.lineTo(enemy.w - 22, 2 + bobY);
            ctx.lineTo(enemy.w - 16, -10 + bobY);
            ctx.lineTo(enemy.w - 10, 4 + bobY);
            ctx.fill();
            // Glowing gem
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(enemy.w / 2, -6 + bobY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(12, 14 + bobY, 10, 10);
            ctx.fillRect(enemy.w - 22, 14 + bobY, 10, 10);
            ctx.fillStyle = '#000';
            ctx.fillRect(16, 17 + bobY, 5, 5);
            ctx.fillRect(enemy.w - 18, 17 + bobY, 5, 5);
            // Arms
            ctx.fillStyle = flashColor || '#991b1b';
            ctx.fillRect(-4, 12 + bobY, 8, 20);
            ctx.fillRect(enemy.w - 4, 12 + bobY, 8, 20);
            // Shoulder pads
            ctx.fillStyle = '#facc15';
            ctx.fillRect(-6, 10 + bobY, 12, 6);
            ctx.fillRect(enemy.w - 6, 10 + bobY, 12, 6);
            break;
          }
        }

        // HP bar (always visible when alive)
        if (enemy.dying <= 0) {
          const bw = enemy.w + 10;
          const bh = 5;
          const bx = -5;
          const by = -14;
          // Background
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(bx, by, bw, bh);
          // HP fill
          const ratio = Math.max(0, enemy.hp / enemy.maxHp);
          let hpColor = '#22c55e';
          if (ratio < 0.3) hpColor = '#ef4444';
          else if (ratio < 0.6) hpColor = '#facc15';
          const hpGrad = ctx.createLinearGradient(bx, 0, bx + bw * ratio, 0);
          hpGrad.addColorStop(0, hpColor);
          hpGrad.addColorStop(1, ratio > 0.5 ? '#4ade80' : '#fbbf24');
          ctx.fillStyle = hpGrad;
          ctx.fillRect(bx + 1, by + 1, (bw - 2) * ratio, bh - 2);
          // HP text for boss/tank
          if (enemy.type === 'boss' || enemy.type === 'tank') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '7px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(enemy.hp)}/${enemy.maxHp}`, enemy.w / 2, by - 1);
          }
        }

        // Death dissolve effect
        if (enemy.dying > 0) {
          ctx.globalAlpha = deathAlpha * 0.5;
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.arc(enemy.w / 2, enemy.h / 2, enemy.w * deathAlpha + 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // ── Slash Trails ──
      for (const trail of trails) {
        const tx = trail.x - sCamX;
        const ty = trail.y + sCamY;
        const alpha = trail.life / trail.maxLife;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(tx, ty);

        if (trail.type === 'slash') {
          ctx.strokeStyle = trail.color;
          ctx.lineWidth = 4 * alpha;
          ctx.beginPath();
          ctx.arc(0, 0, 28, -0.8, 0.8);
          ctx.stroke();
          // Inner glow
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 2 * alpha;
          ctx.beginPath();
          ctx.arc(0, 0, 22, -0.5, 0.5);
          ctx.stroke();
        } else if (trail.type === 'kick') {
          ctx.strokeStyle = trail.color;
          ctx.lineWidth = 5 * alpha;
          ctx.beginPath();
          ctx.arc(0, 0, 32, -0.5, 1.4);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 2 * alpha;
          ctx.beginPath();
          ctx.arc(0, 0, 26, -0.3, 1.2);
          ctx.stroke();
        } else if (trail.type === 'special') {
          // Big explosion arc
          ctx.strokeStyle = trail.color;
          ctx.lineWidth = 7 * alpha;
          ctx.beginPath();
          ctx.arc(0, 0, 38, -1.0, 1.8);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3 * alpha;
          ctx.beginPath();
          ctx.arc(0, 0, 30, -0.7, 1.5);
          ctx.stroke();
          // Radial lines
          for (let r = 0; r < 5; r++) {
            const angle = -0.6 + r * 0.45;
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 40, Math.sin(angle) * 40);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // ── Projectiles ──
      for (const p of projectiles) {
        const px = p.x - sCamX;
        const py = p.y + sCamY;
        if (px < -20 || px > CANVAS_W + 20) continue;

        // Trail
        if (p.trail.length > 1) {
          ctx.strokeStyle = `${p.color}55`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x - sCamX, p.trail[0].y + sCamY);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x - sCamX, p.trail[t].y + sCamY);
          }
          ctx.lineTo(px, py);
          ctx.stroke();
        }

        // Projectile body
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, p.isPlayer ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();
        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Sparks ──
      for (const s of sparks) {
        const sx = s.x - sCamX;
        const sy = s.y + sCamY;
        if (sx < -10 || sx > CANVAS_W + 10) continue;
        const alpha = s.life / s.maxLife;
        ctx.fillStyle = `${s.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Player Drawing ──
      const px = player.x - sCamX;
      const py = player.y + sCamY;
      ctx.save();
      ctx.translate(px, py);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(player.w / 2, player.h + 5, player.w / 2 + 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shield effect
      if (player.shieldActive > 0) {
        const shieldAlpha = 0.3 + Math.sin(frame * 0.12) * 0.2;
        ctx.strokeStyle = `rgba(251, 191, 36, ${shieldAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.w * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        // Second ring
        ctx.strokeStyle = `rgba(251, 191, 36, ${shieldAlpha * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.w * 1.5 + Math.sin(frame * 0.1) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Invincible flash
      if (player.invincible > 0 && player.invincible % 4 < 2) {
        ctx.globalAlpha = 0.45;
      }

      // Speed boost aura
      if (player.speedBoost > 0) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.w * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Damage boost aura
      if (player.damageBoost > 0) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -frame * 0.5;
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.w * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Animation state params ──
      // Use absolute pixel values for clear proportions (PLAYER_W=42, PLAYER_H=62)
      const cx = player.w / 2;       // center X = 21
      const headY = 8;               // head center Y (near top)
      const headR = 5.5;             // smaller head radius
      const neckY = headY + headR;   // ~13.5
      const torsoTop = neckY + 1;    // ~14.5
      const hipY = 44;               // hips at 44 (leaves 18px for legs)
      const bodyBot = hipY;          // bottom of torso = hip level
      const flash = player.hitFlash > 0 && player.hitFlash % 2 === 0;
      const isWalking = player.animState === 'walk';
      const isRunning = player.animState === 'run';
      const isJumpUp = player.animState === 'jump_up';
      const isJumpDown = player.animState === 'jump_down';
      const isAttacking = player.animState === 'attack_special';
      const isHurt = player.animState === 'hurt';
      const isPickup = player.animState === 'pickup';
      const facing = player.facing;

      // ── Walking bounce (fixes crab walk) ──
      const walkCycle = frame * 0.18;
      const runCycle = frame * 0.25;
      const cycleSpeed = isRunning ? runCycle : walkCycle;
      const moving = isWalking || isRunning;
      const legSwing = moving ? Math.sin(cycleSpeed) * 0.7 : 0;
      const armSwing = moving ? Math.sin(cycleSpeed + Math.PI) * 0.55 : 0;
      // Body bounce: slight up/down when feet land
      const bounceY = moving ? Math.abs(Math.sin(cycleSpeed)) * 3 : 0;
      const jumpLegAngle = isJumpUp ? 0.5 : isJumpDown ? -0.3 : 0;
      const attackPhase = isAttacking ? ((10 - player.attackTimer) / 10) : 0;
      const breathe = Math.sin(frame * 0.04) * 0.5;

      // Color palette
      const skinColor = flash ? '#ffffff' : '#ffe4d0';
      const dressColor = flash ? '#e8d0ff' : '#a855f7';
      const dressDark = flash ? '#c8b0e0' : '#7c3aed';
      const shoeColor = flash ? '#666' : '#3d1c10';
      const hairTop = flash ? '#ffdde8' : '#ff7eb3';
      const hairDark = flash ? '#ffcce0' : '#e85d8a';
      const eyeColor = '#2d1810';

      // ── Helper: draw rounded limb ──
      const drawLimb = (ox: number, oy: number, len: number, angle: number, tk: number, color: string) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-tk / 2, 0, tk, len, tk / 2);
        ctx.fill();
        ctx.restore();
        return { x: ox + Math.sin(angle) * len, y: oy + Math.cos(angle) * len };
      };

      // ── Apply body bounce ──
      const byBase = bounceY;

      // ═══ LEGS (drawn first - behind dress) ═══
      const lHipX = cx - 7;
      const rHipX = cx + 7;
      const thighLen = 11;
      const shinLen = 9;
      const hipBaseY = hipY - byBase;

      if (isJumpUp) {
        drawLimb(lHipX, hipBaseY, 7, -0.5 + jumpLegAngle, 4, skinColor);
        drawLimb(rHipX, hipBaseY, 7, -0.5 - jumpLegAngle, 4, skinColor);
        ctx.fillStyle = shoeColor;
        ctx.beginPath();
        ctx.ellipse(lHipX + 3, hipBaseY + 6, 4, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(rHipX - 3, hipBaseY + 6, 4, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Left leg
        const lThighA = -0.15 + legSwing;
        const lKnee = drawLimb(lHipX, hipBaseY, thighLen, lThighA, 4.5, skinColor);
        const lShinA = lThighA + 0.2 + (legSwing > 0 ? 0.35 : -0.2);
        const lFoot = drawLimb(lKnee.x, lKnee.y, shinLen, lShinA, 3.5, skinColor);

        // Right leg
        const rThighA = -0.15 - legSwing;
        const rKnee = drawLimb(rHipX, hipBaseY, thighLen, rThighA, 4.5, skinColor);
        const rShinA = rThighA + 0.2 + (legSwing < 0 ? 0.35 : -0.2);
        const rFoot = drawLimb(rKnee.x, rKnee.y, shinLen, rShinA, 3.5, skinColor);

        // Shoes
        const drawShoe = (fx: number, fy: number, ang: number) => {
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(ang);
          ctx.fillStyle = shoeColor;
          ctx.beginPath();
          ctx.roundRect(-4, -1, 8, 3.5, 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(-3, -1, 4, 2);
          ctx.restore();
        };
        drawShoe(lFoot.x, lFoot.y, lShinA);
        drawShoe(rFoot.x, rFoot.y, rShinA);
      }

      // ═══ TORSO (dress) ═══
      const torsoH = hipY - torsoTop; // ~29px
      const leanAngle = isRunning ? 0.08 : isWalking ? 0.04 : 0;

      ctx.save();
      ctx.translate(cx, torsoTop - byBase);
      ctx.rotate(leanAngle * facing);
      // Shadow under dress
      ctx.fillStyle = dressColor;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-8, 3);
      ctx.lineTo(8, 3);
      ctx.lineTo(9, 0);
      ctx.lineTo(12, torsoH);
      ctx.lineTo(-12, torsoH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dressDark;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Waist ribbon
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-12.5, torsoH - 5, 25, 3.5);
      // Center line
      ctx.strokeStyle = dressDark;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(0, torsoH - 8);
      ctx.stroke();
      ctx.restore();

      // ═══ ARMS ═══
      const shoulderY = torsoTop + 5;
      const lShoulderX = cx - 9;
      const rShoulderX = cx + 9;
      const upperLen = 9;
      const foreLen = 8;

      if (isAttacking) {
        const atkAngle = attackPhase < 0.5 ? -0.7 + attackPhase * 2.5 : -0.7 + (1 - attackPhase) * 2.5;
        // Left arm (back)
        const lElbow = drawLimb(lShoulderX, shoulderY - byBase, upperLen, -0.3, 3.5, skinColor);
        drawLimb(lElbow.x, lElbow.y, foreLen, -0.1, 3, skinColor);
        // Right arm (attacking forward)
        const rUpper = drawLimb(rShoulderX, shoulderY - byBase, upperLen, atkAngle * facing, 3.5, skinColor);
        const rHand = drawLimb(rUpper.x, rUpper.y, foreLen, atkAngle * facing + 0.1, 3, skinColor);
        if (player.weapon && player.attackTimer > 2) {
          ctx.save();
          ctx.translate(rHand.x, rHand.y);
          ctx.rotate(atkAngle * facing + 0.5);
          drawWeapon(1, player.weapon);
          ctx.restore();
        }
      } else if (isHurt) {
        drawLimb(lShoulderX, shoulderY - byBase, upperLen, -1.0, 3.5, skinColor);
        drawLimb(rShoulderX, shoulderY - byBase, upperLen, -1.0, 3.5, skinColor);
      } else if (isPickup) {
        const celA = -1.4 + Math.sin(player.pickupCelebrate * 0.5) * 0.3;
        drawLimb(lShoulderX, shoulderY - byBase, upperLen, celA, 3.5, skinColor);
        drawLimb(rShoulderX, shoulderY - byBase, upperLen, celA, 3.5, skinColor);
      } else {
        // Walking arm swing - left arm forward when right leg forward
        const lElbow = drawLimb(lShoulderX, shoulderY - byBase, upperLen, -0.2 + armSwing, 3.5, skinColor);
        drawLimb(lElbow.x, lElbow.y, foreLen, -0.15 + armSwing * 0.5, 3, skinColor);

        const rElbow = drawLimb(rShoulderX, shoulderY - byBase, upperLen, -0.2 - armSwing, 3.5, skinColor);
        const rHand = drawLimb(rElbow.x, rElbow.y, foreLen, -0.15 - armSwing * 0.5, 3, skinColor);

        if (player.weapon) {
          ctx.save();
          ctx.translate(rHand.x, rHand.y);
          ctx.rotate((-0.15 - armSwing * 0.5) + 0.6);
          drawWeapon(1, player.weapon);
          ctx.restore();
        }
      }

      // ═══ HEAD (smaller, no rotation) ═══
      const headCenterY = headY - byBase;

      // Hair behind
      ctx.fillStyle = hairDark;
      ctx.beginPath();
      ctx.ellipse(cx, headCenterY, headR + 4, headR + 2, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Side strands
      ctx.fillStyle = hairTop;
      ctx.fillRect(cx - 8, headCenterY + 2, 2.5, 6);
      ctx.fillRect(cx + 5.5, headCenterY + 2, 2.5, 6);

      // Hair top bun
      ctx.fillStyle = hairTop;
      ctx.beginPath();
      ctx.ellipse(cx, headCenterY - headR, headR + 4, headR - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Side hair
      ctx.beginPath();
      ctx.arc(cx - 7, headCenterY - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 7, headCenterY - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      // Hair front
      ctx.beginPath();
      ctx.ellipse(cx, headCenterY + 1, headR + 3, headR + 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Face
      ctx.fillStyle = hairDark;
      ctx.beginPath();
      ctx.ellipse(cx, headCenterY + 2, headR + 2, headR - 0.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(cx, headCenterY + 2, headR - 1, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      let eyeClose = false;
      if (isHurt) eyeClose = player.hitFlash % 4 < 2;

      if (!eyeClose) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx - 2.2, headCenterY + 1, 2, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 2.2, headCenterY + 1, 2, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(cx - 1.8, headCenterY + 1, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 2.6, headCenterY + 1, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 1.2, headCenterY + 0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 3.2, headCenterY + 0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = eyeColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, headCenterY + 1);
        ctx.lineTo(cx - 0.5, headCenterY + 2.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 4, headCenterY + 1);
        ctx.lineTo(cx + 0.5, headCenterY + 2.5);
        ctx.stroke();
      }

      // Brows
      ctx.strokeStyle = hairDark;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - 4, headCenterY - 0.5);
      ctx.quadraticCurveTo(cx - 2, headCenterY - 1.5, cx, headCenterY - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 4, headCenterY - 0.5);
      ctx.quadraticCurveTo(cx + 2, headCenterY - 1.5, cx, headCenterY - 0.3);
      ctx.stroke();

      // Mouth
      let mouthY = headCenterY + 4;
      let mouthOpen = 0;
      if (isAttacking && attackPhase > 0.3 && attackPhase < 0.7) mouthOpen = 1.5;
      if (isHurt) { mouthOpen = 2; mouthY += 0.5; }

      if (mouthOpen > 0) {
        ctx.fillStyle = '#e8536a';
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, 1.5, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#e8536a';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(cx, mouthY, 1.3, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      // Blush
      ctx.fillStyle = 'rgba(255,150,160,0.2)';
      ctx.beginPath();
      ctx.ellipse(cx - 4.5, headCenterY + 3, 1.8, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 4.5, headCenterY + 3, 1.8, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.restore();

      // Player name / state indicator
      const stateLabel = (() => {
        switch (player.animState) {
          case 'idle': return '待机';
          case 'walk': return '行走';
          case 'run': return '奔跑';
          case 'jump_up': case 'jump_down': return '跳跃';
          case 'attack_special': return '攻击';
          case 'hurt': return '受伤';
          case 'pickup': return '拾取';
          default: return '';
        }
      })();
      if (stateLabel && player.animState !== 'idle') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(stateLabel, px + player.w / 2, py - 8);
      }

      // ── Damage Numbers ──
      for (const dn of dmgNums) {
        const dnx = dn.x - sCamX;
        const dny = dn.y + sCamY;
        const alpha = dn.life / dn.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = dn.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(dn.text, dnx, dny);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── HUD ──
      const hudX = 20;
      const hudY = 20;

      // HP bar background
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(hudX - 4, hudY - 4, 210, 50, 6);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('❤️', hudX, hudY + 12);

      // HP bar
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(hudX + 24, hudY + 2, 170, 15, 3);
      ctx.fill();
      const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
      const hpGrad = ctx.createLinearGradient(hudX + 24, 0, hudX + 194, 0);
      hpGrad.addColorStop(0, '#ef4444');
      hpGrad.addColorStop(0.4, '#facc15');
      hpGrad.addColorStop(1, '#22c55e');
      ctx.fillStyle = hpGrad;
      ctx.beginPath();
      ctx.roundRect(hudX + 24, hudY + 2, 170 * hpRatio, 15, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, hudX + 109, hudY + 14);

      // Weapon indicator
      if (player.weapon) {
        const wEmoji = player.weapon === 'sword' ? '⚔️' : '🪓';
        const wName = player.weapon === 'sword' ? '长剑' : '巨斧';
        ctx.fillStyle = '#facc15';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${wEmoji} ${wName}  ATK+${player.weapon === 'sword' ? 10 : 16}`, hudX, hudY + 34);
      }

      // Buff indicators
      let buffX = hudX + 100;
      if (player.speedBoost > 0) {
        ctx.fillStyle = '#3b82f6';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        const secLeft = Math.ceil(player.speedBoost / 60);
        ctx.fillText(`💨 ${secLeft}s`, buffX, hudY + 34);
        buffX += 45;
      }
      if (player.damageBoost > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        const secLeft = Math.ceil(player.damageBoost / 60);
        ctx.fillText(`💥 ${secLeft}s`, buffX, hudY + 34);
        buffX += 45;
      }
      if (player.shieldActive > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        const secLeft = Math.ceil(player.shieldActive / 60);
        ctx.fillText(`🛡️ ${secLeft}s`, buffX, hudY + 34);
      }

      // Enemies count
      const aliveCount = enemies.filter(e => e.alive && e.dying <= 0).length;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`👹 敌人: ${aliveCount}`, CANVAS_W - 20, hudY + 16);

      // Combo display
      if (player.comboCount >= 3) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fillText(`🔥 ${player.comboCount} COMBO!`, CANVAS_W / 2, hudY + 42);
        ctx.shadowBlur = 0;
      }

      // Section indicator
      let sectionName = '';
      if (player.x < 1150) sectionName = '区域 1 · 起始平原';
      else if (player.x < 2280) sectionName = '区域 2 · 丘陵地带';
      else if (player.x < 3020) sectionName = '区域 3 · 暗影峡谷';
      else if (player.x < 4020) sectionName = '区域 4 · 烈焰阶梯';
      else sectionName = '区域 5 · 魔王之巅';

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sectionName, CANVAS_W / 2, hudY + 16);

      // Progress bar
      const progress = player.x / WORLD_W;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(20, CANVAS_H - 18, CANVAS_W - 40, 8, 4);
      ctx.fill();
      const progGrad = ctx.createLinearGradient(20, 0, CANVAS_W - 20, 0);
      progGrad.addColorStop(0, '#22d3ee');
      progGrad.addColorStop(0.5, '#a855f7');
      progGrad.addColorStop(1, '#facc15');
      ctx.fillStyle = progGrad;
      ctx.beginPath();
      ctx.roundRect(20, CANVAS_H - 18, (CANVAS_W - 40) * progress, 8, 4);
      ctx.fill();
      // Player dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20 + (CANVAS_W - 40) * progress, CANVAS_H - 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(20 + (CANVAS_W - 40) * progress, CANVAS_H - 14, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Controls hint
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(CANVAS_W / 2 - 260, 56, 520, 24, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🖱️ 左=拳 右=踢 中=大招 侧4=跳 侧5=大招 | ⌨️ A/D/W 移动跳跃 J/K/L 拳踢大招 F=远程射击', CANVAS_W / 2, 72);

      // Tip
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('静止=回血 | F键=远程攻击 | 拾取武器和道具强化自己', CANVAS_W - 20, CANVAS_H - 26);
    };

    // Weapon drawing helper
    function drawWeapon(s: number, weapon: WeaponType) {
      if (weapon === 'sword') {
        // Blade
        const bladeLen = s * 22;
        const bladeGrad = ctx.createLinearGradient(0, 0, bladeLen, 0);
        bladeGrad.addColorStop(0, '#e8e8e8');
        bladeGrad.addColorStop(0.3, '#ffffff');
        bladeGrad.addColorStop(0.6, '#d0d0d0');
        bladeGrad.addColorStop(1, '#b0b0b0');
        ctx.fillStyle = bladeGrad;
        ctx.fillRect(0, -s * 1.2, bladeLen, s * 2.4);
        // Edge line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bladeLen * 0.2, -s * 0.6);
        ctx.lineTo(bladeLen, -s * 0.3);
        ctx.stroke();
        // Guard
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-s * 1.5, -s * 3.5, s * 5, s * 7);
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-s * 1.5, -s * 3.5, s * 5, s * 7);
        // Handle
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-s * 2.5, -s * 1.8, s * 4, s * 3.6);
        // Pommel
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(-s * 0.5, 0, s * 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(34,211,238,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, -s * 1.2, bladeLen, s * 2.4);
        ctx.shadowBlur = 0;
      } else if (weapon === 'axe') {
        const handleLen = s * 20;
        // Handle
        ctx.fillStyle = '#6b3a1f';
        ctx.fillRect(-s * 1.5, 0, handleLen, s * 3);
        const hGrad = ctx.createLinearGradient(-s, 0, s, 0);
        hGrad.addColorStop(0, '#5a2a10');
        hGrad.addColorStop(0.5, '#8b4513');
        hGrad.addColorStop(1, '#5a2a10');
        ctx.fillStyle = hGrad;
        ctx.fillRect(0, -s * 1.5, handleLen - s, s * 3);
        // Axe head
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(handleLen - s * 3, -s * 3);
        ctx.lineTo(handleLen + s * 5, -s * 7);
        ctx.lineTo(handleLen + s * 8, -s * 4);
        ctx.lineTo(handleLen + s * 6, s * 7);
        ctx.lineTo(handleLen - s * 3, s * 3);
        ctx.closePath();
        ctx.fill();
        // Edge highlight
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(handleLen + s * 5, -s * 6);
        ctx.lineTo(handleLen + s * 7, -s * 3);
        ctx.stroke();
        // Glow
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(249,115,22,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState]);

  // ── Input Handling ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current.add(key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ── Mouse Controls ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      e.preventDefault();
      switch (e.button) {
        case 0: keysRef.current.add('j'); break;
        case 1: keysRef.current.add('l'); break;
        case 2: keysRef.current.add('k'); break;
        case 3: keysRef.current.add('jump'); break;
        case 4: keysRef.current.add('l'); break;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      switch (e.button) {
        case 0: keysRef.current.delete('j'); break;
        case 1: keysRef.current.delete('l'); break;
        case 2: keysRef.current.delete('k'); break;
        case 3: keysRef.current.delete('jump'); break;
        case 4: keysRef.current.delete('l'); break;
      }
    };

    const handleContextMenu = (e: Event) => { e.preventDefault(); };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const handleStart = () => {
    initGame();
    setGameState('playing');
    startBGM();
  };

  const handleRestart = () => {
    initGame();
    setGameState('playing');
    startBGM();
  };

  const touchStart = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (gameStateRef.current !== 'playing') return;
    keysRef.current.add(key);
  };
  const touchEnd = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.delete(key);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-charcoal flex flex-col items-center justify-start p-2 md:p-4 md:justify-center">
      <div className="mb-2 text-center">
        <h1 className="text-xl md:text-3xl font-bold text-white font-display mb-1">
          <span className="gradient-text">格斗闯关</span>
        </h1>
        <p className="text-silver-gray/60 text-xs md:text-sm">
          横板格斗 · 多变地形 · 收集武器 · 远程攻击 · 击败魔王
        </p>
      </div>

      <div className="relative" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
        <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CANVAS_W, height: CANVAS_H }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="border-2 border-neon-blue/30 rounded-lg shadow-lg shadow-neon-blue/20 block"
          />

          {gameState === 'menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-lg">
              <Swords className="w-16 h-16 text-neon-blue mb-4" />
              <button onClick={handleStart} className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 via-neon-purple to-neon-blue text-white font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-red-500/30">
                <Play className="w-6 h-6" />
                开始闯关
              </button>
              <div className="mt-6 text-silver-gray text-sm text-center max-w-md px-4 space-y-1">
                <p><span className="text-neon-blue font-bold">A/D</span> 移动 · <span className="text-neon-blue font-bold">W/空格</span> 跳跃</p>
                <p><span className="text-yellow-400 font-bold">J/左键</span> 拳击 · <span className="text-orange-400 font-bold">K/右键</span> 踢击 · <span className="text-red-400 font-bold">L/中键</span> 大招</p>
                <p><span className="text-purple-400 font-bold">F</span> 远程攻击 · 连点J三次=三连击</p>
                <p><span className="text-purple-400 font-bold">侧键4</span>=跳 · <span className="text-purple-400 font-bold">侧键5</span>=大招</p>
                <p>静止不动<span className="text-green-400">缓慢回血</span>，场景有<span className="text-yellow-400">沟壑</span>小心跌落</p>
                <p className="text-silver-gray/60 text-xs">5个区域 · 18个敌人 · 多变地形 · 武器&道具收集</p>
              </div>
            </div>
          )}

          {gameState === 'victory' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded-lg">
              <Star className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-4xl font-bold text-white font-display mb-2 gradient-text">闯关成功!</h2>
              <p className="text-silver-gray mb-2">你征服了多变地形，击败了所有敌人！</p>
              <p className="text-light-gray mb-8">准备好进入下一关了吗？</p>
              <div className="flex gap-4">
                <button onClick={handleRestart} className="inline-flex items-center gap-2 px-6 py-3 glass-effect text-white rounded-full hover:scale-105 transition-transform">
                  <RotateCcw className="w-5 h-5" />
                  重新挑战
                </button>
                <button onClick={() => { stopBGM(); onCompleteGame(); }} className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 text-white font-bold rounded-full hover:scale-110 transition-transform shadow-lg shadow-neon-blue/30">
                  <Star className="w-5 h-5" />
                  下一关
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Touch Controls */}
      <div className="mt-3 md:hidden flex gap-2 select-none justify-center flex-wrap">
        <button onTouchStart={touchStart('a')} onTouchEnd={touchEnd('a')} onMouseDown={touchStart('a')} onMouseUp={touchEnd('a')}
          className="w-14 h-14 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 touch-none">◀</button>
        <button onTouchStart={touchStart('jump')} onTouchEnd={touchEnd('jump')} onMouseDown={touchStart('jump')} onMouseUp={touchEnd('jump')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 flex items-center justify-center text-white active:scale-95 touch-none">⬆</button>
        <button onTouchStart={touchStart('d')} onTouchEnd={touchEnd('d')} onMouseDown={touchStart('d')} onMouseUp={touchEnd('d')}
          className="w-14 h-14 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 touch-none">▶</button>
        <button onTouchStart={touchStart('j')} onTouchEnd={touchEnd('j')} onMouseDown={touchStart('j')} onMouseUp={touchEnd('j')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white active:scale-95 touch-none">👊</button>
        <button onTouchStart={touchStart('k')} onTouchEnd={touchEnd('k')} onMouseDown={touchStart('k')} onMouseUp={touchEnd('k')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white active:scale-95 touch-none">🦶</button>
        <button onTouchStart={touchStart('f')} onTouchEnd={touchEnd('f')} onMouseDown={touchStart('f')} onMouseUp={touchEnd('f')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white active:scale-95 touch-none">🔫</button>
      </div>

      <div className="mt-3 flex gap-4">
        <button onClick={handleRestart} className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base">
          <RotateCcw className="w-4 h-4" /> 重新开始
        </button>
      </div>
    </div>
  );
};

export default BeatEmUpGame;
