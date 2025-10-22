import { addDays, differenceInMinutes, format, isSameDay, startOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { he } from 'date-fns/locale';

const TIMEZONE = 'Asia/Jerusalem';

export const toDayKey = (date: Date): string => {
  return format(toZonedTime(date, TIMEZONE), 'yyyy-MM-dd');
};

export const minutesFromDayStart = (date: Date): number => {
  const localDate = toZonedTime(date, TIMEZONE);
  const dayStart = startOfDay(localDate);
  return differenceInMinutes(localDate, dayStart);
};

export const todayLocal = (): Date => {
  return toZonedTime(new Date(), TIMEZONE);
};

export const range14Days = (start: Date = todayLocal()): { start: Date; end: Date } => {
  const localStart = toZonedTime(startOfDay(start), TIMEZONE);
  const localEnd = addDays(localStart, 14);
  return { 
    start: localStart, 
    end: localEnd 
  };
};

export const formatHebrewDate = (date: Date): string => {
  const localDate = toZonedTime(date, TIMEZONE);
  const dayName = format(localDate, 'EEEE', { locale: he });
  const dayMonth = format(localDate, 'd MMMM yyyy', { locale: he });
  return `${dayName} · ${dayMonth}`;
};

export const formatTime = (date: Date): string => {
  return formatInTimeZone(date, TIMEZONE, 'HH:mm');
};

export const parseTimeToDate = (timeStr: string, baseDate: Date): Date => {
  const localBase = toZonedTime(baseDate, TIMEZONE);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = startOfDay(localBase);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const isTodayLocal = (date: Date): boolean => {
  const today = todayLocal();
  const localDate = toZonedTime(date, TIMEZONE);
  return isSameDay(today, localDate);
};

export const getDayHours = (): string[] => {
  const hours = [];
  for (let i = 6; i <= 23; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
};

export const getTimeSlots = (): string[] => {
  const slots = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 23 && minute > 0) break; // Stop at 23:00
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

export const diffMinutes = (start: Date, end: Date): number => {
  return differenceInMinutes(end, start);
};