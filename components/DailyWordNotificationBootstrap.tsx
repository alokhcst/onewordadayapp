import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  attachDailyWordPrefetchListeners,
  configureDailyWordNotificationHandler,
  syncDailyWordLocalSchedules,
} from '@/lib/dailyWordNotifications';
import { useEffect } from 'react';

/**
 * Registers notification behavior, prefetches today's word when a daily alarm fires,
 * and reapplies local schedules after login (uses profile from API).
 */
export function DailyWordNotificationBootstrap() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    configureDailyWordNotificationHandler();
    return attachDailyWordPrefetchListeners();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getUserProfile();
        if (!cancelled && data.profile) {
          await syncDailyWordLocalSchedules(data.profile);
        }
      } catch {
        /* offline / guest */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  return null;
}
