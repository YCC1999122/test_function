import { useState, useEffect, useCallback } from 'react';
import { LUNAR_BIRTHDAY_MONTH, LUNAR_BIRTHDAY_DAY } from '../utils/constants';
import { getNextBirthday, formatLunarDate, lunarToSolar } from '../utils/lunar';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isBirthday: boolean;
  currentYear: number;
}

export const useCountdown = () => {
  const [countdown, setCountdown] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isBirthday: false,
    currentYear: new Date().getFullYear(),
  });

  const calculateCountdown = useCallback(() => {
    const now = new Date();
    const nextBirthday = getNextBirthday(LUNAR_BIRTHDAY_MONTH, LUNAR_BIRTHDAY_DAY);
    
    nextBirthday.setHours(0, 0, 0, 0);

    const diff = nextBirthday.getTime() - now.getTime();

    if (diff <= 0 && diff > -86400000) {
      setCountdown({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isBirthday: true,
        currentYear: nextBirthday.getFullYear(),
      });
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setCountdown({
      days,
      hours,
      minutes,
      seconds,
      isBirthday: false,
      currentYear: nextBirthday.getFullYear(),
    });
  }, []);

  useEffect(() => {
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [calculateCountdown]);

  return countdown;
};

export const getBirthdayInfo = () => {
  const now = new Date();
  const nextBirthday = getNextBirthday(LUNAR_BIRTHDAY_MONTH, LUNAR_BIRTHDAY_DAY);
  const birthdayYear = nextBirthday.getFullYear();
  const solarDate = lunarToSolar(birthdayYear, LUNAR_BIRTHDAY_MONTH, LUNAR_BIRTHDAY_DAY);
  
  return {
    solarYear: solarDate.getFullYear(),
    solarMonth: solarDate.getMonth() + 1,
    solarDay: solarDate.getDate(),
    lunarYear: birthdayYear,
    lunarMonth: LUNAR_BIRTHDAY_MONTH,
    lunarDay: LUNAR_BIRTHDAY_DAY,
    formattedLunar: formatLunarDate(birthdayYear, LUNAR_BIRTHDAY_MONTH, LUNAR_BIRTHDAY_DAY),
  };
};
