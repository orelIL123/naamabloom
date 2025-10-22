export const COLORS = {
  bg: '#0A0A0A',
  headerBg: '#000000',
  card: '#2F6CF6',
  cardCanceled: 'rgba(156, 163, 175, 0.5)',
  cardDone: '#10B981',
  hourLine: 'rgba(255,255,255,0.12)',
  subHourLine: 'rgba(255,255,255,0.06)',
  glassBg: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.18)',
  glassActiveBg: 'rgba(255,255,255,0.15)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.9)',
  textMuted: 'rgba(255,255,255,0.7)',
  textDisabled: 'rgba(255,255,255,0.4)',
  accent: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  divider: 'rgba(255,255,255,0.1)',
};

export const DEFAULT_BARBER_COLORS = [
  '#2F6CF6', // Blue
  '#10B981', // Green  
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

export const getBarberColor = (barberId: string, index: number = 0): string => {
  return DEFAULT_BARBER_COLORS[index % DEFAULT_BARBER_COLORS.length];
};