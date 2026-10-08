/**
 * ألوان ومنهج التصميم لمنصة طلاب الذكاء الاصطناعي.
 * تم توحيد مفاتيح الألوان الفاتح/الداكن لأن ThemeColor يعتمد على تقاطع المفاتيح.
 */
import '@/global.css';

import { Platform } from 'react-native';

const palette = {
  primary: '#0F766E',
  primarySoft: '#CCFBF1',
  text: '#0B1220',
  background: '#F6F8FA',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#E7EEF3',
  textSecondary: '#5B6B7C',
  border: '#DDE5EC',
  card: '#FFFFFF',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  map: '#0EA5E9',
};

const dark: typeof palette = {
  primary: '#2DD4BF',
  primarySoft: '#134E4A',
  text: '#E8EDF2',
  background: '#0B1220',
  backgroundElement: '#141E2E',
  backgroundSelected: '#1E2B3D',
  textSecondary: '#93A3B4',
  border: '#243345',
  card: '#141E2E',
  success: '#4ADE80',
  successSoft: '#14351F',
  warn: '#FBBF24',
  warnSoft: '#3A2A08',
  danger: '#F87171',
  dangerSoft: '#3B1414',
  info: '#93C5FD',
  infoSoft: '#17263F',
  map: '#38BDF8',
};

export const Colors = { light: palette, dark } as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = { half: 2, one: 4, two: 8, three: 12, four: 16, five: 24, six: 32 } as const;

export const Radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 72 }) ?? 0;
export const MaxContentWidth = 720;

export const STATUS_LABELS = {
  todo: 'لم تُسجَّل',
  in_progress: 'مسجَّلة الآن',
  done: 'منجزة',
  failed: 'معدولة/راسب',
  deferred: 'مؤجَّلة',
  withdrawn: 'منسحب',
} as const;

export const STATUS_TONE = {
  todo: 'neutral',
  in_progress: 'info',
  done: 'success',
  failed: 'danger',
  deferred: 'warn',
  withdrawn: 'warn',
} as const;

export type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';
