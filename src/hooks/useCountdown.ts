import { useState, useEffect, useCallback } from 'react';
import { BIRTHDAY_MONTH, BIRTHDAY_DAY } from '../utils/constants';

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
    const currentYear = now.getFullYear();
    
    let birthdayThisYear = new Date(currentYear, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY);
    birthdayThisYear.setHours(0, 0, 0, 0);

    let targetYear = currentYear;
    if (now.getTime() > birthdayThisYear.getTime()) {
      targetYear = currentYear + 1;
      birthdayThisYear = new Date(targetYear, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY);
      birthdayThisYear.setHours(0, 0, 0, 0);
    }

    const diff = birthdayThisYear.getTime() - now.getTime();

    if (diff <= 0 && diff > -86400000) {
      setCountdown({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isBirthday: true,
        currentYear: targetYear,
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
      currentYear: targetYear,
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
  const currentYear = now.getFullYear();
  let targetYear = currentYear;
  
  const birthdayThisYear = new Date(currentYear, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY);
  if (now.getTime() > birthdayThisYear.getTime()) {
    targetYear = currentYear + 1;
  }
  
  return {
    solarYear: targetYear,
    solarMonth: BIRTHDAY_MONTH,
    solarDay: BIRTHDAY_DAY,
  };
};
