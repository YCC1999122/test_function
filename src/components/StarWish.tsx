import { useEffect, useRef, useState, useCallback } from 'react';
import { Star, Sparkles, Heart, Zap } from 'lucide-react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  twinkle: number;
  twinkleSpeed: number;
  wish: string;
  discovered: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
}

const WISH_POOL = [
  '愿你永远幸福快乐',
  '愿你前程似锦',
  '愿你心想事成',
  '愿你被世界温柔以待',
  '愿你眼里有光心中有爱',
  '愿所有美好如期而至',
  '愿你三冬暖愿你春不寒',
  '愿你天黑有灯下雨有伞',
  '愿你历尽千帆归来仍是少年',
  '愿你一生温暖纯良',
  '愿你拥有所有的好运',
  '愿你笑容常伴左右',
  '愿梦想照进现实',
  '愿你永远十八岁',
  '愿你生活明朗万物可爱',
  '愿你乘风破浪勇往直前',
  '愿星光指引你前行',
  '愿时光温柔以待',
  '愿你闪闪发光',
  '愿你被爱包围',
  '愿你勇敢做自己',
  '愿你所求皆如愿',
  '愿你所行皆坦途',
  '愿你的生活如诗如画',
  '愿你心中有花眼里有海',
];

const COLORS = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'];

