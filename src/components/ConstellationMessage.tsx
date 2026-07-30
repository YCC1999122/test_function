import { useEffect, useState, useRef } from 'react';
import { MessageCircle, Heart, Star, Sparkles, Gift, PartyPopper, Flame, Zap } from 'lucide-react';
import { AUTO_WISH_MESSAGES } from '../utils/constants';

const COLORS = ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee', '#a855f7', '#ec4899'];

interface Constellation {
  id: number;
  x: number;
  y: number;
  connections: number[];
  message: string;
}

const ConstellationMessage = () => {
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<string[]>([]);
  const [activeConstellation, setActiveConstellation] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 初始星座
    const initConstellations = () => {
      const consts: Constellation[] = [];
      const messagePool = [...AUTO_WISH_MESSAGES, ...AUTO_WISH_MESSAGES]; // 翻倍以实现循环

      for (let i = 0; i < 8; i++) {
        consts.push({
          id: i,
          x: 15 + Math.random() * 70,
          y: 20 + Math.random() * 60,
          connections: [],
          message: messagePool[i % messagePool.length],
        });
      }

      // 随机连接
      consts.forEach(c => {
        const connectCount = Math.floor(Math.random() * 2) + 1;
        const available = consts.filter(o => o.id !== c.id);
        for (let i = 0; i < connectCount && i < available.length; i++) {
          const target = available[Math.floor(Math.random() * available.length)];
          if (!c.connections.includes(target.id)) {
            c.connections.push(target.id);
          }
        }
      });

      setConstellations(consts);
    };

    initConstellations();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // 循环显示消息
      const startIndex = Math.floor(Date.now() / 3000) % AUTO_WISH_MESSAGES.length;
      const newMessages = [];
      for (let i = 0; i < 6; i++) {
        newMessages.push(AUTO_WISH_MESSAGES[(startIndex + i) % AUTO_WISH_MESSAGES.length]);
      }
      setVisibleMessages(newMessages);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const icons = [MessageCircle, Heart, Star, Sparkles, Gift, PartyPopper, Flame, Zap];

  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-400" style={{ filter: 'drop-shadow(0 0 15px #facc15)' }} />
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display">
              星座密语
            </h2>
            <Sparkles className="w-8 h-8 text-neon-purple" style={{ filter: 'drop-shadow(0 0 15px #9d4edd)' }} />
          </div>
          <p className="text-silver-gray">每一个星座都承载着一份特别的祝福</p>
          <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 via-neon-purple to-pink-500 mx-auto rounded-full mt-4" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 星座可视化 */}
          <div className="neon-box rounded-xl p-6 relative overflow-hidden h-[400px]">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {/* 绘制连接线 */}
              {constellations.map(c =>
                c.connections.map(targetId => {
                  const target = constellations.find(t => t.id === targetId);
                  if (!target) return null;
                  const isActive = activeConstellation === c.id || activeConstellation === targetId;
                  return (
                    <line
                      key={`${c.id}-${targetId}`}
                      x1={c.x}
                      y1={c.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isActive ? COLORS[c.id % COLORS.length] : '#8892a8'}
                      strokeWidth={isActive ? '0.3' : '0.1'}
                      opacity={isActive ? 0.8 : 0.3}
                      className="transition-all duration-300"
                    />
                  );
                })
              )}
              {/* 绘制星座节点 */}
              {constellations.map((c, index) => {
                const Icon = icons[index % icons.length];
                const isActive = activeConstellation === c.id;
                const color = COLORS[index % COLORS.length];
                return (
                  <g
                    key={c.id}
                    onClick={() => setActiveConstellation(isActive ? null : c.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={isActive ? '4' : '3'}
                      fill={color}
                      opacity={isActive ? 1 : 0.8}
                      className="transition-all duration-300"
                    >
                      <animate
                        attributeName="r"
                        values={isActive ? '4;5;4' : '3;3.5;3'}
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={isActive ? '8' : '6'}
                      fill={color}
                      opacity={isActive ? 0.3 : 0.15}
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}
            </svg>

            {/* 星座详情弹窗 */}
            {activeConstellation !== null && (
              <div className="absolute bottom-4 left-4 right-4 glass-effect rounded-lg p-4 animate-slide-up">
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const c = constellations.find(cc => cc.id === activeConstellation);
                    if (!c) return null;
                    const Icon = icons[c.id % icons.length];
                    const color = COLORS[c.id % COLORS.length];
                    return (
                      <>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: color, filter: `drop-shadow(0 0 10px ${color})` }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-silver-gray">
                          星座 #{c.id + 1}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <p className="text-light-gray text-sm">
                  {constellations.find(c => c.id === activeConstellation)?.message}
                </p>
              </div>
            )}

            {/* 提示 */}
            <div className="absolute top-4 left-4 text-xs text-silver-gray/60">
              点击星座节点查看祝福
            </div>
          </div>

          {/* 滚动祝福消息 */}
          <div className="neon-box rounded-xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="w-5 h-5 text-neon-blue" />
              <span className="text-light-gray font-medium">循环祝福流</span>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-hidden">
              {visibleMessages.map((msg, index) => (
                <div
                  key={`${msg}-${index}-${Date.now()}`}
                  className="glass-effect rounded-lg p-4 flex items-start gap-3 animate-slide-up"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    borderLeft: `3px solid ${COLORS[index % COLORS.length]}`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${COLORS[index % COLORS.length]}30`,
                      filter: `drop-shadow(0 0 8px ${COLORS[index % COLORS.length]})`,
                    }}
                  >
                    {(() => {
                      const Icon = icons[index % icons.length];
                      return <Icon className="w-4 h-4" style={{ color: COLORS[index % COLORS.length] }} />;
                    })()}
                  </div>
                  <p className="text-sm text-light-gray leading-relaxed">{msg}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-silver-gray/10">
              <div className="flex items-center justify-between text-xs text-silver-gray/60">
                <span>共 {AUTO_WISH_MESSAGES.length} 条祝福循环播放</span>
                <div className="flex items-center gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{
                        backgroundColor: COLORS[i % COLORS.length],
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部星座祝福 */}
        <div className="mt-16 text-center">
          <div className="neon-box rounded-xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: 0.3 + Math.random() * 0.4,
                  }}
                >
                  <Star
                    className="w-2 h-2 animate-pulse"
                    style={{
                      color: COLORS[i % COLORS.length],
                      filter: `drop-shadow(0 0 5px ${COLORS[i % COLORS.length]})`,
                      animationDelay: `${Math.random() * 2}s`,
                    }}
                  />
                </div>
              ))}
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 font-display relative z-10">
              愿星光为你点亮每一个夜晚
            </h3>
            <p className="text-silver-gray relative z-10">
              愿你在浩瀚的星海中，找到属于自己的那颗最亮的星
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConstellationMessage;
