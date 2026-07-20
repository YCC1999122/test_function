import { useEffect, useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { LUNAR_DATE } from '../utils/constants';

interface CountdownCardProps {
  value: number;
  label: string;
  delay: number;
}

const CountdownCard = ({ value, label, delay }: CountdownCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div 
      className="flex flex-col items-center neon-box rounded-lg p-4 hover-lift min-w-[80px]"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="text-4xl font-bold text-neon-blue neon-text countdown-number font-display">
        {displayValue.toString().padStart(2, '0')}
      </span>
      <span className="text-xs text-silver-gray mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

const Countdown = () => {
  const { days, hours, minutes, seconds, isBirthday } = useCountdown();

  if (isBirthday) {
    return (
      <div className="flex flex-col items-center animate-fade-in">
        <div className="text-neon-blue text-2xl font-semibold neon-text animate-pulse font-display">
          🎉 今天就是生日啦！ 🎉
        </div>
        <div className="text-light-gray mt-2">
          {LUNAR_DATE}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-silver-gray text-sm mb-4">
        生日：2026年8月3日 {LUNAR_DATE}
      </div>
      <div className="flex flex-wrap justify-center gap-4 md:gap-6">
        <CountdownCard value={days} label="天" delay={0.2} />
        <CountdownCard value={hours} label="时" delay={0.4} />
        <CountdownCard value={minutes} label="分" delay={0.6} />
        <CountdownCard value={seconds} label="秒" delay={0.8} />
      </div>
    </div>
  );
};

export default Countdown;