const StarWish = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const animRef = useRef<number>();
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [currentWish, setCurrentWish] = useState<{ text: string; x: number; y: number } | null>(null);
  const [totalStars, setTotalStars] = useState(0);

  const initStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const stars: Star[] = [];
    const starCount = 50;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 8 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        wish: WISH_POOL[Math.floor(Math.random() * WISH_POOL.length)],
        discovered: false,
      });
    }

    starsRef.current = stars;
    setTotalStars(starCount);
    setDiscoveredCount(0);
  }, []);

  const drawStar = (ctx: CanvasRenderingContext2D, star: Star, time: number) => {
    const twinkleAlpha = 0.4 + 0.6 * Math.sin(star.twinkle + time * star.twinkleSpeed);
    const scale = star.discovered ? 1.2 : 1;

    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.globalAlpha = twinkleAlpha;

    // 外发光
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, star.size * 4);
    glow.addColorStop(0, star.color + '80');
    glow.addColorStop(0.5, star.color + '30');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, star.size * 4 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 五角星
    ctx.fillStyle = star.color;
    ctx.shadowColor = star.color;
    ctx.shadowBlur = star.size * 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const outerX = Math.cos(angle) * star.size * scale;
      const outerY = Math.sin(angle) * star.size * scale;
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      const innerAngle = angle + Math.PI / 5;
      ctx.lineTo(Math.cos(innerAngle) * star.size * 0.4 * scale, Math.sin(innerAngle) * star.size * 0.4 * scale);
    }
    ctx.closePath();
    ctx.fill();

    if (star.discovered) {
      // 已发现的星星有额外光环
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 0.05);
      ctx.strokeStyle = star.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, star.size * 2 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawShootingStar = (ctx: CanvasRenderingContext2D, ss: ShootingStar) => {
    const tailX = ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length;
    const tailY = ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length;

    const gradient = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.6, '#ffffff80');
    gradient.addColorStop(1, '#ffffff');

    ctx.save();
    ctx.globalAlpha = ss.opacity;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(ss.x, ss.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ss.x, ss.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const time = Date.now() * 0.001;

    // 清除
    ctx.fillStyle = 'rgba(10, 14, 23, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 更新和绘制星星
    starsRef.current.forEach(star => {
      star.twinkle += star.twinkleSpeed;
      drawStar(ctx, star, time);
    });

    // 生成流星
    if (Math.random() > 0.985) {
      const startX = Math.random() * canvas.width;
      const startY = -20;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
      const speed = 6 + Math.random() * 4;
      shootingStarsRef.current.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 80 + Math.random() * 60,
        opacity: 1,
      });
    }

    // 更新和绘制流星
    for (let i = shootingStarsRef.current.length - 1; i >= 0; i--) {
      const ss = shootingStarsRef.current[i];
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.opacity -= 0.012;

      if (ss.opacity <= 0 || ss.y > canvas.height + 50) {
        shootingStarsRef.current.splice(i, 1);
        continue;
      }
      drawShootingStar(ctx, ss);
    }

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    initStars();
    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => initStars();
    window.addEventListener('resize', handleResize);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [initStars]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 找到点击的星星
    let clickedStar: Star | null = null;
    for (const star of starsRef.current) {
      const dx = star.x - x;
      const dy = star.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < star.size * 4 && distance > star.size * 2) {
        clickedStar = star;
        break;
      }
    }

    if (clickedStar && !clickedStar.discovered) {
      clickedStar.discovered = true;
      setDiscoveredCount(prev => prev + 1);
      setCurrentWish({ text: clickedStar.wish, x: clickedStar.x, y: clickedStar.y });

      // 清除显示
      setTimeout(() => {
        setCurrentWish(null);
      }, 3000);
    }
  };

  const handleClickMiss = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 点击空白处生成流星 + 烟花效果
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 2 + Math.random() * 2;
      shootingStarsRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 30,
        opacity: 1,
      });
    }
  };

  const discoverAll = () => {
    starsRef.current.forEach(star => {
      if (!star.discovered) {
        star.discovered = true;
      }
    });
    setDiscoveredCount(totalStars);
  };

  const resetStars = () => {
    starsRef.current.forEach(star => {
      star.discovered = false;
    });
    setDiscoveredCount(0);
    setCurrentWish(null);
  };

  const progress = totalStars > 0 ? (discoveredCount / totalStars) * 100 : 0;

  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star className="w-8 h-8 text-yellow-400" style={{ filter: 'drop-shadow(0 0 15px #facc15)' }} />
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display">
              星空许愿
            </h2>
            <Star className="w-8 h-8 text-neon-blue" style={{ filter: 'drop-shadow(0 0 15px #00d4ff)' }} />
          </div>
          <p className="text-silver-gray">点击星星，发现隐藏的祝福</p>
          <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 via-neon-blue to-neon-purple mx-auto rounded-full mt-4" />
        </div>

        <div ref={containerRef} className="relative h-[500px] neon-box rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
            onClick={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              
              // 检测是否点击到星星
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              let hitStar = false;
              
              for (const star of starsRef.current) {
                const dx = star.x - x;
                const dy = star.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < star.size * 4) {
                  hitStar = true;
                  break;
                }
              }
              
              if (hitStar) {
                handleClick(e);
              } else {
                handleClickMiss(e);
              }
            }}
          />

          {/* 发现的愿望提示 */}
          {currentWish && (
            <div
              className="absolute pointer-events-none transition-all duration-500"
              style={{
                left: currentWish.x,
                top: currentWish.y - 50,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="glass-effect rounded-lg px-4 py-2 whitespace-nowrap animate-bounce">
                <span className="text-sm font-medium text-neon-blue flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {currentWish.text}
                </span>
              </div>
            </div>
          )}

          {/* 进度显示 */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="glass-effect rounded-full px-4 py-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-sm text-light-gray">
                已发现 {discoveredCount} / {totalStars} 颗星星
              </span>
            </div>
            <div className="glass-effect rounded-full px-4 py-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-light-gray">{progress.toFixed(0)}%</span>
            </div>
          </div>

          {/* 进度条 */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-2 bg-cold-blue rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-neon-blue to-neon-purple rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="absolute bottom-12 right-4 flex gap-2">
            <button
              onClick={discoverAll}
              className="px-4 py-2 rounded-full glass-effect text-sm text-light-gray hover:text-white transition-colors"
            >
              全部点亮
            </button>
            <button
              onClick={resetStars}
              className="px-4 py-2 rounded-full glass-effect text-sm text-light-gray hover:text-white transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        {/* 愿望池 */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-white text-center mb-6 font-display">
            星空愿望池
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {WISH_POOL.slice(0, 10).map((wish, index) => (
              <div
                key={index}
                className="neon-box rounded-lg p-3 text-center text-sm text-silver-gray hover:text-neon-blue transition-colors cursor-default"
              >
                {wish}
              </div>
            ))}
          </div>
          <p className="text-center text-silver-gray/50 text-sm mt-4">
            点击上方星空区域探索完整愿望池
          </p>
        </div>
      </div>
    </div>
  );
};

export default StarWish;
