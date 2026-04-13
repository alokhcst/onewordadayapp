/**
 * Daily word notification preferences (stored on user profile).
 * Default: one reminder per day at 9:00 local time.
 */

export type DailyWordFrequency = 'once_daily' | 'twice_daily';

export type DailyWordNotificationPrefs = {
  enabled: boolean;
  /** How many local reminders per day (same calendar word). */
  frequency: DailyWordFrequency;
  /** Primary reminder, 24h "HH:mm". */
  primaryTime: string;
  /** Second reminder when frequency is twice_daily. */
  secondaryTime: string;
  channels: string[];
  timezone: string;
  /** Legacy field; kept in sync with primaryTime for older data. */
  time?: string;
};

const DEFAULT_PRIMARY = '09:00';
const DEFAULT_SECONDARY = '18:00';

export function defaultDailyWordPrefs(): DailyWordNotificationPrefs {
  return {
    enabled: true,
    frequency: 'once_daily',
    primaryTime: DEFAULT_PRIMARY,
    secondaryTime: DEFAULT_SECONDARY,
    channels: ['local'],
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
    time: DEFAULT_PRIMARY,
  };
}

export function parseTimeToParts(time: string): { hour: number; minute: number } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((time || '').trim());
  if (!m) return null;
  return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
}

export function normalizeDailyWordPrefs(raw: Record<string, unknown> | undefined | null): DailyWordNotificationPrefs {
  const base = defaultDailyWordPrefs();
  if (!raw || typeof raw !== 'object') return base;

  const enabled = raw.enabled !== false;
  const freq = raw.frequency === 'twice_daily' ? 'twice_daily' : 'once_daily';
  const primary =
    (typeof raw.primaryTime === 'string' && parseTimeToParts(raw.primaryTime) && raw.primaryTime) ||
    (typeof raw.time === 'string' && parseTimeToParts(raw.time) && raw.time) ||
    base.primaryTime;
  const secondary =
    (typeof raw.secondaryTime === 'string' && parseTimeToParts(raw.secondaryTime) && raw.secondaryTime) ||
    base.secondaryTime;
  const channels = Array.isArray(raw.channels) ? (raw.channels as string[]) : base.channels;
  const timezone = typeof raw.timezone === 'string' ? raw.timezone : base.timezone;

  return {
    enabled,
    frequency: freq,
    primaryTime: primary,
    secondaryTime: secondary,
    channels,
    timezone,
    time: primary,
  };
}

export function toStoredDailyWordPrefs(p: DailyWordNotificationPrefs): Record<string, unknown> {
  return {
    enabled: p.enabled,
    frequency: p.frequency,
    primaryTime: p.primaryTime,
    secondaryTime: p.secondaryTime,
    channels: p.channels,
    timezone: p.timezone,
    time: p.primaryTime,
  };
}
