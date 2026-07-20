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
}

const COLORS = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899', '#fbbf24', '#06b6d4', '#f97316'];

const WISH_TEXTS = [
  '生日快乐', 'Happy Birthday', '愿你永远闪耀', '岁岁平安', '心想事成',
  '万事顺遂', '前程似锦', '笑口常开', '幸福美满', '梦想成真',
  '永远年轻', '永远热泪盈眶',
  '星光不负赶路人', '时光不负有心人', '所有美好如期而至',
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
    const particles: Particle[] = [];
    const wishParticles: WishParticle[] = [];
    const fireworkParticles: FireworkParticle[] = [];
    const mouse = { x: -1000, y: -1000 };
    const particleCount = 180;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        const type = Math.random() < 0.15 ? 'star' : Math.random() < 0.3 ? 'sparkle' : 'dot';
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          baseOpacity: Math.random() * 0.5 + 0.2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.01 + Math.random() * 0.03,
          type,
          angle: Math.random() * Math.PI * 2,
        });
      }
    };

    const spawnWish = () => {
      const text = WISH_TEXTS[Math.floor(Math.random() * WISH_TEXTS.length)];
      const fromLeft = Math.random() > 0.5;
      wishParticles.push({
        x: fromLeft ? -200 : canvas.width + 200,
        y: Math.random() * canvas.height * 0.7 + canvas.height * 0.1,
        vx: fromLeft ? (2 + Math.random() * 2) : -(2 + Math.random() * 2),
        text,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0,
        size: 18 + Math.random() * 8,
        life: 0,
        maxLife: 300 + Math.random() * 150,
      });
    };

    const spawnFirework = () => {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height * 0.6;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 40 + Math.floor(Math.random() * 30);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 4;
        fireworkParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          life: 0,
          maxLife: 70 + Math.random() * 50,
          size: 2 + Math.random() * 3,
        });
      }
      firework();
    };

    const drawStar = (x: number, y: number, size: number, color: string, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 3;
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
      ctx.shadowBlur = size * 4;
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
      const pulseSize = p.size * (1 + 0.2 * Math.sin(p.pulse)) * (1 + beatPulse * 0.3);

      if (p.type === 'star') {
        drawStar(p.x, p.y, pulseSize * 1.5, p.color, pulseOpacity);
      } else if (p.type === 'sparkle') {
        drawSparkle(p.x, p.y, pulseSize, p.color, pulseOpacity, p.angle);
      } else {
        ctx.save();
        ctx.globalAlpha = pulseOpacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = pulseSize * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawConnections = () => {
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            const alpha = 0.4 * (1 - distance / 100) * (1 + beatPulse * 0.3);
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

      if (distance < 130) {
        const force = (130 - distance) / 130;
        p.vx -= (dx / distance) * force * 0.2;
        p.vy -= (dy / distance) * force * 0.2;
      }

      p.x += p.vx + Math.sin(time * 0.002 + p.angle) * 0.4;
      p.y += p.vy + Math.cos(time * 0.002 + p.angle) * 0.4;

      p.vx *= 0.99;
      p.vy *= 0.99;

      p.pulse += p.pulseSpeed + beatPulse * 0.05;
      p.opacity = p.baseOpacity + 0.3 * Math.sin(p.pulse);
      p.angle += 0.01;

      if (p.x < -20) p.x = canvas.width + 20;
      if (p.x > canvas.width + 20) p.x = -20;
      if (p.y < -20) p.y = canvas.height + 20;
      if (p.y > canvas.height + 20) p.y = -20;
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
          w.opacity = 0.7 + 0.3 * Math.sin(w.life * 0.05);
        }

        ctx.save();
        ctx.globalAlpha = w.opacity;
        ctx.font = `bold ${w.size}px 'Rajdhani', sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(10, 14, 23, 0.9)';
        ctx.strokeText(w.text, w.x, w.y);
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 6;
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
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.05;
        f.vx *= 0.98;
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
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * opacity, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const animate = () => {
      time++;

      beatPulse *= 0.9;

      ctx.fillStyle = 'rgba(10, 14, 23, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const breath = 0.5 + 0.5 * Math.sin(time * 0.008);
      const breath2 = 0.5 + 0.5 * Math.sin(time * 0.015 + 1.5);
      const beatBoost = beatPulse * 0.15;

      const sweepY = (time * 1.5) % (canvas.height + 400) - 200;
      const sweepGrad = ctx.createLinearGradient(0, sweepY - 150, 0, sweepY + 150);
      sweepGrad.addColorStop(0, 'rgba(10, 14, 23, 0)');
      sweepGrad.addColorStop(0.5, `rgba(0, 212, 255, ${0.08 * breath + beatBoost})`);
      sweepGrad.addColorStop(1, 'rgba(10, 14, 23, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sweepX = (time * 2) % (canvas.width + 400) - 200;
      const sweepGradX = ctx.createLinearGradient(sweepX - 150, 0, sweepX + 150, 0);
      sweepGradX.addColorStop(0, 'rgba(10, 14, 23, 0)');
      sweepGradX.addColorStop(0.5, `rgba(157, 78, 221, ${0.06 * breath2 + beatBoost})`);
      sweepGradX.addColorStop(1, 'rgba(10, 14, 23, 0)');
      ctx.fillStyle = sweepGradX;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const waveGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      const waveAlpha = (0.03 + 0.03 * breath) * (1 + beatPulse * 0.5);
      waveGradient.addColorStop(0, `rgba(0, 212, 255, ${waveAlpha})`);
      waveGradient.addColorStop(0.4, `rgba(157, 78, 221, ${waveAlpha * 0.6})`);
      waveGradient.addColorStop(0.7, `rgba(10, 14, 23, ${0.15 * breath})`);
      waveGradient.addColorStop(1, `rgba(10, 14, 23, ${0.3 * breath})`);
      ctx.fillStyle = waveGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (breath > 0.7) {
        const cornerGrad = ctx.createRadialGradient(
          canvas.width * 0.2, canvas.height * 0.8, 0,
          canvas.width * 0.2, canvas.height * 0.8, canvas.width * 0.4
        );
        cornerGrad.addColorStop(0, `rgba(255, 107, 157, ${0.04 * breath})`);
        cornerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cornerGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (breath2 > 0.7) {
        const cornerGrad2 = ctx.createRadialGradient(
          canvas.width * 0.8, canvas.height * 0.2, 0,
          canvas.width * 0.8, canvas.height * 0.2, canvas.width * 0.4
        );
        cornerGrad2.addColorStop(0, `rgba(250, 204, 21, ${0.03 * breath2})`);
        cornerGrad2.addColorStop(1, 'transparent');
        ctx.fillStyle = cornerGrad2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = `rgba(10, 14, 23, ${0.12 * (1 - breath) * (1 - breath2)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(updateParticle);
      drawConnections();
      particles.forEach(drawParticle);

      drawWishes();
      drawFireworks();

      if (time % 80 === 0 && wishParticles.length < 6) {
        spawnWish();
      }

      if (time % 60 === 0 && Math.random() > 0.2) {
        spawnFirework();
      }

      if (time % 30 === 0 && Math.random() > 0.5) {
        spawnFirework();
      }

      if (beatPulse > 0.3 && Math.random() > 0.5) {
        spawnFirework();
      }

      animationId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleBeat = () => {
      beatPulse = 1;
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('music-beat', handleBeat as EventListener);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
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
