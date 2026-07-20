import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, ArrowLeft, ArrowUp, Trophy, Star, Play, RotateCcw } from 'lucide-react';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  isJumping: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface StarItem {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  isSpecial?: boolean;
}

type BossAIType = 'tracker' | 'patroller' | 'charger' | 'jumper';
type BossState = 'idle' | 'chase' | 'dash' | 'rest' | 'wander';

interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  direction: number;
  speed: number;
  jumpTimer: number;
  isJumping: boolean;
  aiType: BossAIType;
  state: BossState;
  stateTimer: number;
  patrolMin: number;
  patrolMax: number;
  dashSpeed: number;
  color: string;
  emoji: string;
  visionRange: number;
  wanderTarget: number;
  wanderTimer: number;
}

interface Level {
  platforms: Platform[];
  stars: StarItem[];
  bosses: Boss[];
  startX: number;
  startY: number;
  bgColor: string;
}

const MAX_LEVELS = 5;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 520;
const SAFE_ZONE_X = 220;

const createBoss = (
  x: number, y: number, speed: number, aiType: BossAIType,
  patrolMin = SAFE_ZONE_X, patrolMax = CANVAS_WIDTH - 50, color = '#ef4444', emoji = '👾',
  visionRange = 350
): Boss => ({
  x, y,
  width: 40, height: 40,
  velocityX: 0, velocityY: 0,
  direction: -1,
  speed,
  jumpTimer: 0,
  isJumping: false,
  aiType,
  state: 'idle',
  stateTimer: 0,
  patrolMin: Math.max(patrolMin, SAFE_ZONE_X),
  patrolMax,
  dashSpeed: speed * 2.5,
  color,
  emoji,
  visionRange,
  wanderTarget: x,
  wanderTimer: 0,
});

