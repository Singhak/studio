
import type { Club, Service } from './types';

const CLUB_CACHE_PREFIX = 'courtly_club_cache_';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS; // Fallback TTL if notifications are enabled

export interface ClubCacheEntry {
  clubData: Club | null;
  servicesData: Service[] | null;
  timestamp: number; // Timestamp for when this entry was last saved/updated
}

function getClubCacheKey(clubId: string): string {
  return `${CLUB_CACHE_PREFIX}${clubId}`;
}

export function getCachedClubEntry(clubId: string): ClubCacheEntry | null {
  if (typeof window === 'undefined') return null;
  const key = getClubCacheKey(clubId);
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item) as ClubCacheEntry;
  } catch (e) {
    console.error(`Error parsing club cache for ${clubId}:`, e);
    localStorage.removeItem(key); // Clear corrupted cache
    return null;
  }
}

export function setCachedClubEntry(clubId: string, data: Partial<ClubCacheEntry>): void {
  if (typeof window === 'undefined') return;
  const key = getClubCacheKey(clubId);
  const existingEntry = getCachedClubEntry(clubId);

  const entryToSave: ClubCacheEntry = {
    clubData: data.clubData !== undefined ? data.clubData : (existingEntry?.clubData || null),
    servicesData: data.servicesData !== undefined ? data.servicesData : (existingEntry?.servicesData || null),
    timestamp: Date.now(), // Always update timestamp when new data is set or existing data is confirmed fresh
  };
  localStorage.setItem(key, JSON.stringify(entryToSave));
}

export function isCacheEntryValid(
  cachedEntry: ClubCacheEntry | null,
): boolean {
  if (!cachedEntry) return false;

  const notificationPermissionGranted =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted';

  const maxAge = notificationPermissionGranted ? SEVEN_DAYS_MS : ONE_DAY_MS;

  if ((Date.now() - cachedEntry.timestamp) < maxAge) {
    return true;
  }
  // If notifications are granted, we rely on FCM primarily.
  // But if maxAge (e.g. 7 days) is hit, we still consider it stale as a fallback.
  return false;
}

export function clearClubCache(clubId: string): void {
  if (typeof window === 'undefined') return;
  const key = getClubCacheKey(clubId);
  localStorage.removeItem(key);
  console.log(`[CACHE] Cleared cache for club ${clubId}`);
}
