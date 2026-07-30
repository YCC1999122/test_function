import { useEffect, useRef } from 'react';
import { AUTO_WISH_MESSAGES } from '../utils/constants';
import { useGameAudio } from './GameAudio';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
  type: 'dot' | 'star' | 'sparkle';
  angle: number;
}

interface WishParticle {
  x: number;
  y: number;
  vx: number;
  text: string;
  color: string;
  opacity: number;
  size: number;
  life: number;
  maxLife: number;
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  gravity?: number;
  trail?: { x: number; y: number; opacity: number }[];
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  color: string;
  width: number;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
  life: number;
  lineWidth: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  shape: 'rect' | 'circle';
}

interface Laser {
  angle: number;
  speed: number;
  color: string;
  length: number;
  opacity: number;
  life: number;
}

interface LightOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

interface ShapeParticle {
  x: number;
  y: number;
  tx: number; // target x
  ty: number; // target y
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
  phase: 'float' | 'gather' | 'hold' | 'disperse';
  phaseTimer: number;
  holdDuration: number;
}

const SHAPE_TEXTS = ['生日快乐', '❤', '★', '✨', '🎂', '💖', '🌟', '🎉'];

const COLORS = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899', '#fbbf24', '#06b6d4', '#f97316'];

const WISH_TEXTS = [
  '生日快乐', 'Happy Birthday', '愿你永远闪耀', '岁岁平安', '心想事成',
  '万事顺遂', '前程似锦', '笑口常开', '幸福美满', '梦想成真',
  '永远年轻', '永远热泪盈眶', '星光不负赶路人', '时光不负有心人',
  '所有美好如期而至', '愿你被这世界温柔以待', '愿所有的好运都降临',
  '愿你三冬暖,愿你春不寒', '愿你天黑有灯,下雨有伞', '愿往后的日子都是甜的',
  '愿你眼里有光,心中有爱', '愿你历尽千帆归来仍是少年', '愿你所有快乐无需假装',
  '愿你走出半生归来仍是少年', '愿所有的美好都如约而至', '愿你成为自己的太阳',
  '愿你一生温暖纯良不舍爱与自由', '愿你所愿皆成真所求皆如意',
  ...AUTO_WISH_MESSAGES,
];

