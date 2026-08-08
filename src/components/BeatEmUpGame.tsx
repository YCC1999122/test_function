import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Swords, Star } from 'lucide-react';
import { useGameAudio } from './GameAudio';

// ── Constants ──
const CANVAS_W = 960;
const CANVAS_H = 540;
const WORLD_W = 5200;
const GRAVITY = 0.65;
const GROUND_Y = CANVAS_H - 60;

// Player
const PLAYER_W = 32;
const PLAYER_H = 52;
const PLAYER_MAX_HP = 100;
const REGEN_DELAY = 120;   // frames idle before regen starts
const REGEN_RATE = 0.04;    // HP per frame after delay

// ── Types ──
type Facing = 1 | -1;
type WeaponType = 'sword' | 'axe' | null;
type BuffType = 'health' | 'speed' | 'damage' | 'shield';
type EnemyType = 'grunt' | 'runner' | 'tank' | 'boss';

interface Fighter {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  facing: Facing;
  onGround: boolean;
  attackTimer: number;
  attackCooldown: number;
  comboCount: number;
  comboTimer: number;
  hitFlash: number;
  invincible: number;
  idleFrames: number;
  // Buffs
  speedBoost: number;
  damageBoost: number;
  shieldActive: number;
  // Weapon
  weapon: WeaponType;
}

interface Enemy {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  type: EnemyType;
  alive: boolean;
  hitFlash: number;
  onGround: boolean;
  aiTimer: number;
  aiState: 'idle' | 'chase' | 'attack' | 'retreat';
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
}

interface DamageNumber {
  x: number; y: number;
  value: number;
  life: number;
  color: string;
}

// ── Level Data ──
const GROUND_PLATFORMS = [
  { x: 0, y: GROUND_Y, w: 500, h: 30 },
  { x: 520, y: GROUND_Y, w: 400, h: 30 },
  { x: 940, y: GROUND_Y, w: 300, h: 30 },
  { x: 1280, y: GROUND_Y, w: 500, h: 30 },
  { x: 1820, y: GROUND_Y, w: 350, h: 30 },
  { x: 2210, y: GROUND_Y, w: 400, h: 30 },
  { x: 2650, y: GROUND_Y, w: 300, h: 30 },
  { x: 2990, y: GROUND_Y, w: 450, h: 30 },
  { x: 3480, y: GROUND_Y, w: 400, h: 30 },
  { x: 3920, y: GROUND_Y, w: 350, h: 30 },
  { x: 4310, y: GROUND_Y, w: 500, h: 30 },
  { x: 4850, y: GROUND_Y, w: 350, h: 30 },
];

const ELEVATED_PLATFORMS = [
  // Section 1 platforms
  { x: 180, y: GROUND_Y - 90, w: 130, h: 16 },
  { x: 380, y: GROUND_Y - 70, w: 100, h: 16 },
  // Section 2 platforms
  { x: 1100, y: GROUND_Y - 100, w: 140, h: 16 },
  { x: 1400, y: GROUND_Y - 60, w: 120, h: 16 },
  { x: 1600, y: GROUND_Y - 120, w: 100, h: 16 },
  // Section 3 platforms
  { x: 2100, y: GROUND_Y - 80, w: 150, h: 16 },
  { x: 2450, y: GROUND_Y - 110, w: 130, h: 16 },
  { x: 2750, y: GROUND_Y - 70, w: 140, h: 16 },
  // Section 4 platforms
  { x: 3050, y: GROUND_Y - 100, w: 160, h: 16 },
  { x: 3350, y: GROUND_Y - 60, w: 120, h: 16 },
  { x: 3600, y: GROUND_Y - 130, w: 140, h: 16 },
  { x: 3850, y: GROUND_Y - 90, w: 130, h: 16 },
  // Section 5 platforms
  { x: 4150, y: GROUND_Y - 100, w: 150, h: 16 },
  { x: 4450, y: GROUND_Y - 70, w: 140, h: 16 },
  { x: 4650, y: GROUND_Y - 120, w: 130, h: 16 },
];