const LEVELS: Level[] = [
  {
    platforms: [
      { x: 50, y: 440, width: 250, height: 20, color: '#00d4ff' },
      { x: 380, y: 380, width: 180, height: 20, color: '#9d4edd' },
      { x: 650, y: 440, width: 150, height: 20, color: '#ff6b9d' },
      { x: 900, y: 380, width: 200, height: 20, color: '#facc15' },
      { x: 500, y: 260, width: 150, height: 20, color: '#22d3ee' },
      { x: 800, y: 200, width: 180, height: 20, color: '#a855f7' },
    ],
    stars: [
      { x: 170, y: 390, radius: 15, collected: false },
      { x: 460, y: 330, radius: 15, collected: false },
      { x: 720, y: 390, radius: 15, collected: false },
      { x: 990, y: 330, radius: 15, collected: false },
      { x: 570, y: 210, radius: 15, collected: false },
      { x: 880, y: 150, radius: 15, collected: false },
    ],
    bosses: [],
    startX: 80,
    startY: 390,
    bgColor: '#0a0e17',
  },
  {
    platforms: [
      { x: 50, y: 440, width: 220, height: 20, color: '#00d4ff' },
      { x: 350, y: 370, width: 150, height: 20, color: '#9d4edd' },
      { x: 600, y: 440, width: 140, height: 20, color: '#ff6b9d' },
      { x: 850, y: 370, width: 160, height: 20, color: '#facc15' },
      { x: 1080, y: 440, width: 100, height: 20, color: '#22d3ee' },
      { x: 450, y: 240, width: 150, height: 20, color: '#a855f7' },
      { x: 750, y: 180, width: 160, height: 20, color: '#ec4899' },
    ],
    stars: [
      { x: 150, y: 390, radius: 15, collected: false },
      { x: 420, y: 320, radius: 15, collected: false },
      { x: 660, y: 390, radius: 15, collected: false },
      { x: 920, y: 320, radius: 15, collected: false },
      { x: 1120, y: 390, radius: 15, collected: false },
      { x: 520, y: 190, radius: 15, collected: false },
      { x: 820, y: 130, radius: 15, collected: false },
    ],
    bosses: [
      createBoss(950, 390, 2, 'patroller', 700, 1150, '#ef4444', '👾', 280),
    ],
    startX: 80,
    startY: 390,
    bgColor: '#0f1420',
  },
  {
    platforms: [
      { x: 50, y: 440, width: 180, height: 20, color: '#00d4ff' },
      { x: 320, y: 380, width: 120, height: 20, color: '#9d4edd' },
      { x: 550, y: 440, width: 130, height: 20, color: '#ff6b9d' },
      { x: 780, y: 380, width: 120, height: 20, color: '#facc15' },
      { x: 1000, y: 440, width: 180, height: 20, color: '#22d3ee' },
      { x: 400, y: 280, width: 120, height: 20, color: '#a855f7' },
      { x: 650, y: 220, width: 140, height: 20, color: '#ec4899' },
      { x: 900, y: 260, width: 120, height: 20, color: '#06b6d4' },
    ],
    stars: [
      { x: 130, y: 390, radius: 15, collected: false },
      { x: 370, y: 330, radius: 15, collected: false },
      { x: 600, y: 390, radius: 15, collected: false },
      { x: 830, y: 330, radius: 15, collected: false },
      { x: 1080, y: 390, radius: 15, collected: false },
      { x: 450, y: 230, radius: 15, collected: false },
      { x: 710, y: 170, radius: 15, collected: false },
      { x: 950, y: 210, radius: 15, collected: false },
    ],
    bosses: [
      createBoss(950, 390, 2.5, 'tracker', SAFE_ZONE_X, 1150, '#ef4444', '👾', 320),
    ],
    startX: 80,
    startY: 390,
    bgColor: '#1a1f2e',
  },
  {
    platforms: [
      { x: 50, y: 440, width: 160, height: 20, color: '#00d4ff' },
      { x: 280, y: 370, width: 110, height: 20, color: '#9d4edd' },
      { x: 480, y: 440, width: 120, height: 20, color: '#ff6b9d' },
      { x: 700, y: 370, width: 110, height: 20, color: '#facc15' },
      { x: 900, y: 440, width: 120, height: 20, color: '#22d3ee' },
      { x: 1100, y: 370, width: 90, height: 20, color: '#a855f7' },
      { x: 350, y: 260, width: 120, height: 20, color: '#ec4899' },
      { x: 600, y: 200, width: 130, height: 20, color: '#06b6d4' },
      { x: 850, y: 260, width: 120, height: 20, color: '#84cc16' },
      { x: 1050, y: 180, width: 110, height: 20, color: '#f97316' },
    ],
    stars: [
      { x: 120, y: 390, radius: 15, collected: false },
      { x: 320, y: 320, radius: 15, collected: false },
      { x: 530, y: 390, radius: 15, collected: false },
      { x: 740, y: 320, radius: 15, collected: false },
      { x: 950, y: 390, radius: 15, collected: false },
      { x: 1130, y: 320, radius: 15, collected: false },
      { x: 400, y: 210, radius: 15, collected: false },
      { x: 650, y: 150, radius: 15, collected: false },
      { x: 900, y: 210, radius: 15, collected: false },
      { x: 1090, y: 130, radius: 15, collected: false },
    ],
    bosses: [
      createBoss(850, 390, 2.5, 'charger', SAFE_ZONE_X, 1150, '#ef4444', '👾', 340),
    ],
    startX: 80,
    startY: 390,
    bgColor: '#1f2433',
  },
  {
    platforms: [
      { x: 50, y: 440, width: 160, height: 20, color: '#00d4ff' },
      { x: 280, y: 390, width: 110, height: 20, color: '#9d4edd' },
      { x: 470, y: 440, width: 110, height: 20, color: '#ff6b9d' },
      { x: 660, y: 390, width: 110, height: 20, color: '#facc15' },
      { x: 850, y: 440, width: 110, height: 20, color: '#22d3ee' },
      { x: 1040, y: 390, width: 150, height: 20, color: '#a855f7' },
      { x: 350, y: 290, width: 110, height: 20, color: '#ec4899' },
      { x: 550, y: 240, width: 110, height: 20, color: '#06b6d4' },
      { x: 750, y: 290, width: 110, height: 20, color: '#84cc16' },
      { x: 950, y: 240, width: 110, height: 20, color: '#f97316' },
      { x: 600, y: 140, width: 130, height: 20, color: '#facc15' },
      { x: 900, y: 100, width: 130, height: 20, color: '#ec4899' },
    ],
    stars: [
      { x: 120, y: 390, radius: 15, collected: false },
      { x: 320, y: 340, radius: 15, collected: false },
      { x: 510, y: 390, radius: 15, collected: false },
      { x: 700, y: 340, radius: 15, collected: false },
      { x: 890, y: 390, radius: 15, collected: false },
      { x: 1090, y: 340, radius: 15, collected: false },
      { x: 390, y: 240, radius: 15, collected: false },
      { x: 590, y: 190, radius: 15, collected: false },
      { x: 790, y: 240, radius: 15, collected: false },
      { x: 990, y: 190, radius: 15, collected: false },
      { x: 650, y: 90, radius: 15, collected: false },
      { x: 960, y: 50, radius: 18, collected: false, isSpecial: true },
    ],
    bosses: [
      createBoss(700, 390, 3, 'charger', SAFE_ZONE_X, 1150, '#ef4444', '👾', 360),
      createBoss(950, 240, 2.5, 'jumper', 400, 1100, '#f97316', '👻', 320),
    ],
    startX: 80,
    startY: 390,
    bgColor: '#242938',
  },
];