let beatPulse = 0;

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { firework } = useGameAudio();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let lastFireworkTime = 0;
    let frameSkip = 0;
    const particles: Particle[] = [];
    const wishParticles: WishParticle[] = [];
    const fireworkParticles: FireworkParticle[] = [];
    const meteors: Meteor[] = [];
    const rings: Ring[] = [];
    const confettis: Confetti[] = [];
    const lasers: Laser[] = [];
    const lightOrbs: LightOrb[] = [];
    const shapeParticles: ShapeParticle[] = [];
    const mouse = { x: -1000, y: -1000 };
    
    const MAX_PARTICLES = 220;
    const MAX_FIREWORK = 200;
    const MAX_WISHES = 6;
    const MAX_METEORS = 8;
    const MAX_RINGS = 8;
    const MAX_CONFETTIS = 60;
    const MAX_LASERS = 4;
    const MAX_ORBS = 3;
    const MAX_SHAPE_PARTICLES = 120;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const type = Math.random() < 0.2 ? 'star' : Math.random() < 0.35 ? 'sparkle' : 'dot';
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 4 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          baseOpacity: Math.random() * 0.5 + 0.2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.01 + Math.random() * 0.04,
          type,
          angle: Math.random() * Math.PI * 2,
        });
      }
    };

    const spawnWish = () => {
      if (wishParticles.length >= MAX_WISHES) return;
      const text = WISH_TEXTS[Math.floor(Math.random() * WISH_TEXTS.length)];
      const fromLeft = Math.random() > 0.5;
      wishParticles.push({
        x: fromLeft ? -200 : canvas.width + 200,
        y: Math.random() * canvas.height * 0.7 + canvas.height * 0.1,
        vx: fromLeft ? (2.5 + Math.random() * 3) : -(2.5 + Math.random() * 3),
        text,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0,
        size: 20 + Math.random() * 10,
        life: 0,
        maxLife: 350 + Math.random() * 200,
      });
    };

    const spawnFirework = (baseFreq?: number) => {
      if (fireworkParticles.length >= MAX_FIREWORK) return;
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height * 0.6 + canvas.height * 0.1;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 80 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 3 + Math.random() * 6;
        const useGradient = Math.random() > 0.5;
        const particleColor = useGradient ? color : COLORS[Math.floor(Math.random() * COLORS.length)];
        const trail: { x: number; y: number; opacity: number }[] = [];
        fireworkParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: particleColor,
          life: 0,
          maxLife: 90 + Math.random() * 70,
          size: 2 + Math.random() * 4,
          gravity: 0.05 + Math.random() * 0.05,
          trail,
        });
      }
      firework(baseFreq);

      if (rings.length < MAX_RINGS) {
        rings.push({
          x: cx,
          y: cy,
          radius: 5,
          maxRadius: 180 + Math.random() * 120,
          opacity: 0.9,
          color,
          life: 0,
          lineWidth: 3,
        });
      }
    };

    const spawnMeteor = () => {
      if (meteors.length >= MAX_METEORS) return;
      const startX = Math.random() * canvas.width * 0.9;
      const startY = -50;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.4;
      const speed = 10 + Math.random() * 8;
      meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 100 + Math.random() * 80,
        opacity: 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: 1.5 + Math.random() * 1.5,
      });
    };

    const spawnConfetti = (x: number, y: number, count = 25) => {
      if (confettis.length >= MAX_CONFETTIS) return;
      const actualCount = Math.min(count, MAX_CONFETTIS - confettis.length);
      for (let i = 0; i < actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5;
        confettis.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 4 + Math.random() * 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          life: 0,
          maxLife: 120 + Math.random() * 80,
          shape: Math.random() > 0.5 ? 'rect' : 'circle',
        });
      }
    };

    const spawnLaser = () => {
      if (lasers.length >= MAX_LASERS) return;
      lasers.push({
        angle: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        length: Math.max(canvas.width, canvas.height),
        opacity: 0.6,
        life: 0,
      });
    };

    const spawnLightOrb = () => {
      if (lightOrbs.length >= MAX_ORBS) return;
      lightOrbs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 40 + Math.random() * 80,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.15 + Math.random() * 0.15,
        life: 0,
        maxLife: 200 + Math.random() * 150,
      });
    };

    const generateShapeTargets = (text: string, centerX: number, centerY: number, fontSize: number): { tx: number; ty: number }[] => {
      const offCanvas = document.createElement('canvas');
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return [];

      offCanvas.width = Math.max(400, text.length * fontSize * 1.2);
      offCanvas.height = fontSize * 2;

      offCtx.fillStyle = '#fff';
      offCtx.font = `bold ${fontSize}px 'Rajdhani', sans-serif`;
      offCtx.textBaseline = 'middle';
      offCtx.textAlign = 'center';
      offCtx.fillText(text, offCanvas.width / 2, offCanvas.height / 2);

      const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
      const targets: { tx: number; ty: number }[] = [];
      const step = Math.max(3, Math.floor(fontSize / 12));

      for (let y = 0; y < offCanvas.height; y += step) {
        for (let x = 0; x < offCanvas.width; x += step) {
          const index = (y * offCanvas.width + x) * 4 + 3;
          if (imageData[index] > 128) {
            targets.push({
              tx: centerX + x - offCanvas.width / 2,
              ty: centerY + y - offCanvas.height / 2,
            });
          }
        }
      }

      return targets;
    };

    const spawnShapeText = (text?: string) => {
      if (shapeParticles.length > 0) return;
      const shapeText = text || SHAPE_TEXTS[Math.floor(Math.random() * SHAPE_TEXTS.length)];
      const fontSize = 80 + Math.random() * 40;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const targets = generateShapeTargets(shapeText, centerX, centerY, fontSize);
      const count = Math.min(targets.length, MAX_SHAPE_PARTICLES);
      const step = Math.max(1, Math.floor(targets.length / count));

      for (let i = 0; i < count; i++) {
        const target = targets[i * step] || targets[i % targets.length];
        if (!target) continue;
        shapeParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          tx: target.tx,
          ty: target.ty,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 1.5 + Math.random() * 2,
          opacity: 0,
          phase: 'gather',
          phaseTimer: 0,
          holdDuration: 240 + Math.random() * 120,
        });
      }
    };

    const drawShapeParticles = () => {
      for (let i = shapeParticles.length - 1; i >= 0; i--) {
        const p = shapeParticles[i];
        p.phaseTimer++;

        if (p.phase === 'gather') {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          p.vx += dx * 0.008;
          p.vy += dy * 0.008;
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.x += p.vx;
          p.y += p.vy;
          p.opacity = Math.min(1, p.opacity + 0.04);

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 3 || p.phaseTimer > 120) {
            p.phase = 'hold';
            p.phaseTimer = 0;
          }
        } else if (p.phase === 'hold') {
          p.x = p.tx + Math.sin(p.phaseTimer * 0.05) * 1.5;
          p.y = p.ty + Math.cos(p.phaseTimer * 0.05) * 1.5;
          p.opacity = 0.8 + 0.2 * Math.sin(p.phaseTimer * 0.08);
          if (p.phaseTimer > p.holdDuration) {
            p.phase = 'disperse';
            p.phaseTimer = 0;
          }
        } else if (p.phase === 'disperse') {
          p.vx += (Math.random() - 0.5) * 0.8;
          p.vy += (Math.random() - 0.5) * 0.8 - 0.05;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.x += p.vx;
          p.y += p.vy;
          p.opacity *= 0.96;
          if (p.opacity < 0.01 || p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
            shapeParticles.splice(i, 1);
          }
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawStar = (x: number, y: number, size: number, color: string, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 4;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const outerX = Math.cos(angle) * size;
        const outerY = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        const innerAngle = angle + Math.PI / 5;
        ctx.lineTo(Math.cos(innerAngle) * size * 0.4, Math.sin(innerAngle) * size * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawSparkle = (x: number, y: number, size: number, color: string, opacity: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 5;
      ctx.beginPath();
      ctx.moveTo(0, -size * 2);
      ctx.lineTo(size * 0.5, -size * 0.5);
      ctx.lineTo(size * 2, 0);
      ctx.lineTo(size * 0.5, size * 0.5);
      ctx.lineTo(0, size * 2);
      ctx.lineTo(-size * 0.5, size * 0.5);
      ctx.lineTo(-size * 2, 0);
      ctx.lineTo(-size * 0.5, -size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawParticle = (p: Particle) => {
      const pulseOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse)) * (1 + beatPulse * 0.5);
      const pulseSize = p.size * (1 + 0.3 * Math.sin(p.pulse)) * (1 + beatPulse * 0.3);

      if (p.type === 'star') {
        drawStar(p.x, p.y, pulseSize * 1.5, p.color, pulseOpacity);
      } else if (p.type === 'sparkle') {
        drawSparkle(p.x, p.y, pulseSize, p.color, pulseOpacity, p.angle);
      } else {
        ctx.save();
        ctx.globalAlpha = pulseOpacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = pulseSize * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawConnections = () => {
      ctx.lineWidth = 0.5;
      const maxDist = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDist) {
            const alpha = 0.3 * (1 - distance / maxDist) * (1 + beatPulse * 0.4);
            ctx.beginPath();
            ctx.strokeStyle = particles[i].color;
            ctx.globalAlpha = alpha;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const updateParticle = (p: Particle) => {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        const force = (150 - distance) / 150;
        p.vx -= (dx / distance) * force * 0.3;
        p.vy -= (dy / distance) * force * 0.3;
      }

      p.x += p.vx + Math.sin(time * 0.002 + p.angle) * 0.5;
      p.y += p.vy + Math.cos(time * 0.002 + p.angle) * 0.5;

      p.vx *= 0.98;
      p.vy *= 0.98;

      p.pulse += p.pulseSpeed + beatPulse * 0.06;
      p.opacity = p.baseOpacity + 0.3 * Math.sin(p.pulse);
      p.angle += 0.015;

      if (p.x < -30) p.x = canvas.width + 30;
      if (p.x > canvas.width + 30) p.x = -30;
      if (p.y < -30) p.y = canvas.height + 30;
      if (p.y > canvas.height + 30) p.y = -30;
    };

    const drawWishes = () => {
      for (let i = wishParticles.length - 1; i >= 0; i--) {
        const w = wishParticles[i];
        w.x += w.vx;
        w.life++;

        if (w.life < 60) {
          w.opacity = w.life / 60;
        } else if (w.life > w.maxLife - 60) {
          w.opacity = (w.maxLife - w.life) / 60;
        } else {
          w.opacity = 0.8 + 0.2 * Math.sin(w.life * 0.05);
        }

        ctx.save();
        ctx.globalAlpha = w.opacity;
        ctx.font = `bold ${w.size}px 'Rajdhani', sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(10, 14, 23, 0.95)';
        ctx.strokeText(w.text, w.x, w.y);
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = w.color;
        ctx.fillText(w.text, w.x, w.y);
        ctx.restore();

        if (w.life >= w.maxLife || w.x < -300 || w.x > canvas.width + 300) {
          wishParticles.splice(i, 1);
        }
      }
    };

    const drawFireworks = () => {
      for (let i = fireworkParticles.length - 1; i >= 0; i--) {
        const f = fireworkParticles[i];

        if (f.trail) {
          f.trail.push({ x: f.x, y: f.y, opacity: 1 });
          if (f.trail.length > 8) f.trail.shift();
          for (let t = 0; t < f.trail.length; t++) {
            const tr = f.trail[t];
            tr.opacity = (t / f.trail.length) * 0.5;
            ctx.save();
            ctx.globalAlpha = tr.opacity;
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, f.size * (t / f.trail.length) * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        f.x += f.vx;
        f.y += f.vy;
        f.vy += f.gravity || 0.05;
        f.vx *= 0.97;
        f.vy *= 0.97;
        f.life++;

        const opacity = 1 - f.life / f.maxLife;
        if (opacity <= 0) {
          fireworkParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * opacity, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawMeteors = () => {
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.opacity -= 0.008;

        if (m.opacity <= 0 || m.y > canvas.height + 50 || m.x > canvas.width + 100) {
          meteors.splice(i, 1);
          continue;
        }

        const tailX = m.x - (m.vx / Math.sqrt(m.vx * m.vx + m.vy * m.vy)) * m.length;
        const tailY = m.y - (m.vy / Math.sqrt(m.vx * m.vx + m.vy * m.vy)) * m.length;

        const gradient = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.4, m.color + '66');
        gradient.addColorStop(1, m.color);

        ctx.save();
        ctx.globalAlpha = m.opacity;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = m.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.width * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
        ctx.restore();
      }
    };

    const drawRings = () => {
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life++;
        r.radius += (r.maxRadius - r.radius) * 0.06;
        r.opacity -= 0.015;

        if (r.opacity <= 0) {
          rings.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = r.opacity;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.lineWidth;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = r.opacity * 0.3;
        ctx.lineWidth = r.lineWidth * 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawConfettis = () => {
      for (let i = confettis.length - 1; i >= 0; i--) {
        const c = confettis[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.1;
        c.vx *= 0.99;
        c.rotation += c.rotationSpeed;
        c.life++;

        const opacity = 1 - c.life / c.maxLife;
        if (opacity <= 0 || c.y > canvas.height + 50) {
          confettis.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 8;
        if (c.shape === 'rect') {
          ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.5);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    };

    const drawLasers = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.angle += l.speed;
        l.life++;
        l.opacity *= 0.985;

        if (l.opacity < 0.01 || l.life > 180) {
          lasers.splice(i, 1);
          continue;
        }

        const x1 = cx + Math.cos(l.angle) * l.length;
        const y1 = cy + Math.sin(l.angle) * l.length;
        const x2 = cx - Math.cos(l.angle) * l.length;
        const y2 = cy - Math.sin(l.angle) * l.length;

        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 1;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 15;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, l.color);
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawLightOrbs = () => {
      for (let i = lightOrbs.length - 1; i >= 0; i--) {
        const o = lightOrbs[i];
        o.x += o.vx;
        o.y += o.vy;
        o.life++;

        if (o.life > o.maxLife || o.x < -100 || o.x > canvas.width + 100 || o.y < -100 || o.y > canvas.height + 100) {
          lightOrbs.splice(i, 1);
          continue;
        }

        const fadeIn = Math.min(1, o.life / 40);
        const fadeOut = Math.min(1, (o.maxLife - o.life) / 40);
        const alpha = o.opacity * fadeIn * fadeOut;

        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.size);
        grad.addColorStop(0, o.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(0.5, o.color + Math.floor(alpha * 100).toString(16).padStart(2, '0'));
        grad.addColorStop(1, o.color + '00');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawAurora = () => {
      const grad1 = ctx.createLinearGradient(0, 0, 0, canvas.height);
      const auroraShift1 = Math.sin(time * 0.005) * 0.5 + 0.5;
      const auroraShift2 = Math.sin(time * 0.007 + 1) * 0.5 + 0.5;
      grad1.addColorStop(0, `rgba(0, 212, 255, ${0.05 + auroraShift1 * 0.03})`);
      grad1.addColorStop(0.5, `rgba(157, 78, 221, ${0.03 + auroraShift2 * 0.03})`);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad2 = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time * 0.003) * 100,
        canvas.height * 0.4 + Math.cos(time * 0.004) * 80,
        0,
        canvas.width * 0.3,
        canvas.height * 0.4,
        canvas.width * 0.5
      );
      grad2.addColorStop(0, `rgba(255, 107, 157, ${0.06})`);
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad3 = ctx.createRadialGradient(
        canvas.width * 0.7 + Math.cos(time * 0.003) * 100,
        canvas.height * 0.6 + Math.sin(time * 0.004) * 80,
        0,
        canvas.width * 0.7,
        canvas.height * 0.6,
        canvas.width * 0.5
      );
      grad3.addColorStop(0, `rgba(250, 204, 21, ${0.05})`);
      grad3.addColorStop(1, 'transparent');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const animate = () => {
      time++;
      frameSkip++;

      beatPulse *= 0.92;

      // Fade trail
      ctx.fillStyle = 'rgba(10, 14, 23, 0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const breath = 0.5 + 0.5 * Math.sin(time * 0.006);
      const breath2 = 0.5 + 0.5 * Math.sin(time * 0.012 + 1.5);
      const breath3 = 0.5 + 0.5 * Math.sin(time * 0.02 + 3);
      const beatBoost = beatPulse * 0.2;

      // Aurora - only every 2nd frame
      if (frameSkip % 2 === 0) {
        drawAurora();
        drawLightOrbs();
      }

      // Multi-layer light sweeps
      const sweepY = (time * 2) % (canvas.height + 600) - 300;
      const sweepGrad = ctx.createLinearGradient(0, sweepY - 200, 0, sweepY + 200);
      sweepGrad.addColorStop(0, 'rgba(10, 14, 23, 0)');
      sweepGrad.addColorStop(0.5, `rgba(0, 212, 255, ${0.12 * breath + beatBoost})`);
      sweepGrad.addColorStop(1, 'rgba(10, 14, 23, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sweepX = (time * 2.5) % (canvas.width + 600) - 300;
      const sweepGradX = ctx.createLinearGradient(sweepX - 200, 0, sweepX + 200, 0);
      sweepGradX.addColorStop(0, 'rgba(10, 14, 23, 0)');
      sweepGradX.addColorStop(0.5, `rgba(157, 78, 221, ${0.1 * breath2 + beatBoost})`);
      sweepGradX.addColorStop(1, 'rgba(10, 14, 23, 0)');
      ctx.fillStyle = sweepGradX;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center pulse wave
      const centerPulse = 0.3 + 0.7 * Math.sin(time * 0.03);
      const waveRadius = (time * 3) % Math.max(canvas.width, canvas.height);
      const centerGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, waveRadius
      );
      centerGrad.addColorStop(0, `rgba(0, 212, 255, ${0.08 * centerPulse})`);
      centerGrad.addColorStop(0.5, `rgba(157, 78, 221, ${0.04 * centerPulse})`);
      centerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Corner glows
      if (breath > 0.6 && frameSkip % 3 === 0) {
        const cornerGrad = ctx.createRadialGradient(
          canvas.width * 0.15, canvas.height * 0.85, 0,
          canvas.width * 0.15, canvas.height * 0.85, canvas.width * 0.35
        );
        cornerGrad.addColorStop(0, `rgba(255, 107, 157, ${0.08 * breath})`);
        cornerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cornerGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (breath2 > 0.6 && frameSkip % 3 === 1) {
        const cornerGrad2 = ctx.createRadialGradient(
          canvas.width * 0.85, canvas.height * 0.15, 0,
          canvas.width * 0.85, canvas.height * 0.15, canvas.width * 0.35
        );
        cornerGrad2.addColorStop(0, `rgba(250, 204, 21, ${0.06 * breath2})`);
        cornerGrad2.addColorStop(1, 'transparent');
        ctx.fillStyle = cornerGrad2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Vignette - every 3rd frame
      if (frameSkip % 3 === 0) {
        const vignette = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
          canvas.width / 2, canvas.height / 2, canvas.height * 0.8
        );
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, 'rgba(10, 14, 23, 0.45)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      particles.forEach(updateParticle);
      
      // Only draw connections every 2nd frame (expensive operation)
      if (frameSkip % 2 === 0) {
        drawConnections();
      }
      particles.forEach(drawParticle);

      drawLasers();
      drawRings();
      drawMeteors();
      drawConfettis();
      drawWishes();
      drawFireworks();
      drawShapeParticles();

      // Spawn effects
      if (time % 60 === 0 && wishParticles.length < MAX_WISHES) {
        spawnWish();
      }

      if (time % 150 === 0 && Math.random() > 0.3) {
        spawnFirework();
      }

      if (time % 50 === 0 && Math.random() > 0.4) {
        spawnMeteor();
      }

      if (time % 250 === 0 && Math.random() > 0.4) {
        spawnLaser();
      }

      if (time % 180 === 0) {
        spawnLightOrb();
      }

      // Periodic shape text
      if (time % 600 === 0) {
        spawnShapeText();
      }

      // Periodic massive celebration
      if (time - lastFireworkTime > 500) {
        lastFireworkTime = time;
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            spawnFirework();
            spawnConfetti(
              Math.random() * canvas.width,
              Math.random() * canvas.height * 0.5 + canvas.height * 0.2,
              25
            );
          }, i * 120);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 80 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 3 + Math.random() * 5;
        fireworkParticles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.5 ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 0,
          maxLife: 90 + Math.random() * 70,
          size: 2 + Math.random() * 4,
          gravity: 0.05,
          trail: [],
        });
      }
      firework(523.25);

      rings.push({
        x,
        y,
        radius: 5,
        maxRadius: 220,
        opacity: 0.9,
        color,
        life: 0,
        lineWidth: 3,
      });

      spawnConfetti(x, y, 35);

      // Click triggers shape text too
      if (Math.random() > 0.6) {
        const text = SHAPE_TEXTS[Math.floor(Math.random() * SHAPE_TEXTS.length)];
        spawnShapeText(text);
      }
    };

    const handleBeat = (e: Event) => {
      beatPulse = 1;
      const detail = (e as CustomEvent).detail;
      if (detail && detail.freq) {
        if (Math.random() > 0.3) {
          spawnFirework(detail.freq);
        }
        spawnConfetti(
          Math.random() * canvas.width,
          Math.random() * canvas.height * 0.4 + canvas.height * 0.2,
          15
        );
        // Random shape text on strong beats
        if (Math.random() > 0.85) {
          spawnShapeText();
        }
      }
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('music-beat', handleBeat as EventListener);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('music-beat', handleBeat as EventListener);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default ParticleBackground;