const ENEMIES: Enemy[] = [
  // Section 1 - easy intro
  { x: 350, y: GROUND_Y - 30, w: 28, h: 30, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'grunt', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 600, y: GROUND_Y - 30, w: 28, h: 30, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'grunt', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  // Section 2 - mixed
  { x: 1050, y: GROUND_Y - 30, w: 24, h: 26, vx: 0, vy: 0, hp: 2, maxHp: 2, type: 'runner', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 1250, y: GROUND_Y - 30, w: 28, h: 30, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'grunt', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 1500, y: GROUND_Y - 30, w: 24, h: 26, vx: 0, vy: 0, hp: 2, maxHp: 2, type: 'runner', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 1700, y: GROUND_Y - 36, w: 36, h: 36, vx: 0, vy: 0, hp: 6, maxHp: 6, type: 'tank', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  // Section 3
  { x: 2050, y: GROUND_Y - 30, w: 28, h: 30, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'grunt', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 2250, y: GROUND_Y - 30, w: 24, h: 26, vx: 0, vy: 0, hp: 2, maxHp: 2, type: 'runner', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 2400, y: GROUND_Y - 36, w: 36, h: 36, vx: 0, vy: 0, hp: 6, maxHp: 6, type: 'tank', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 2600, y: GROUND_Y - 30, w: 24, h: 26, vx: 0, vy: 0, hp: 2, maxHp: 2, type: 'runner', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  // Section 4 - heavy
  { x: 3000, y: GROUND_Y - 30, w: 28, h: 30, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'grunt', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 3200, y: GROUND_Y - 36, w: 36, h: 36, vx: 0, vy: 0, hp: 6, maxHp: 6, type: 'tank', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 3450, y: GROUND_Y - 30, w: 28, h: 30, vx: 0, vy: 0, hp: 3, maxHp: 3, type: 'grunt', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 3650, y: GROUND_Y - 30, w: 24, h: 26, vx: 0, vy: 0, hp: 2, maxHp: 2, type: 'runner', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  // Section 5 - boss
  { x: 4500, y: GROUND_Y - 50, w: 48, h: 50, vx: 0, vy: 0, hp: 20, maxHp: 20, type: 'boss', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
  { x: 4650, y: GROUND_Y - 30, w: 24, h: 26, vx: 0, vy: 0, hp: 2, maxHp: 2, type: 'runner', alive: true, hitFlash: 0, onGround: true, aiTimer: 0, aiState: 'idle' },
];

const PICKUPS: Pickup[] = [
  // Section 2 - first weapon
  { x: 1150, y: GROUND_Y - 50, type: 'weapon', subtype: 'sword', collected: false, bobOffset: 0 },
  // Section 2 - health
  { x: 1550, y: GROUND_Y - 50, type: 'buff', subtype: 'health', collected: false, bobOffset: 20 },
  // Section 3 - axe
  { x: 2200, y: GROUND_Y - 50, type: 'weapon', subtype: 'axe', collected: false, bobOffset: 40 },
  // Section 3 - speed boost
  { x: 2550, y: GROUND_Y - 50, type: 'buff', subtype: 'speed', collected: false, bobOffset: 60 },
  // Section 4 - health
  { x: 3150, y: GROUND_Y - 50, type: 'buff', subtype: 'health', collected: false, bobOffset: 80 },
  // Section 4 - damage boost
  { x: 3550, y: GROUND_Y - 50, type: 'buff', subtype: 'damage', collected: false, bobOffset: 100 },
  // Section 4 - shield
  { x: 3800, y: GROUND_Y - 50, type: 'buff', subtype: 'shield', collected: false, bobOffset: 120 },
  // Section 5 - health before boss
  { x: 4200, y: GROUND_Y - 50, type: 'buff', subtype: 'health', collected: false, bobOffset: 140 },
  { x: 4400, y: GROUND_Y - 50, type: 'buff', subtype: 'damage', collected: false, bobOffset: 160 },
];

const VICTORY_X = 4980;

// ── Helpers ──
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ── Component ──
const BeatEmUpGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory'>('menu');
  const [scale, setScale] = useState(1);
  const [enemiesLeft, setEnemiesLeft] = useState(ENEMIES.length);

  const { hit: playHit, select, victory: playVictory, pop, startBGM, stopBGM } = useGameAudio();

  const playerRef = useRef<Fighter>(createPlayer());
  const enemiesRef = useRef<Enemy[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const cameraRef = useRef(0);
  const animRef = useRef(0);
  const frameRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const isPlayingRef = useRef(false);

  function createPlayer(): Fighter {
    return {
      x: 100, y: GROUND_Y - PLAYER_H,
      w: PLAYER_W, h: PLAYER_H,
      vx: 0, vy: 0,
      hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
      facing: 1, onGround: true,
      attackTimer: 0, attackCooldown: 0,
      comboCount: 0, comboTimer: 0,
      hitFlash: 0, invincible: 0,
      idleFrames: 0,
      speedBoost: 0, damageBoost: 0, shieldActive: 0,
      weapon: null,
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
    enemiesRef.current = ENEMIES.map(e => ({ ...e, alive: true, hitFlash: 0, aiTimer: 0, aiState: 'idle' as const }));
    pickupsRef.current = PICKUPS.map(p => ({ ...p, collected: false }));
    projectilesRef.current = [];
    damageNumbersRef.current = [];
    keysRef.current.clear();
    cameraRef.current = 0;
    frameRef.current = 0;
    setEnemiesLeft(ENEMIES.length);
  }, []);

  // ── Game Loop ──
  useEffect(() => {
    if (gameState !== 'playing') return;
    isPlayingRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const allPlatforms = [...GROUND_PLATFORMS, ...ELEVATED_PLATFORMS];

    const loop = () => {
      if (gameStateRef.current !== 'playing') { isPlayingRef.current = false; return; }
      frameRef.current++;

      const player = playerRef.current;
      const enemies = enemiesRef.current;
      const pickups = pickupsRef.current;
      const projectiles = projectilesRef.current;
      const dmgNums = damageNumbersRef.current;
      const keys = keysRef.current;

      // ── Player Input ──
      let dir = 0;
      if (keys.has('a') || keys.has('arrowleft')) dir -= 1;
      if (keys.has('d') || keys.has('arrowright')) dir += 1;

      // Track idle for regen
      const isMoving = dir !== 0;
      const wantsJump = keys.has('w') || keys.has('arrowup') || keys.has(' ') || keys.has('jump');
      const wantsPunch = keys.has('j');
      const wantsKick = keys.has('k');
      const wantsSpecial = keys.has('l');

      if (isMoving) {
        player.idleFrames = 0;
        player.facing = dir > 0 ? 1 : -1;
      } else {
        player.idleFrames++;
      }

      // Regen
      if (player.idleFrames > REGEN_DELAY && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + REGEN_RATE);
      }

      // Speed
      const moveSpeed = 4 + (player.speedBoost > 0 ? 2.5 : 0);
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

      const doAttack = (baseDmg: number, range: number, cooldown: number, slashColor: string, vfxSize: number) => {
        if (player.attackCooldown > 0) return;
        player.attackCooldown = cooldown;
        player.attackTimer = 10;
        player.idleFrames = 0;

        let dmg = baseDmg;
        if (player.weapon === 'sword') dmg += 8;
        if (player.weapon === 'axe') dmg += 14;
        if (player.damageBoost > 0) dmg *= 2;

        playHit();

        const atkX = player.facing === 1 ? player.x + player.w : player.x - range;
        const atkY = player.y + 8;
        const atkW = range;
        const atkH = player.h - 16;

        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (rectsOverlap({ x: atkX, y: atkY, w: atkW, h: atkH }, enemy)) {
            enemy.hp -= dmg;
            enemy.hitFlash = 8;
            enemy.aiState = 'chase';
            // Pushback
            enemy.vx = player.facing * 6;
            enemy.vy = -3;
            enemy.onGround = false;
            dmgNums.push({ x: enemy.x + enemy.w / 2, y: enemy.y - 10, value: dmg, life: 30, color: slashColor });
            if (enemy.hp <= 0) {
              enemy.alive = false;
              pop();
            }
          }
        }
      };

      if (wantsPunch) {
        player.comboCount++;
        player.comboTimer = 35;
        const comboMult = player.comboCount >= 3 ? 1.8 : 1;
        doAttack(Math.floor(10 * comboMult), 55, 18, player.comboCount >= 3 ? '#fbbf24' : '#00d4ff', player.comboCount >= 3 ? 1.4 : 1);
        if (player.comboCount >= 3) player.comboCount = 0;
      } else if (wantsKick) {
        player.comboCount = 0;
        doAttack(18, 65, 28, '#f97316', 1.2);
      } else if (wantsSpecial) {
        player.comboCount = 0;
        doAttack(30, 80, 60, '#ef4444', 1.6);
      }

      // Timers
      if (player.invincible > 0) player.invincible--;
      if (player.hitFlash > 0) player.hitFlash--;
      if (player.speedBoost > 0) player.speedBoost--;
      if (player.damageBoost > 0) player.damageBoost--;
      if (player.shieldActive > 0) player.shieldActive--;

      // ── Physics ──
      player.vy += GRAVITY;
      if (player.vy > 18) player.vy = 18;
      player.x += player.vx;
      player.y += player.vy;

      player.onGround = false;
      for (const plat of allPlatforms) {
        if (rectsOverlap(player, plat) && player.vy >= 0) {
          const prevBottom = player.y + player.h - player.vy;
          if (prevBottom <= plat.y + 4) {
            player.y = plat.y - player.h;
            player.vy = 0;
            player.onGround = true;
          }
        }
      }

      player.x = clamp(player.x, 0, WORLD_W - player.w);
      if (player.y > CANVAS_H + 80) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.hp -= 15;
        if (player.hp <= 0) player.hp = 1;
      }

      // ── Camera ──
      const targetCam = player.x - CANVAS_W * 0.35;
      cameraRef.current += (targetCam - cameraRef.current) * 0.1;
      cameraRef.current = clamp(cameraRef.current, 0, WORLD_W - CANVAS_W);

      // ── Enemies ──
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (enemy.hitFlash > 0) enemy.hitFlash--;

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
        if (enemy.y > CANVAS_H + 80) { enemy.alive = false; pop(); }

        // AI
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        enemy.aiTimer++;

        switch (enemy.type) {
          case 'grunt': {
            const speed = 1.6;
            if (dist < 300) {
              enemy.aiState = 'chase';
              if (Math.abs(dx) > 15) enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.3;
            } else {
              enemy.aiState = 'idle';
              if (enemy.aiTimer > 120) {
                enemy.vx += (Math.random() > 0.5 ? 1 : -1) * speed * 0.5;
                enemy.aiTimer = 0;
              }
            }
            if (dist < 55 && enemy.onGround && enemy.aiTimer % 60 === 0) {
              enemy.vx = (dx > 0 ? 1 : -1) * 4;
              enemy.vy = -5;
              enemy.onGround = false;
            }
            break;
          }
          case 'runner': {
            const speed = 3;
            if (dist < 400) {
              enemy.aiState = 'chase';
              enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.25;
            } else {
              enemy.aiState = 'idle';
              if (enemy.aiTimer > 80) {
                enemy.vx += (Math.random() > 0.5 ? 1 : -1) * speed * 0.6;
                enemy.aiTimer = 0;
              }
            }
            if (dist < 40 && enemy.onGround) {
              enemy.vx = (dx > 0 ? 1 : -1) * 5;
              enemy.vy = -6;
              enemy.onGround = false;
            }
            break;
          }
          case 'tank': {
            const speed = 1.2;
            if (dist < 350) {
              enemy.aiState = 'chase';
              if (Math.abs(dx) > 20) enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.2;
              // Charge attack
              if (dist < 200 && enemy.aiTimer > 100) {
                enemy.vx = (dx > 0 ? 1 : -1) * 8;
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
            const speed = 2;
            enemy.aiState = 'chase';
            if (Math.abs(dx) > 20) enemy.vx += (dx > 0 ? 1 : -1) * speed * 0.2;
            // Jump slam
            if (dist < 250 && enemy.onGround && enemy.aiTimer > 70) {
              enemy.vy = -12;
              enemy.vx = (dx > 0 ? 1 : -1) * 6;
              enemy.onGround = false;
              enemy.aiTimer = 0;
            }
            // Shoot projectile
            if (enemy.aiTimer > 130 && enemy.onGround) {
              projectiles.push({
                x: enemy.x + enemy.w / 2,
                y: enemy.y + enemy.h / 2,
                vx: (dx > 0 ? 1 : -1) * 4,
                vy: -2,
                life: 90,
                damage: 8,
              });
              enemy.aiTimer = 0;
            }
            break;
          }
        }

        // Enemy collision with player
        if (rectsOverlap(player, enemy) && player.invincible <= 0 && player.shieldActive <= 0) {
          const dmg = enemy.type === 'boss' ? 12 : enemy.type === 'tank' ? 8 : 5;
          player.hp -= dmg;
          player.invincible = 30;
          player.hitFlash = 10;
          player.idleFrames = 0;
          player.vx = -(dx > 0 ? 1 : -1) * 6;
          player.vy = -4;
          dmgNums.push({ x: player.x + player.w / 2, y: player.y - 5, value: dmg, life: 30, color: '#ff4444' });
        }
      }

      // ── Projectiles ──
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;

        if (p.life <= 0 || p.x < cameraRef.current - 100 || p.x > cameraRef.current + CANVAS_W + 100) {
          projectiles.splice(i, 1);
          continue;
        }

        // Hit player (circle-rect check)
        const closestX = Math.max(player.x, Math.min(p.x, player.x + player.w));
        const closestY = Math.max(player.y, Math.min(p.y, player.y + player.h));
        const hitDist = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);
        if (hitDist < 8 && player.invincible <= 0 && player.shieldActive <= 0) {
          player.hp -= p.damage;
          player.invincible = 25;
          player.hitFlash = 8;
          player.idleFrames = 0;
          damageNumbersRef.current.push({ x: player.x + player.w / 2, y: player.y, value: p.damage, life: 25, color: '#ff6666' });
          projectiles.splice(i, 1);
        }
      }

      // ── Pickups ──
      for (const pickup of pickups) {
        if (pickup.collected) continue;
        pickup.bobOffset = (pickup.bobOffset + 0.04) % (Math.PI * 2);
        if (rectsOverlap(player, { x: pickup.x - 15, y: pickup.y + Math.sin(pickup.bobOffset) * 5 - 15, w: 30, h: 30 })) {
          pickup.collected = true;
          select();
          if (pickup.type === 'weapon') {
            player.weapon = pickup.subtype as WeaponType;
          } else if (pickup.type === 'buff') {
            switch (pickup.subtype) {
              case 'health': player.hp = Math.min(player.maxHp, player.hp + 35); break;
              case 'speed': player.speedBoost = 360; break;
              case 'damage': player.damageBoost = 360; break;
              case 'shield': player.shieldActive = 300; break;
            }
          }
        }
      }

      // ── Damage Numbers ──
      for (let i = dmgNums.length - 1; i >= 0; i--) {
        dmgNums[i].y -= 1.2;
        dmgNums[i].life--;
        if (dmgNums[i].life <= 0) dmgNums.splice(i, 1);
      }

      // ── Check victory ──
      if (player.x > VICTORY_X && enemies.every(e => !e.alive || e.type === 'boss' ? !e.alive : true)) {
        const bossAlive = enemies.some(e => e.type === 'boss' && e.alive);
        if (!bossAlive || player.x > VICTORY_X) {
          if (!bossAlive || player.x >= VICTORY_X) {
            // Actually just check if at victory zone
            if (player.x >= VICTORY_X) {
              playVictory();
              setGameState('victory');
              stopBGM();
              return;
            }
          }
        }
      }

      // Check player death
      if (player.hp <= 0) {
        player.hp = 1;
        player.x = 100;
        player.y = GROUND_Y - PLAYER_H;
        player.vx = 0;
        player.vy = 0;
        player.invincible = 60;
      }

      // ── Count alive enemies ──
      setEnemiesLeft(enemies.filter(e => e.alive).length);

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
      const frame = frameRef.current;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, '#0a0a1a');
      bgGrad.addColorStop(0.5, '#0d1525');
      bgGrad.addColorStop(1, '#0a0f18');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Parallax mountains
      ctx.fillStyle = '#111827';
      for (let i = 0; i < 12; i++) {
        const mx = (i * 250 - cam * 0.2) % (CANVAS_W + 300) - 100;
        const mh = 80 + (i % 4) * 40;
        ctx.beginPath();
        ctx.moveTo(mx, CANVAS_H);
        ctx.lineTo(mx + 120, CANVAS_H - mh);
        ctx.lineTo(mx + 240, CANVAS_H);
        ctx.fill();
      }

      // Parallax buildings
      ctx.fillStyle = '#1a1a2e';
      for (let i = 0; i < 8; i++) {
        const bx = (i * 350 - cam * 0.4) % (CANVAS_W + 400) - 150;
        const bh = 60 + (i % 3) * 50;
        ctx.fillRect(bx, CANVAS_H - bh, 80, bh);
      }

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137 + 50) % CANVAS_W;
        const sy = (i * 89 + 20) % (CANVAS_H * 0.6);
        const alpha = 0.3 + Math.sin(frame * 0.02 + i) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      // Platforms
      for (const plat of GROUND_PLATFORMS) {
        const px = plat.x - cam;
        if (px < -plat.w || px > CANVAS_W) continue;
        ctx.fillStyle = '#2d3a4a';
        ctx.fillRect(px, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#3d4f63';
        ctx.fillRect(px, plat.y, plat.w, 4);
        // Grass
        ctx.fillStyle = '#1a3a1a';
        for (let gx = px; gx < px + plat.w; gx += 8) {
          ctx.fillRect(gx, plat.y - 4, 4, 6);
        }
      }

      for (const plat of ELEVATED_PLATFORMS) {
        const px = plat.x - cam;
        if (px < -plat.w || px > CANVAS_W) continue;
        ctx.fillStyle = '#5b3a6e';
        ctx.fillRect(px, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#7c4d8f';
        ctx.fillRect(px, plat.y, plat.w, 3);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.strokeRect(px, plat.y, plat.w, plat.h);
      }

      // Victory gate
      const gateX = VICTORY_X - cam;
      if (gateX > -100 && gateX < CANVAS_W + 100) {
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 25 + Math.sin(frame * 0.05) * 10;
        ctx.fillRect(gateX - 5, GROUND_Y - 80, 10, 80);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎁 WIN', gateX, GROUND_Y - 95);
      }

      // Pickups
      for (const pickup of pickups) {
        if (pickup.collected) continue;
        const px = pickup.x - cam;
        if (px < -40 || px > CANVAS_W + 40) continue;
        const py = pickup.y + Math.sin(pickup.bobOffset) * 6;

        ctx.save();
        ctx.translate(px, py);

        if (pickup.type === 'weapon') {
          ctx.shadowColor = pickup.subtype === 'sword' ? '#22d3ee' : '#f97316';
          ctx.shadowBlur = 14;
          ctx.fillStyle = pickup.subtype === 'sword' ? '#22d3ee' : '#f97316';
          ctx.font = '22px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(pickup.subtype === 'sword' ? '⚔️' : '🪓', 0, 0);
        } else {
          let emoji = '💚';
          let glow = '#22c55e';
          switch (pickup.subtype) {
            case 'speed': emoji = '💨'; glow = '#3b82f6'; break;
            case 'damage': emoji = '💥'; glow = '#ef4444'; break;
            case 'shield': emoji = '🛡️'; glow = '#fbbf24'; break;
          }
          ctx.shadowColor = glow;
          ctx.shadowBlur = 12;
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(emoji, 0, 0);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Enemies
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const ex = enemy.x - cam;
        if (ex < -50 || ex > CANVAS_W + 50) continue;

        const flashColor = enemy.hitFlash > 0 && enemy.hitFlash % 2 === 0 ? '#ffffff' : '';
        ctx.save();
        ctx.translate(ex, enemy.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(enemy.w / 2, enemy.h + 3, enemy.w / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        switch (enemy.type) {
          case 'grunt':
            ctx.fillStyle = flashColor || '#ef4444';
            ctx.fillRect(2, 4, enemy.w - 4, enemy.h - 12);
            ctx.fillStyle = flashColor || '#991b1b';
            ctx.fillRect(0, enemy.h - 8, enemy.w, 8);
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 8, 5, 5);
            ctx.fillRect(enemy.w - 13, 8, 5, 5);
            ctx.fillStyle = '#000';
            ctx.fillRect(10, 10, 2, 2);
            ctx.fillRect(enemy.w - 11, 10, 2, 2);
            break;
          case 'runner':
            ctx.fillStyle = flashColor || '#f97316';
            ctx.beginPath();
            ctx.arc(enemy.w / 2, enemy.h / 2 - 3, enemy.w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(enemy.w / 2 - 3, enemy.h / 2 - 5, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(enemy.w / 2 - 2, enemy.h / 2 - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'tank':
            ctx.fillStyle = flashColor || '#7c3aed';
            ctx.fillRect(0, 6, enemy.w, enemy.h - 14);
            ctx.fillStyle = flashColor || '#4c1d95';
            ctx.fillRect(-3, enemy.h - 8, enemy.w + 6, 8);
            ctx.fillStyle = flashColor || '#6d28d9';
            ctx.beginPath();
            ctx.arc(enemy.w / 2, 6, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(enemy.w / 2 - 3, 4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(enemy.w / 2 + 3, 4, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'boss':
            ctx.fillStyle = flashColor || '#ef4444';
            ctx.fillRect(4, 6, enemy.w - 8, enemy.h - 16);
            ctx.fillStyle = flashColor || '#7f1d1d';
            ctx.fillRect(0, enemy.h - 10, enemy.w, 10);
            // Crown
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(8, 4);
            ctx.lineTo(14, -8);
            ctx.lineTo(20, 2);
            ctx.lineTo(enemy.w / 2, -12);
            ctx.lineTo(enemy.w - 20, 2);
            ctx.lineTo(enemy.w - 14, -8);
            ctx.lineTo(enemy.w - 8, 4);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(12, 12, 8, 8);
            ctx.fillRect(enemy.w - 20, 12, 8, 8);
            ctx.fillStyle = '#000';
            ctx.fillRect(16, 14, 4, 4);
            ctx.fillRect(enemy.w - 16, 14, 4, 4);
            break;
        }

        // HP bar
        if (enemy.hp < enemy.maxHp) {
          const bw = enemy.w + 8;
          const bh = 4;
          const bx = -4;
          const by = -10;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(bx, by, bw, bh);
          const ratio = enemy.hp / enemy.maxHp;
          ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#facc15' : '#ef4444';
          ctx.fillRect(bx, by, bw * ratio, bh);
        }

        ctx.restore();
      }

      // Projectiles
      for (const p of projectiles) {
        const px = p.x - cam;
        ctx.save();
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Player
      const px = player.x - cam;
      const py = player.y;
      ctx.save();
      ctx.translate(px, py);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(player.w / 2, player.h + 4, player.w / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shield effect
      if (player.shieldActive > 0) {
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + Math.sin(frame * 0.1) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.w * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Invincible flash
      if (player.invincible > 0 && player.invincible % 4 < 2) {
        ctx.globalAlpha = 0.5;
      }

      // Speed boost aura
      if (player.speedBoost > 0) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.w * 1.3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Damage boost aura
      if (player.damageBoost > 0) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.w * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const s = player.w / 32;

      // Draw the little girl character (adapted from PlatformGame)
      const cx = player.w / 2;
      const cy = 12 * s;

      // Hair buns
      const bunColor = player.hitFlash > 0 && player.hitFlash % 2 === 0 ? '#ffffff' : '#ff6b9d';
      ctx.fillStyle = bunColor;
      ctx.beginPath();
      ctx.ellipse(cx, -10 * s, 12 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 8 * s, -6 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 8 * s, -6 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();

      // Face
      ctx.fillStyle = '#2d1810';
      ctx.beginPath();
      ctx.ellipse(cx, -4 * s, 9 * s, 7 * s, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe0d0';
      ctx.beginPath();
      ctx.arc(cx, -2 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#2d1810';
      ctx.beginPath();
      ctx.arc(cx - 2.5 * s, -3 * s, 1.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 2.5 * s, -3 * s, 1.2 * s, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      ctx.strokeStyle = '#ff6b9d';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.arc(cx, 0, 1.5 * s, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Body (dress)
      ctx.fillStyle = '#9d4edd';
      ctx.beginPath();
      ctx.moveTo(cx - 8 * s, 9 * s);
      ctx.lineTo(cx - 5 * s, 7 * s);
      ctx.lineTo(cx + 5 * s, 7 * s);
      ctx.lineTo(cx + 8 * s, 9 * s);
      ctx.lineTo(cx + 10 * s, 18 * s);
      ctx.lineTo(cx - 10 * s, 18 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 0.6 * s;
      ctx.stroke();

      // Legs
      ctx.fillStyle = '#ffe0d0';
      ctx.beginPath();
      ctx.roundRect(cx - 9 * s, 9 * s, 3 * s, 6 * s, 1.5 * s);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(cx + 6 * s, 9 * s, 3 * s, 6 * s, 1.5 * s);
      ctx.fill();

      // Shoes
      ctx.fillStyle = '#2d1810';
      ctx.beginPath();
      ctx.roundRect(cx - 9 * s, 15 * s, 3.5 * s, 3 * s, 1 * s);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(cx + 5.5 * s, 15 * s, 3.5 * s, 3 * s, 1 * s);
      ctx.fill();

      // Weapon visual
      if (player.weapon) {
        ctx.fillStyle = player.weapon === 'sword' ? '#22d3ee' : '#f97316';
        ctx.shadowColor = player.weapon === 'sword' ? '#22d3ee' : '#f97316';
        ctx.shadowBlur = 8;
        const wx = player.facing === 1 ? player.w - 4 : -8;
        ctx.fillRect(wx, 4, 8, 20);
        if (player.weapon === 'axe') {
          ctx.fillRect(wx - 4, 2, 16, 6);
        }
      }

      // Attack slash effect
      if (player.attackTimer > 0) {
        const atkX = player.facing === 1 ? player.w : -55;
        ctx.strokeStyle = `rgba(255, 255, 255, ${player.attackTimer / 10 * 0.6})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(atkX + (player.facing === 1 ? 20 : 35), player.h / 2, 25, -0.5, 1.2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(253, 224, 71, ${player.attackTimer / 10 * 0.8})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(atkX + (player.facing === 1 ? 20 : 35), player.h / 2, 20, -0.3, 1.0);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.restore();

      // Damage numbers
      for (const dn of dmgNums) {
        const dnx = dn.x - cam;
        ctx.save();
        ctx.globalAlpha = dn.life / 30;
        ctx.fillStyle = dn.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(dn.value)}`, dnx, dn.y);
        ctx.restore();
      }

      // HUD
      // HP bar
      const hudX = 20;
      const hudY = 20;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(hudX - 4, hudY - 4, 206, 48);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial';
      ctx.fillText('HP', hudX, hudY + 10);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(hudX + 22, hudY + 2, 170, 14);
      const hpRatio = player.hp / player.maxHp;
      const hpGrad = ctx.createLinearGradient(hudX + 22, 0, hudX + 192, 0);
      hpGrad.addColorStop(0, '#ef4444');
      hpGrad.addColorStop(0.5, '#facc15');
      hpGrad.addColorStop(1, '#22c55e');
      ctx.fillStyle = hpGrad;
      ctx.fillRect(hudX + 22, hudY + 2, 170 * hpRatio, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, hudX + 107, hudY + 13);

      // Weapon
      if (player.weapon) {
        ctx.fillStyle = '#facc15';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${player.weapon === 'sword' ? '⚔️ 长剑' : '🪓 巨斧'}`, hudX, hudY + 38);
      }

      // Active buffs
      let buffText = '';
      if (player.speedBoost > 0) buffText += '💨 ';
      if (player.damageBoost > 0) buffText += '💥 ';
      if (player.shieldActive > 0) buffText += '🛡️ ';
      if (buffText) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(buffText, hudX + 80, hudY + 38);
      }

      // Enemies count
      const aliveCount = enemies.filter(e => e.alive).length;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`敌人: ${aliveCount}`, CANVAS_W - 20, hudY + 16);

      // Combo display
      if (player.comboCount >= 3) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.fillText(`${player.comboCount} COMBO!`, CANVAS_W / 2, hudY + 40);
        ctx.shadowBlur = 0;
      }

      // Section indicator
      let sectionName = '';
      if (player.x < 1000) sectionName = 'Section 1 · 起始之地';
      else if (player.x < 2000) sectionName = 'Section 2 · 迷雾森林';
      else if (player.x < 3000) sectionName = 'Section 3 · 暗影峡谷';
      else if (player.x < 4000) sectionName = 'Section 4 · 烈焰堡垒';
      else sectionName = 'Section 5 · 魔王之巅';

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sectionName, CANVAS_W / 2, hudY + 16);

      // Progress bar at bottom
      const progress = player.x / WORLD_W;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(20, CANVAS_H - 16, CANVAS_W - 40, 6);
      const progGrad = ctx.createLinearGradient(20, 0, CANVAS_W - 20, 0);
      progGrad.addColorStop(0, '#22d3ee');
      progGrad.addColorStop(0.5, '#a855f7');
      progGrad.addColorStop(1, '#facc15');
      ctx.fillStyle = progGrad;
      ctx.fillRect(20, CANVAS_H - 16, (CANVAS_W - 40) * progress, 6);
      // Player marker
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20 + (CANVAS_W - 40) * progress, CANVAS_H - 13, 5, 0, Math.PI * 2);
      ctx.fill();

      // Combo tip
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('J=拳 K=踢 L=大招  连按J三连击', CANVAS_W - 20, CANVAS_H - 24);
    };

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

  // Touch controls
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
          横板格斗 · 收集武器 · 击败魔王 · 到达终点
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
                <p><span className="text-yellow-400 font-bold">J</span> 拳击（连按3次=三连击）· <span className="text-orange-400 font-bold">K</span> 踢击 · <span className="text-red-400 font-bold">L</span> 大招</p>
                <p>静止不动可<span className="text-green-400">缓慢回血</span>，路上有武器和道具</p>
                <p className="text-silver-gray/60 text-xs">共5个区域 · 16个敌人 · 最终BOSS在终点</p>
              </div>
            </div>
          )}

          {gameState === 'victory' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded-lg">
              <Star className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-4xl font-bold text-white font-display mb-2 gradient-text">闯关成功!</h2>
              <p className="text-silver-gray mb-2">你击败了所有敌人，到达了终点！</p>
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
          className="w-14 h-14 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 touch-none">
          ◀
        </button>
        <button onTouchStart={touchStart('jump')} onTouchEnd={touchEnd('jump')} onMouseDown={touchStart('jump')} onMouseUp={touchEnd('jump')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 flex items-center justify-center text-white active:scale-95 touch-none">
          ⬆
        </button>
        <button onTouchStart={touchStart('d')} onTouchEnd={touchEnd('d')} onMouseDown={touchStart('d')} onMouseUp={touchEnd('d')}
          className="w-14 h-14 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 touch-none">
          ▶
        </button>
        <button onTouchStart={touchStart('j')} onTouchEnd={touchEnd('j')} onMouseDown={touchStart('j')} onMouseUp={touchEnd('j')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white active:scale-95 touch-none">
          👊
        </button>
        <button onTouchStart={touchStart('k')} onTouchEnd={touchEnd('k')} onMouseDown={touchStart('k')} onMouseUp={touchEnd('k')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white active:scale-95 touch-none">
          🦶
        </button>
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
