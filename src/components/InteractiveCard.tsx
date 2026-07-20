import { useState } from 'react';
import { Gift, Sparkles, Heart, ArrowRight, Star, Rocket, Zap, Rainbow } from 'lucide-react';
import { EMOJIS } from '../utils/constants';

interface CardItem {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  gradient: string;
  bgGradient: string;
}

const cardItems: CardItem[] = [
  {
    id: 1,
    icon: <Gift className="w-8 h-8" />,
    title: '美好祝福',
    description: '愿所有美好如期而至',
    color: '#9d4edd',
    gradient: 'from-neon-purple to-pink-500',
    bgGradient: 'from-neon-purple/20 to-pink-500/20',
  },
  {
    id: 2,
    icon: <Sparkles className="w-8 h-8" />,
    title: '闪耀时刻',
    description: '愿你的每一天都闪闪发光',
    color: '#00d4ff',
    gradient: 'from-neon-blue to-cyan-400',
    bgGradient: 'from-neon-blue/20 to-cyan-400/20',
  },
  {
    id: 3,
    icon: <Heart className="w-8 h-8" />,
    title: '爱与关怀',
    description: '被爱包围，幸福满满',
    color: '#ff6b9d',
    gradient: 'from-pink-500 to-rose-400',
    bgGradient: 'from-pink-500/20 to-rose-400/20',
  },
  {
    id: 4,
    icon: <Star className="w-8 h-8" />,
    title: '星光璀璨',
    description: '愿星辰照亮你的前路',
    color: '#facc15',
    gradient: 'from-yellow-400 to-amber-500',
    bgGradient: 'from-yellow-400/20 to-amber-500/20',
  },
  {
    id: 5,
    icon: <Rocket className="w-8 h-8" />,
    title: '梦想启航',
    description: '愿梦想照进现实',
    color: '#22d3ee',
    gradient: 'from-cyan-400 to-neon-blue',
    bgGradient: 'from-cyan-400/20 to-neon-blue/20',
  },
  {
    id: 6,
    icon: <Zap className="w-8 h-8" />,
    title: '活力无限',
    description: '愿你永远充满能量',
    color: '#a855f7',
    gradient: 'from-purple-500 to-violet-500',
    bgGradient: 'from-purple-500/20 to-violet-500/20',
  },
];

const InteractiveCard = () => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = (id: number) => {
    if (selectedCard === id) {
      setIsFlipped(!isFlipped);
    } else {
      setSelectedCard(id);
      setIsFlipped(false);
      setTimeout(() => setIsFlipped(true), 100);
    }
  };

  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Rainbow className="w-8 h-8 text-neon-blue" />
            <h2 className="text-2xl md:text-3xl font-bold text-white font-display">
              惊喜卡片
            </h2>
            <Rainbow className="w-8 h-8 text-neon-purple" />
          </div>
          <p className="text-silver-gray">点击卡片解锁专属祝福</p>
          <div className="w-20 h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-pink-500 mx-auto rounded-full mt-4" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardItems.map((card) => (
            <div
              key={card.id}
              className="relative perspective-1000 cursor-pointer group"
              onClick={() => handleCardClick(card.id)}
            >
              <div
                className="relative w-full h-72 transition-transform duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped && selectedCard === card.id ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  className="absolute inset-0 neon-box rounded-xl p-6 flex flex-col items-center justify-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform animate-pulse`}
                    style={{ animationDuration: '2s' }}
                  >
                    <span className="text-white">{card.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 font-display">{card.title}</h3>
                  <p className="text-silver-gray text-sm text-center">{card.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-neon-blue text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>点击查看</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: `${Math.random() * 3 + 1}px`,
                          height: `${Math.random() * 3 + 1}px`,
                          backgroundColor: card.color,
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          opacity: 0.3,
                          animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div
                  className="absolute inset-0 rounded-xl p-6 flex flex-col items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: `linear-gradient(135deg, ${card.bgGradient})`,
                    border: `1px solid ${card.color}`,
                    boxShadow: `0 0 40px ${card.color}40`,
                  }}
                >
                  <Sparkles className="w-12 h-12 mb-4" style={{ color: card.color }} />
                  <h4 className="text-xl font-bold text-white mb-3 font-display">特别祝福</h4>
                  <p className="text-light-gray text-center leading-relaxed">
                    {card.id === 1 && '愿你拥有所有想要的美好，每一天都充满惊喜！'}
                    {card.id === 2 && '愿你像星星一样闪耀，照亮自己也温暖他人！'}
                    {card.id === 3 && '愿爱与幸福永远围绕着你，每一天都快乐！'}
                    {card.id === 4 && '愿星光指引你前行，每一步都充满希望！'}
                    {card.id === 5 && '愿你的梦想展翅高飞，飞向更远的天空！'}
                    {card.id === 6 && '愿你永远活力满满，拥抱每一个精彩瞬间！'}
                  </p>
                  <div className="mt-6 flex gap-2">
                    {EMOJIS.slice(0, 4).map((emoji, index) => (
                      <span
                        key={index}
                        className="text-xl animate-bounce"
                        style={{ animationDelay: `${index * 0.2}s` }}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 neon-box rounded-xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${Math.random() * 6 + 2}px`,
                  height: `${Math.random() * 6 + 2}px`,
                  backgroundColor: ['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15', '#22d3ee'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${4 + Math.random() * 3}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 3}s`,
                  opacity: 0.3,
                }}
              />
            ))}
          </div>

          <h3 className="text-xl font-semibold text-white mb-4 font-display">点击卡片，发现惊喜</h3>
          <p className="text-silver-gray">每一张卡片都藏着特别的祝福</p>
          
          <div className="flex justify-center gap-2 mt-6">
            {['生', '日', '快', '乐'].map((char, index) => (
              <span
                key={index}
                className="text-5xl md:text-6xl font-bold font-display animate-float"
                style={{
                  animationDelay: `${index * 0.3}s`,
                  background: `linear-gradient(135deg, ${['#00d4ff', '#9d4edd', '#ff6b9d', '#facc15'][index]} 0%, ${['#9d4edd', '#ff6b9d', '#facc15', '#00d4ff'][index]} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveCard;