const PlatformGame = ({ onCompleteGame }: { onCompleteGame: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showVictoryMenu, setShowVictoryMenu] = useState(false);
  const [collectedStars, setCollectedStars] = useState(0);
  const [scale, setScale] = useState(1);

  const playerRef = useRef<Player>({
    x: LEVELS[0].startX,
    y: LEVELS[0].startY,
    width: 30,
    height: 30,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
  });

  const starsRef = useRef<StarItem[]>([]);
  const bossesRef = useRef<Boss[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(false);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const collectedStarsRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const updateScale = () => {
      const availableWidth = window.innerWidth - 32;
      const availableHeight = window.innerHeight - 240;
      const scaleByWidth = availableWidth / CANVAS_WIDTH;
      const scaleByHeight = availableHeight / CANVAS_HEIGHT;
      const newScale = Math.min(scaleByWidth, scaleByHeight, 1);
      setScale(newScale > 0.1 ? newScale : 0.1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, []);

  const resetLevel = useCallback((levelIndex: number) => {
    const level = LEVELS[levelIndex];
    playerRef.current = {
      x: level.startX,
      y: level.startY,
      width: 30,
      height: 30,
      velocityX: 0,
      velocityY: 0,
      isJumping: false,
    };
    starsRef.current = level.stars.map((s) => ({ ...s, collected: false }));
    bossesRef.current = level.bosses.map((b) => ({ ...b }));
    collectedStarsRef.current = 0;
    setCollectedStars(0);
  }, []);

  const checkCollision = useCallback((player: Player, platform: Platform): boolean => {
    return (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x &&
      player.y < platform.y + platform.height &&
      player.y + player.height > platform.y
    );
  }, []);

  const checkStarCollision = useCallback((player: Player, star: StarItem): boolean => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const distance = Math.sqrt(
      Math.pow(playerCenterX - star.x, 2) + Math.pow(playerCenterY - star.y, 2)
    );
    return distance < star.radius + player.width / 2;
  }, []);

  const checkBossCollision = useCallback((player: Player, boss: Boss): boolean => {
    return (
      player.x < boss.x + boss.width &&
      player.x + player.width > boss.x &&
      player.y < boss.y + boss.height &&
      player.y + player.height > boss.y
    );
  }, []);

  const clampBossX = useCallback((boss: Boss) => {
    const minX = SAFE_ZONE_X;
    const maxX = CANVAS_WIDTH - boss.width - 20;
    if (boss.x < minX) boss.x = minX;
    if (boss.x > maxX) boss.x = maxX;
  }, []);

  const updateBossPhysics = useCallback((boss: Boss, platforms: Platform[], player: Player) => {
    boss.velocityY += 0.5;
    boss.y += boss.velocityY;

    boss.isJumping = true;
    platforms.forEach((platform) => {
      if (
        boss.x < platform.x + platform.width &&
        boss.x + boss.width > platform.x &&
        boss.y < platform.y + platform.height &&
        boss.y + boss.height > platform.y
      ) {
        if (boss.velocityY > 0 && boss.y + boss.height - boss.velocityY <= platform.y) {
          boss.y = platform.y - boss.height;
          boss.velocityY = 0;
          boss.isJumping = false;
        }
      }
    });

    if (boss.y > CANVAS_HEIGHT) {
      const playerCenterX = player.x + player.width / 2;
      const bossCenterX = boss.x + boss.width / 2;
      if (bossCenterX < playerCenterX) {
        boss.x = Math.min(playerCenterX + 300, boss.patrolMax - boss.width);
      } else {
        boss.x = Math.max(playerCenterX - 300, boss.patrolMin);
      }
      boss.y = 100;
      boss.velocityY = 0;
      boss.isJumping = false;
      boss.velocityX = 0;
      boss.state = 'idle';
      boss.stateTimer = 0;
    }

    clampBossX(boss);
  }, [clampBossX]);

  const updateBoss = useCallback((boss: Boss, player: Player, platforms: Platform[]) => {
    const bossCenterX = boss.x + boss.width / 2;
    const playerCenterX = player.x + player.width / 2;
    const distanceX = playerCenterX - bossCenterX;
    const absDistanceX = Math.abs(distanceX);
    const canSeePlayer = absDistanceX < boss.visionRange;

    boss.stateTimer++;
    boss.wanderTimer++;

    switch (boss.aiType) {
      case 'patroller': {
        if (canSeePlayer && absDistanceX < 200) {
          boss.direction = distanceX > 0 ? 1 : -1;
          boss.x += boss.speed * 1.2 * boss.direction;
        } else {
          if (boss.wanderTimer > 80 + Math.random() * 100) {
            boss.wanderTarget = boss.patrolMin + Math.random() * (boss.patrolMax - boss.patrolMin - boss.width);
            boss.wanderTimer = 0;
          }
          const targetCenter = boss.wanderTarget + boss.width / 2;
          if (Math.abs(bossCenterX - targetCenter) > 10) {
            boss.direction = targetCenter > bossCenterX ? 1 : -1;
            boss.x += boss.speed * 0.7 * boss.direction;
          }
        }

        if (boss.x <= boss.patrolMin) { boss.x = boss.patrolMin; boss.direction = 1; }
        if (boss.x + boss.width >= boss.patrolMax) { boss.x = boss.patrolMax - boss.width; boss.direction = -1; }

        boss.jumpTimer++;
        if (!boss.isJumping && boss.jumpTimer > 120 + Math.random() * 100) {
          boss.velocityY = -9;
          boss.isJumping = true;
          boss.jumpTimer = 0;
        }
        break;
      }

      case 'tracker': {
        if (canSeePlayer) {
          if (absDistanceX > 5) {
            boss.direction = distanceX > 0 ? 1 : -1;
          }
          boss.x += boss.speed * boss.direction;
        } else {
          if (boss.wanderTimer > 100 + Math.random() * 120) {
            boss.wanderTarget = boss.patrolMin + Math.random() * (boss.patrolMax - boss.patrolMin - boss.width);
            boss.wanderTimer = 0;
          }
          const targetCenter = boss.wanderTarget + boss.width / 2;
          if (Math.abs(bossCenterX - targetCenter) > 10) {
            boss.direction = targetCenter > bossCenterX ? 1 : -1;
            boss.x += boss.speed * 0.6 * boss.direction;
          }
        }

        boss.jumpTimer++;
        if (canSeePlayer && !boss.isJumping && boss.jumpTimer > 80 + Math.random() * 60) {
          boss.velocityY = -10;
          boss.isJumping = true;
          boss.jumpTimer = 0;
        } else if (!boss.isJumping && boss.jumpTimer > 140 + Math.random() * 100) {
          boss.velocityY = -9;
          boss.isJumping = true;
          boss.jumpTimer = 0;
        }
        break;
      }

      case 'charger': {
        if (boss.state === 'idle') {
          if (boss.wanderTimer > 80 + Math.random() * 80) {
            boss.wanderTarget = boss.patrolMin + Math.random() * (boss.patrolMax - boss.patrolMin - boss.width);
            boss.wanderTimer = 0;
          }
          const targetCenter = boss.wanderTarget + boss.width / 2;
          if (Math.abs(bossCenterX - targetCenter) > 10) {
            boss.direction = targetCenter > bossCenterX ? 1 : -1;
            boss.x += boss.speed * 0.6 * boss.direction;
          }
          if (canSeePlayer && boss.stateTimer > 80) {
            boss.state = 'chase';
            boss.stateTimer = 0;
          }
        } else if (boss.state === 'chase') {
          if (canSeePlayer) {
            if (absDistanceX > 5) {
              boss.direction = distanceX > 0 ? 1 : -1;
            }
            boss.x += boss.speed * boss.direction;
          }
          if (boss.stateTimer > 60) {
            if (canSeePlayer) {
              boss.state = 'dash';
            } else {
              boss.state = 'idle';
            }
            boss.stateTimer = 0;
          }
        } else if (boss.state === 'dash') {
          boss.x += boss.dashSpeed * boss.direction;
          if (boss.stateTimer > 25) {
            boss.state = 'rest';
            boss.stateTimer = 0;
          }
        } else if (boss.state === 'rest') {
          if (boss.stateTimer > 50) {
            boss.state = 'idle';
            boss.stateTimer = 0;
            boss.wanderTimer = 0;
          }
        }
        break;
      }

      case 'jumper': {
        boss.jumpTimer++;
        if (!boss.isJumping && boss.jumpTimer > 60 + Math.random() * 50) {
          boss.velocityY = -11;
          boss.isJumping = true;
          boss.jumpTimer = 0;
          if (canSeePlayer && absDistanceX > 5) {
            boss.direction = distanceX > 0 ? 1 : -1;
            boss.velocityX = boss.speed * 1.5 * boss.direction;
          } else {
            boss.direction = Math.random() > 0.5 ? 1 : -1;
            boss.velocityX = boss.speed * 1.2 * boss.direction;
          }
        }
        if (boss.isJumping) {
          boss.x += boss.velocityX;
          boss.velocityX *= 0.95;
        }
        break;
      }
    }

    updateBossPhysics(boss, platforms, player);
  }, [updateBossPhysics]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const player = playerRef.current;
    const level = LEVELS[currentLevel];
    const stars = starsRef.current;
    const bosses = bossesRef.current;
    timeRef.current += 0.05;

    ctx.fillStyle = level.bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(0, 0, SAFE_ZONE_X, CANVAS_HEIGHT);
    ctx.restore();

    level.platforms.forEach((platform) => {
      ctx.fillStyle = platform.color;
      ctx.shadowColor = platform.color;
      ctx.shadowBlur = 15;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.shadowBlur = 0;
    });

    stars.forEach((star) => {
      if (star.collected) return;

      let alpha = 1;
      let starScale = 1;
      if (star.isSpecial) {
        alpha = 0.5 + Math.sin(timeRef.current * 3) * 0.5;
        starScale = 1 + Math.sin(timeRef.current * 3) * 0.2;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.isSpecial ? '#ffd700' : '#ffffff';
      ctx.shadowColor = star.isSpecial ? '#ffd700' : '#ffffff';
      ctx.shadowBlur = star.isSpecial ? 40 : 20;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * starScale, 0, Math.PI * 2);
      ctx.fill();
      
      if (star.isSpecial) {
        ctx.fillStyle = '#fff';
        ctx.font = `${star.radius * starScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', star.x, star.y);
      }
      ctx.restore();
    });

    bosses.forEach((boss) => {
      let glowColor = boss.color;
      if (boss.aiType === 'charger' && boss.state === 'dash') {
        glowColor = '#fbbf24';
      }

      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(boss.emoji, boss.x + boss.width / 2, boss.y + boss.height / 2);
    });

    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const s = player.width / 30;

    const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, player.width);
    auraGrad.addColorStop(0, 'rgba(255, 107, 157, 0.5)');
    auraGrad.addColorStop(0.5, 'rgba(255, 107, 157, 0.2)');
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(player.x - 15, player.y - 15, player.width + 30, player.height + 30);

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.ellipse(0, -14 * s, 13 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-9 * s, -10 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9 * s, -10 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d1810';
    ctx.beginPath();
    ctx.ellipse(0, -8 * s, 9 * s, 7 * s, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe0d0';
    ctx.beginPath();
    ctx.arc(0, -6 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d1810';
    ctx.beginPath();
    ctx.arc(-2.5 * s, -7 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.5 * s, -7 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.arc(0, -4 * s, 1.5 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.strokeStyle = '#e88';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.moveTo(-3.5 * s, -3 * s);
    ctx.lineTo(-3.5 * s, -2 * s);
    ctx.moveTo(3.5 * s, -3 * s);
    ctx.lineTo(3.5 * s, -2 * s);
    ctx.stroke();

    ctx.fillStyle = '#ffe0d0';
    ctx.beginPath();
    ctx.roundRect(-3 * s, 0, 6 * s, 5 * s, 2 * s);
    ctx.fill();

    ctx.fillStyle = '#9d4edd';
    ctx.beginPath();
    ctx.moveTo(-8 * s, 5 * s);
    ctx.lineTo(-5 * s, 3 * s);
    ctx.lineTo(5 * s, 3 * s);
    ctx.lineTo(8 * s, 5 * s);
    ctx.lineTo(10 * s, 14 * s);
    ctx.lineTo(-10 * s, 14 * s);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 0.6 * s;
    ctx.stroke();

    ctx.fillStyle = '#ffe0d0';
    ctx.beginPath();
    ctx.roundRect(-9 * s, 5 * s, 3 * s, 6 * s, 1.5 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(6 * s, 5 * s, 3 * s, 6 * s, 1.5 * s);
    ctx.fill();

    ctx.fillStyle = '#2d1810';
    ctx.beginPath();
    ctx.roundRect(-9 * s, 11 * s, 3.5 * s, 3 * s, 1 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(5.5 * s, 11 * s, 3.5 * s, 3 * s, 1 * s);
    ctx.fill();

    ctx.restore();
  }, [currentLevel]);

  const update = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isPlayingRef.current) return;

    const player = playerRef.current;
    const level = LEVELS[currentLevel];
    const stars = starsRef.current;
    const bosses = bossesRef.current;
    const keys = keysRef.current;

    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('left')) {
      player.velocityX = -5;
    } else if (keys.has('ArrowRight') || keys.has('d') || keys.has('right')) {
      player.velocityX = 5;
    } else {
      player.velocityX *= 0.8;
    }

    if ((keys.has('ArrowUp') || keys.has('w') || keys.has(' ') || keys.has('jump')) && !player.isJumping) {
      player.velocityY = -12;
      player.isJumping = true;
    }

    player.velocityY += 0.5;
    player.x += player.velocityX;
    player.y += player.velocityY;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

    player.isJumping = true;
    level.platforms.forEach((platform) => {
      if (checkCollision(player, platform)) {
        if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
          player.y = platform.y - player.height;
          player.velocityY = 0;
          player.isJumping = false;
        }
      }
    });

    if (player.y > CANVAS_HEIGHT) {
      const level = LEVELS[currentLevel];
      playerRef.current = {
        x: level.startX,
        y: level.startY,
        width: 30,
        height: 30,
        velocityX: 0,
        velocityY: 0,
        isJumping: false,
      };
      draw(ctx);
      animationRef.current = requestAnimationFrame(() => update(ctx));
      return;
    }

    let shouldShowBirthday = false;
    stars.forEach((star) => {
      if (!star.collected && checkStarCollision(player, star)) {
        star.collected = true;
        if (star.isSpecial && currentLevel === LEVELS.length - 1) {
          shouldShowBirthday = true;
        }
      }
    });

    if (shouldShowBirthday) {
      setShowVictoryMenu(true);
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const newCollectedCount = stars.filter((s) => s.collected).length;
    if (newCollectedCount !== collectedStarsRef.current) {
      collectedStarsRef.current = newCollectedCount;
      setCollectedStars(newCollectedCount);
    }

    let hitByBoss = false;
    bosses.forEach((boss) => {
      updateBoss(boss, player, level.platforms);
      if (checkBossCollision(player, boss)) {
        hitByBoss = true;
      }
    });

    if (hitByBoss) {
      const level = LEVELS[currentLevel];
      playerRef.current = {
        x: level.startX,
        y: level.startY,
        width: 30,
        height: 30,
        velocityX: 0,
        velocityY: 0,
        isJumping: false,
      };
      draw(ctx);
      animationRef.current = requestAnimationFrame(() => update(ctx));
      return;
    }

    const allCollected = stars.every((s) => s.collected);
    if (allCollected && currentLevel < LEVELS.length - 1) {
      setShowLevelComplete(true);
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
      return;
    }

    draw(ctx);

    animationRef.current = requestAnimationFrame(() => update(ctx));
  }, [currentLevel, checkCollision, checkStarCollision, checkBossCollision, resetLevel, draw, updateBoss]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current || showLevelComplete || showVictoryMenu) return;
      keysRef.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationRef.current);
    };
  }, [showLevelComplete, showVictoryMenu]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(() => update(ctx));
    } else {
      draw(ctx);
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, currentLevel, update, draw]);

  const handleStart = () => {
    resetLevel(currentLevel);
    setIsPlaying(true);
  };

  const handleNextLevel = () => {
    const nextLevel = currentLevel + 1;
    setCurrentLevel(nextLevel);
    resetLevel(nextLevel);
    setShowLevelComplete(false);
    setIsPlaying(true);
  };

  const handleRestart = () => {
    resetLevel(currentLevel);
    setShowLevelComplete(false);
    setShowVictoryMenu(false);
    setIsPlaying(true);
  };

  const handleTouchStart = useCallback((direction: 'left' | 'right' | 'jump') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isPlayingRef.current || showLevelComplete || showVictoryMenu) return;
    keysRef.current.add(direction);
  }, [showLevelComplete, showVictoryMenu]);

  const handleTouchEnd = useCallback((direction: 'left' | 'right' | 'jump') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.delete(direction);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-charcoal flex flex-col items-center justify-start p-2 md:p-4 md:justify-center">
      <div className="mb-2 md:mb-4 text-center">
        <h1 className="text-xl md:text-4xl font-bold text-white font-display mb-1 md:mb-2">
          <span className="gradient-text">冒险之旅</span>
        </h1>
        <div className="flex items-center justify-center gap-2 md:gap-4 text-xs md:text-base">
          <p className="text-silver-gray">关卡 {currentLevel + 1} / {MAX_LEVELS}</p>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
            <span className="text-white font-bold">{collectedStars} / {LEVELS[currentLevel].stars.length}</span>
          </div>
          {LEVELS[currentLevel].bosses.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-red-400">⚔️ {LEVELS[currentLevel].bosses.length}</span>
            </div>
          )}
        </div>
      </div>

      <div
        className="relative rounded-lg"
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
        }}
      >
        <div
          className="relative rounded-lg"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
          }}
        >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-neon-blue/30 rounded-lg shadow-lg shadow-neon-blue/20 block"
        />

        {!isPlaying && !showLevelComplete && !showVictoryMenu && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-full hover:scale-105 transition-transform"
            >
              <Play className="w-6 h-6" />
              开始游戏
            </button>
            <p className="text-silver-gray mt-4 text-sm">吃掉所有星星，躲避敌人</p>
            <p className="text-silver-gray/50 mt-1 text-xs">左侧蓝色区域为安全区，碰到敌人自动重生</p>
          </div>
        )}

        {showLevelComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
            <div className="text-center">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-bold text-white font-display mb-2">关卡完成!</h2>
              <p className="text-silver-gray mb-6">准备好下一关了吗？</p>
              <button
                onClick={handleNextLevel}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-full hover:scale-105 transition-transform"
              >
                <ArrowRight className="w-6 h-6" />
                下一关
              </button>
            </div>
          </div>
        )}

        {showVictoryMenu && (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black/80 rounded-lg">
            <div className="text-center" style={{ width: '100%' }}>
              <Star className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-4xl font-bold text-white font-display mb-2 gradient-text">
                🎉 恭喜通关! 🎉
              </h2>
              <p className="text-silver-gray mb-2">你收集了所有星星!</p>
              <p className="text-light-gray mb-8">这是给你的特别惊喜</p>
              <button
                onClick={onCompleteGame}
                className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 text-white font-bold rounded-full hover:scale-110 transition-transform shadow-lg shadow-neon-blue/30"
              >
                <Star className="w-6 h-6" />
                打开惊喜
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="mt-3 md:hidden flex gap-4 select-none justify-center">
        <button
          onTouchStart={handleTouchStart('left')}
          onTouchEnd={handleTouchEnd('left')}
          onTouchCancel={handleTouchEnd('left')}
          onMouseDown={handleTouchStart('left')}
          onMouseUp={handleTouchEnd('left')}
          onMouseLeave={handleTouchEnd('left')}
          className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onTouchStart={handleTouchStart('jump')}
          onTouchEnd={handleTouchEnd('jump')}
          onTouchCancel={handleTouchEnd('jump')}
          onMouseDown={handleTouchStart('jump')}
          onMouseUp={handleTouchEnd('jump')}
          onMouseLeave={handleTouchEnd('jump')}
          className="w-16 h-16 rounded-full glass-effect flex items-center justify-center text-white active:bg-neon-blue/40 transition-colors touch-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <ArrowUp className="w-6 h-6" />
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
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {isPlaying && (
        <div className="mt-3 md:mt-6 flex gap-2 md:gap-4">
          <button
            onClick={() => setIsPlaying(false)}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1 md:py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base"
          >
            暂停
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1 md:py-2 glass-effect rounded-full text-silver-gray hover:text-neon-blue transition-colors text-xs md:text-base"
          >
            <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
            重新开始
          </button>
        </div>
      )}

      <div className="mt-4 md:mt-8 flex gap-2">
        {Array.from({ length: MAX_LEVELS }).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
              index < currentLevel
                ? 'bg-neon-blue shadow-lg shadow-neon-blue/50'
                : index === currentLevel
                ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse'
                : 'bg-silver-gray/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PlatformGame;
