/**
 * JalDrishti India — Offline Storage & Background Sync Manager
 * Caches distress calls and road hazard reports in localStorage when network is down.
 * Automatically synchronizes with the backend once internet connection is restored.
 */
import { submitRescueRequest, submitReport } from './api';

const RESCUE_QUEUE_KEY = 'jaldrishti_offline_rescue_queue';
const REPORT_QUEUE_KEY = 'jaldrishti_offline_report_queue';

export interface QueuedRescue {
  id: string;
  data: {
    contact_name: string;
    phone: string;
    lat: number;
    lon: number;
    address_landmark: string;
    people_count?: number;
    has_infants_or_elderly?: boolean;
    medical_emergency_notes?: string;
    water_level_stage?: string;
  };
  timestamp: number;
}

export interface QueuedReport {
  id: string;
  category: string;
  description: string;
  lat: number;
  lon: number;
  road_blocked: boolean;
  water_depth_cm?: number;
  timestamp: number;
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function getQueuedRescues(): QueuedRescue[] {
  try {
    const raw = localStorage.getItem(RESCUE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline rescue queue', e);
    return [];
  }
}

export function queueRescueRequest(data: QueuedRescue['data']): QueuedRescue {
  const queue = getQueuedRescues();
  const item: QueuedRescue = {
    id: `offline_rescue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    data,
    timestamp: Date.now(),
  };
  queue.push(item);
  localStorage.setItem(RESCUE_QUEUE_KEY, JSON.stringify(queue));
  return item;
}

export function getQueuedReports(): QueuedReport[] {
  try {
    const raw = localStorage.getItem(REPORT_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline report queue', e);
    return [];
  }
}

export function queueReport(data: Omit<QueuedReport, 'id' | 'timestamp'>): QueuedReport {
  const queue = getQueuedReports();
  const item: QueuedReport = {
    id: `offline_report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...data,
    timestamp: Date.now(),
  };
  queue.push(item);
  localStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(queue));
  return item;
}

export async function syncOfflineData(): Promise<{ syncedRescues: number; syncedReports: number }> {
  if (!isOnline()) {
    return { syncedRescues: 0, syncedReports: 0 };
  }

  let syncedRescues = 0;
  let syncedReports = 0;

  // 1. Sync rescues
  const rescues = getQueuedRescues();
  const remainingRescues: QueuedRescue[] = [];
  for (const item of rescues) {
    try {
      await submitRescueRequest(item.data);
      syncedRescues++;
    } catch (e) {
      console.error('Failed to sync rescue item', item, e);
      remainingRescues.push(item);
    }
  }
  localStorage.setItem(RESCUE_QUEUE_KEY, JSON.stringify(remainingRescues));

  // 2. Sync reports
  const reports = getQueuedReports();
  const remainingReports: QueuedReport[] = [];
  for (const item of reports) {
    try {
      const formData = new FormData();
      formData.append('category', item.category);
      formData.append('description', item.description);
      formData.append('lat', item.lat.toString());
      formData.append('lon', item.lon.toString());
      formData.append('road_blocked', item.road_blocked.toString());
      if (item.water_depth_cm !== undefined) {
        formData.append('water_depth_cm', item.water_depth_cm.toString());
      }
      await submitReport(formData);
      syncedReports++;
    } catch (e) {
      console.error('Failed to sync report item', item, e);
      remainingReports.push(item);
    }
  }
  localStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(remainingReports));

  return { syncedRescues, syncedReports };
}

export function getTotalQueuedCount(): number {
  return getQueuedRescues().length + getQueuedReports().length;
}
