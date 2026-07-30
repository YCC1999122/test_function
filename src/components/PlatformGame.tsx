import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, ArrowLeft, ArrowUp, Trophy, Star, Play, RotateCcw } from 'lucide-react';
import { useGameAudio } from './GameAudio';

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

const MAX_LEVELS = 1;
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1800;
const SAFE_ZONE_X = 180;

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
      // Layer 1 - 地面 (y=1680)
      { x: 20, y: 1680, width: 180, height: 20, color: '#00d4ff' },
      { x: 240, y: 1680, width: 150, height: 20, color: '#06b6d4' },
      { x: 430, y: 1680, width: 150, height: 20, color: '#22d3ee' },
      { x: 620, y: 1680, width: 140, height: 20, color: '#0891b2' },
      { x: 780, y: 1680, width: 100, height: 20, color: '#0e7490' },

      // Layer 2 (y=1520)
      { x: 40, y: 1520, width: 110, height: 20, color: '#9d4edd' },
      { x: 200, y: 1520, width: 110, height: 20, color: '#a855f7' },
      { x: 360, y: 1520, width: 110, height: 20, color: '#c084fc' },
      { x: 520, y: 1520, width: 110, height: 20, color: '#d946ef' },
      { x: 680, y: 1520, width: 110, height: 20, color: '#e879f9' },
      { x: 820, y: 1520, width: 70, height: 20, color: '#f0abfc' },

      // Layer 3 (y=1360)
      { x: 20, y: 1360, width: 100, height: 20, color: '#ff6b9d' },
      { x: 180, y: 1360, width: 100, height: 20, color: '#ec4899' },
      { x: 340, y: 1360, width: 100, height: 20, color: '#f472b6' },
      { x: 500, y: 1360, width: 100, height: 20, color: '#fb7185' },
      { x: 660, y: 1360, width: 100, height: 20, color: '#fda4af' },
      { x: 810, y: 1360, width: 70, height: 20, color: '#f9a8d4' },

      // Layer 4 (y=1200)
      { x: 50, y: 1200, width: 90, height: 20, color: '#facc15' },
      { x: 200, y: 1200, width: 90, height: 20, color: '#fbbf24' },
      { x: 350, y: 1200, width: 90, height: 20, color: '#f59e0b' },
      { x: 500, y: 1200, width: 90, height: 20, color: '#d97706' },
      { x: 650, y: 1200, width: 90, height: 20, color: '#b45309' },
      { x: 800, y: 1200, width: 80, height: 20, color: '#92400e' },

      // Layer 5 (y=1040)
      { x: 30, y: 1040, width: 100, height: 20, color: '#84cc16' },
      { x: 190, y: 1040, width: 100, height: 20, color: '#65a30d' },
      { x: 350, y: 1040, width: 100, height: 20, color: '#4d7c0f' },
      { x: 510, y: 1040, width: 100, height: 20, color: '#3f6212' },
      { x: 670, y: 1040, width: 100, height: 20, color: '#365314' },
      { x: 820, y: 1040, width: 70, height: 20, color: '#1a2e05' },

      // Layer 6 (y=880)
      { x: 40, y: 880, width: 90, height: 20, color: '#22d3ee' },
      { x: 190, y: 880, width: 90, height: 20, color: '#06b6d4' },
      { x: 340, y: 880, width: 90, height: 20, color: '#0891b2' },
      { x: 490, y: 880, width: 90, height: 20, color: '#0e7490' },
      { x: 640, y: 880, width: 90, height: 20, color: '#155e75' },
      { x: 790, y: 880, width: 80, height: 20, color: '#164e63' },

      // Layer 7 (y=720)
      { x: 25, y: 720, width: 90, height: 20, color: '#f97316' },
      { x: 175, y: 720, width: 90, height: 20, color: '#ea580c' },
      { x: 325, y: 720, width: 90, height: 20, color: '#dc2626' },
      { x: 475, y: 720, width: 90, height: 20, color: '#b91c1c' },
      { x: 625, y: 720, width: 90, height: 20, color: '#991b1b' },
      { x: 780, y: 720, width: 90, height: 20, color: '#7f1d1d' },

      // Layer 8 (y=560)
      { x: 50, y: 560, width: 80, height: 20, color: '#ec4899' },
      { x: 180, y: 560, width: 80, height: 20, color: '#f43f5e' },
      { x: 310, y: 560, width: 80, height: 20, color: '#e11d48' },
      { x: 440, y: 560, width: 80, height: 20, color: '#be123c' },
      { x: 570, y: 560, width: 80, height: 20, color: '#9f1239' },
      { x: 700, y: 560, width: 80, height: 20, color: '#881337' },
      { x: 820, y: 560, width: 60, height: 20, color: '#4c0519' },

      // Layer 9 (y=400)
      { x: 40, y: 400, width: 80, height: 20, color: '#facc15' },
      { x: 160, y: 400, width: 80, height: 20, color: '#fbbf24' },
      { x: 280, y: 400, width: 80, height: 20, color: '#f59e0b' },
      { x: 400, y: 400, width: 80, height: 20, color: '#d97706' },
      { x: 520, y: 400, width: 80, height: 20, color: '#b45309' },
      { x: 640, y: 400, width: 80, height: 20, color: '#92400e' },
      { x: 760, y: 400, width: 80, height: 20, color: '#713f12' },

      // Layer 10 - 顶层奖励 (y=240)
      { x: 200, y: 240, width: 100, height: 20, color: '#ef4444' },
      { x: 420, y: 240, width: 100, height: 20, color: '#dc2626' },
      { x: 640, y: 240, width: 100, height: 20, color: '#b91c1c' },

      // 顶端终极平台 (y=120)
      { x: 350, y: 120, width: 200, height: 20, color: '#f59e0b' },
    ],
    stars: [
      // Layer 1 stars
      { x: 110, y: 1630, radius: 12, collected: false },
      { x: 315, y: 1630, radius: 12, collected: false },
      { x: 505, y: 1630, radius: 12, collected: false },
      { x: 690, y: 1630, radius: 12, collected: false },
      { x: 830, y: 1630, radius: 12, collected: false },

      // Layer 2 stars
      { x: 95, y: 1470, radius: 12, collected: false },
      { x: 255, y: 1470, radius: 12, collected: false },
      { x: 415, y: 1470, radius: 12, collected: false },
      { x: 575, y: 1470, radius: 12, collected: false },
      { x: 735, y: 1470, radius: 12, collected: false },

      // Layer 3 stars
      { x: 70, y: 1310, radius: 12, collected: false },
      { x: 230, y: 1310, radius: 12, collected: false },
      { x: 390, y: 1310, radius: 12, collected: false },
      { x: 550, y: 1310, radius: 12, collected: false },
      { x: 710, y: 1310, radius: 12, collected: false },

      // Layer 4 stars
      { x: 95, y: 1150, radius: 12, collected: false },
      { x: 245, y: 1150, radius: 12, collected: false },
      { x: 395, y: 1150, radius: 12, collected: false },
      { x: 545, y: 1150, radius: 12, collected: false },
      { x: 695, y: 1150, radius: 12, collected: false },

      // Layer 5 stars
      { x: 80, y: 990, radius: 12, collected: false },
      { x: 240, y: 990, radius: 12, collected: false },
      { x: 400, y: 990, radius: 12, collected: false },
      { x: 560, y: 990, radius: 12, collected: false },
      { x: 720, y: 990, radius: 12, collected: false },

      // Layer 6 stars
      { x: 85, y: 830, radius: 12, collected: false },
      { x: 235, y: 830, radius: 12, collected: false },
      { x: 385, y: 830, radius: 12, collected: false },
      { x: 535, y: 830, radius: 12, collected: false },
      { x: 685, y: 830, radius: 12, collected: false },

      // Layer 7 stars
      { x: 70, y: 670, radius: 12, collected: false },
      { x: 220, y: 670, radius: 12, collected: false },
      { x: 370, y: 670, radius: 12, collected: false },
      { x: 520, y: 670, radius: 12, collected: false },
      { x: 670, y: 670, radius: 12, collected: false },

      // Layer 8 stars
      { x: 90, y: 510, radius: 12, collected: false },
      { x: 220, y: 510, radius: 12, collected: false },
      { x: 350, y: 510, radius: 12, collected: false },
      { x: 480, y: 510, radius: 12, collected: false },
      { x: 610, y: 510, radius: 12, collected: false },
      { x: 740, y: 510, radius: 12, collected: false },

      // Layer 9 stars
      { x: 80, y: 350, radius: 12, collected: false },
      { x: 200, y: 350, radius: 12, collected: false },
      { x: 320, y: 350, radius: 12, collected: false },
      { x: 440, y: 350, radius: 12, collected: false },
      { x: 560, y: 350, radius: 12, collected: false },
      { x: 680, y: 350, radius: 12, collected: false },
      { x: 800, y: 350, radius: 12, collected: false },

      // Layer 10 stars (near top)
      { x: 250, y: 190, radius: 16, collected: false },
      { x: 470, y: 190, radius: 16, collected: false },
      { x: 690, y: 190, radius: 16, collected: false },

      // 终极奖励星 (最顶端)
      { x: 450, y: 70, radius: 30, collected: false, isSpecial: true },
    ],
    bosses: [
      // Layer 1
      createBoss(400, 1640, 2.2, 'patroller', 200, 580, '#ef4444', '👾', 300),
      createBoss(700, 1640, 2, 'patroller', 580, 820, '#f97316', '👻', 300),

      // Layer 2
      createBoss(300, 1480, 2, 'tracker', 200, 500, '#a855f7', '🤖', 280),
      createBoss(700, 1480, 1.8, 'tracker', 550, 820, '#ec4899', '💀', 280),

      // Layer 3
      createBoss(250, 1320, 2, 'jumper', 180, 450, '#84cc16', '👹', 250),
      createBoss(600, 1320, 2, 'jumper', 500, 780, '#06b6d4', '🐙', 250),

      // Layer 4
      createBoss(400, 1160, 2.2, 'charger', 300, 600, '#f43f5e', '🦖', 280),

      // Layer 5
      createBoss(350, 1000, 2, 'patroller', 200, 580, '#dc2626', '😈', 280),
      createBoss(700, 1000, 2, 'tracker', 550, 820, '#f472b6', '🐺', 280),

      // Layer 6
      createBoss(300, 840, 2.5, 'charger', 200, 550, '#8b5cf6', '🦊', 300),

      // Layer 7
      createBoss(400, 680, 2.2, 'jumper', 250, 600, '#f97316', '🐯', 280),

      // Layer 8
      createBoss(350, 520, 2.5, 'tracker', 200, 650, '#ef4444', '🐍', 300),

      // Layer 9 (guardian)
      createBoss(400, 360, 2.8, 'charger', 200, 700, '#dc2626', '🦅', 350),

      // Layer 10 / Top (elite guards)
      createBoss(300, 200, 3, 'tracker', 200, 600, '#f59e0b', '🐲', 400),
      createBoss(550, 200, 3, 'tracker', 350, 750, '#f59e0b', '🐲', 400),
    ],
    startX: 60,
    startY: 1630,
    bgColor: '#0a0e17',
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

  const { jump, star: playStarSound, hit, levelComplete, victory, select, startBGM, stopBGM } = useGameAudio();

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
    keysRef.current.clear();
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
      player.velocityY = -14;
      player.isJumping = true;
      jump();
    }

    player.velocityY += 0.45;
    if (player.velocityY > 16) player.velocityY = 16;
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
        playStarSound();
        if (star.isSpecial && currentLevel === LEVELS.length - 1) {
          shouldShowBirthday = true;
        }
      }
    });

    if (shouldShowBirthday) {
      victory();
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
      hit();
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
      levelComplete();
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
    startBGM();
  };

  const handleNextLevel = () => {
    const nextLevel = currentLevel + 1;
    setCurrentLevel(nextLevel);
    resetLevel(nextLevel);
    setShowLevelComplete(false);
    setIsPlaying(true);
    startBGM();
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
                onClick={() => { stopBGM(); onCompleteGame(); }}
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
