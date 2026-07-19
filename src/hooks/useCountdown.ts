import { useState, useEffect, useCallback } from 'react';
import { BIRTHDAY_DATE } from '../utils/constants';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isBirthday: boolean;
}

export const useCountdown = () => {
  const [countdown, setCountdown] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isBirthday: false,
  });

  const calculateCountdown = useCallback(() => {
    const now = new Date();
    const targetDate = new Date(BIRTHDAY_DATE);
    targetDate.setHours(0, 0, 0, 0);

    const currentYear = now.getFullYear();
    let birthdayThisYear = new Date(targetDate);
    birthdayThisYear.setFullYear(currentYear);

    if (now > birthdayThisYear) {
      birthdayThisYear.setFullYear(currentYear + 1);
    }

    const diff = birthdayThisYear.getTime() - now.getTime();

    if (diff <= 0) {
      setCountdown({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isBirthday: true,
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
    });
  }, []);

  useEffect(() => {
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [calculateCountdown]);

  return countdown;
};
