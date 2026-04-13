import { api } from '@/lib/api';
import {
  DailyWordNotificationPrefs,
  normalizeDailyWordPrefs,
  parseTimeToParts,
} from '@/lib/notificationPreferences';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'daily-word-local';
export const DAILY_WORD_NOTIFICATION_IDS = ['daily-word-primary', 'daily-word-secondary'] as const;

let handlerConfigured = false;

/**
 * Show in-app banner / system notification when a daily-word local notification fires.
 */
export function configureDailyWordNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily word',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#4A90E2',
  });
}

export async function cancelDailyWordSchedules(): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const id of DAILY_WORD_NOTIFICATION_IDS) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* ignore */
    }
  }
}

async function scheduleOne(id: string, hour: number, minute: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'Your word of the day',
      body: 'Open the app to see today’s vocabulary word.',
      data: { url: '/(tabs)/' },
      sound: true,
      ...(Platform.OS === 'android' ? { android: { channelId: ANDROID_CHANNEL_ID } } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Request OS permission and apply local repeating schedules from profile prefs.
 */
export async function syncDailyWordLocalSchedules(profile: {
  notificationPreferences?: { dailyWord?: Record<string, unknown> | null };
} | null): Promise<void> {
  if (Platform.OS === 'web') return;

  configureDailyWordNotificationHandler();
  await ensureAndroidChannel();
  await cancelDailyWordSchedules();

  const daily = normalizeDailyWordPrefs(
    profile?.notificationPreferences?.dailyWord as Record<string, unknown> | undefined
  );
  if (!daily.enabled) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== 'granted') return;
  }

  const p1 = parseTimeToParts(daily.primaryTime);
  if (!p1) return;
  await scheduleOne(DAILY_WORD_NOTIFICATION_IDS[0], p1.hour, p1.minute);

  if (daily.frequency === 'twice_daily') {
    const p2 = parseTimeToParts(daily.secondaryTime);
    if (p2) {
      await scheduleOne(DAILY_WORD_NOTIFICATION_IDS[1], p2.hour, p2.minute);
    }
  }
}

/**
 * When a daily-word notification arrives, nudge the backend to ensure today's word exists (on-demand generation).
 */
export function attachDailyWordPrefetchListeners(): () => void {
  if (Platform.OS === 'web') return () => {};

  const subReceive = Notifications.addNotificationReceivedListener((notification) => {
    const id = notification.request.identifier;
    if (!DAILY_WORD_NOTIFICATION_IDS.includes(id as (typeof DAILY_WORD_NOTIFICATION_IDS)[number])) return;
    api.getTodaysWord().catch(() => {});
  });

  return () => {
    subReceive.remove();
  };
}
