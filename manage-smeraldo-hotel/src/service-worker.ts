/**
 * Custom Service Worker with Push Notification Support (Story 7.4)
 * Handles offline caching via Workbox and Web Push API events
 */

/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

type OfflineAction = 'room_override_status' | 'attendance_log' | 'inventory_stock_in' | 'inventory_stock_out';

type OfflineQueueItem = {
	id: string;
	action: OfflineAction;
	payload: Record<string, unknown>;
	timestamp: string;
	retries: number;
};

const OFFLINE_QUEUE_DB_NAME = 'smeraldo-offline-queue';
const OFFLINE_QUEUE_DB_VERSION = 1;
const OFFLINE_QUEUE_STORE_NAME = 'queue_items';

import { build, files, version } from '$service-worker';

// Create a unique cache name for this version
const CACHE = `cache-${version}`;

// Assets to cache on install
const ASSETS = [
  ...build, // _app/immutable/* files
  ...files  // static files from /static
];

// Install event — cache all static assets
sw.addEventListener('install', (event: ExtendableEvent) => {
  async function addFilesToCache(): Promise<void> {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
});

// Activate event — clean up old caches
sw.addEventListener('activate', (event: ExtendableEvent) => {
  async function deleteOldCaches(): Promise<void> {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
    );
  }

  event.waitUntil(deleteOldCaches());
});

function openOfflineQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE_DB_NAME, OFFLINE_QUEUE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE_NAME)) {
        const store = db.createObjectStore(OFFLINE_QUEUE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open offline queue DB'));
  });
}

function idbRequestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function generateOfflineQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function enqueueOfflineRequest(action: OfflineAction, payload: Record<string, unknown>): Promise<void> {
  const db = await openOfflineQueueDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_QUEUE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OFFLINE_QUEUE_STORE_NAME);
      const item: OfflineQueueItem = {
        id: generateOfflineQueueId(),
        action,
        payload,
        timestamp: new Date().toISOString(),
        retries: 0
      };
      void idbRequestToPromise(store.put(item)).catch(reject);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  } finally {
    db.close();
  }
}

function isOfflineQueueTarget(url: URL, method: string): boolean {
  if (method !== 'POST') return false;
  return (
    url.pathname.includes('/rooms') && url.searchParams.has('/overrideStatus') ||
    url.pathname.includes('/attendance') && url.searchParams.has('/logAttendance') ||
    url.pathname.includes('/inventory') && (url.searchParams.has('/stockIn') || url.searchParams.has('/stockOut'))
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidShiftValue(value: number): value is 0 | 0.5 | 1 | 1.5 {
  return value === 0 || value === 0.5 || value === 1 || value === 1.5;
}

function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function parseOptionalNotes(value: FormDataEntryValue | null): string | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, 500);
}

async function tryQueueOfflineWrite(event: FetchEvent): Promise<Response | null> {
  const request = event.request;
  if (request.method !== 'POST') return null;

  const url = new URL(request.url);
  if (url.origin !== sw.location.origin || !isOfflineQueueTarget(url, request.method)) {
    return null;
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
      return null;
    }

    const formData = await request.clone().formData();

    if (url.searchParams.has('/overrideStatus')) {
      const roomId = String(formData.get('room_id') ?? '');
      const newStatus = String(formData.get('new_status') ?? '');
      if (!isUuid(roomId)) return null;
      if (!['available', 'occupied', 'checking_out_today', 'being_cleaned', 'ready'].includes(newStatus)) return null;
      await enqueueOfflineRequest('room_override_status', { room_id: roomId, new_status: newStatus });
      return new Response(JSON.stringify({ data: { queued: true }, error: null }), {
        status: 202,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.searchParams.has('/logAttendance')) {
      const staffId = String(formData.get('staff_id') ?? '');
      const logDate = String(formData.get('log_date') ?? '');
      const shiftValue = Number(formData.get('shift_value') ?? Number.NaN);
      if (!isUuid(staffId) || !isValidDateString(logDate) || !isValidShiftValue(shiftValue)) return null;
      await enqueueOfflineRequest('attendance_log', {
        staff_id: staffId,
        log_date: logDate,
        shift_value: shiftValue
      });
      return new Response(JSON.stringify({ data: { queued: true }, error: null }), {
        status: 202,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.searchParams.has('/stockIn')) {
      const itemId = String(formData.get('item_id') ?? '');
      const quantity = Number(formData.get('quantity') ?? Number.NaN);
      const notes = parseOptionalNotes(formData.get('notes'));
      if (!isUuid(itemId) || !isPositiveInt(quantity)) return null;
      await enqueueOfflineRequest('inventory_stock_in', {
        item_id: itemId,
        quantity,
        notes
      });
      return new Response(JSON.stringify({ data: { queued: true }, error: null }), {
        status: 202,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.searchParams.has('/stockOut')) {
      const itemId = String(formData.get('item_id') ?? '');
      const quantity = Number(formData.get('quantity') ?? Number.NaN);
      const recipientName = String(formData.get('recipient_name') ?? '').trim();
      const notes = parseOptionalNotes(formData.get('notes'));
      if (!isUuid(itemId) || !isPositiveInt(quantity) || recipientName.length === 0) return null;
      await enqueueOfflineRequest('inventory_stock_out', {
        item_id: itemId,
        quantity,
        recipient_name: recipientName.slice(0, 100),
        notes
      });
      return new Response(JSON.stringify({ data: { queued: true }, error: null }), {
        status: 202,
        headers: { 'content-type': 'application/json' }
      });
    }
  } catch {
    return null;
  }

  return null;
}

// Fetch event — serve from cache, fallback to network
sw.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method === 'POST') {
    event.respondWith((async () => {
      try {
        return await fetch(event.request);
      } catch {
        const queuedResponse = await tryQueueOfflineWrite(event);
        if (queuedResponse) return queuedResponse;
        return new Response(JSON.stringify({ data: null, error: { message: 'Offline', code: 'OFFLINE' } }), {
          status: 503,
          headers: { 'content-type': 'application/json' }
        });
      }
    })());
    return;
  }

  async function respond(): Promise<Response> {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // Try cache first for static assets
    if (ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;
    }

    // For other requests, try network first
    try {
      const response = await fetch(event.request);

      // Cache successful GET responses (except API calls)
      if (response.status === 200 && !url.pathname.startsWith('/api/')) {
        cache.put(event.request, response.clone());
      }

      return response;
    } catch {
      // Network failed, try cache
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;

      // Return generic offline page if available
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
  }

  event.respondWith(respond());
});

/**
 * Push event — display notification when push is received
 * Payload format: { title: string, body: string, data?: object }
 */
sw.addEventListener('push', (event: PushEvent) => {
  if (!event.data) {
    console.warn('Push event received with no data');
    return;
  }

  try {
    const payload = event.data.json() as {
      title: string;
      body: string;
      data?: {
        type?: string;
        roomNumber?: string;
        itemName?: string;
        currentStock?: number;
        [key: string]: unknown;
      };
    };

    const { title, body, data } = payload;

    // Determine icon and badge based on notification type
    let icon = '/icons/icon-192.png';
    const badge = '/icons/favicon.png';

    if (data?.type === 'low-stock') {
      // Could add a specific icon for low-stock notifications
      icon = '/icons/icon-192.png';
    } else if (data?.type === 'room-ready') {
      // Could add a specific icon for room-ready notifications
      icon = '/icons/icon-192.png';
    }

    const notificationOptions: NotificationOptions = {
      body,
      icon,
      badge,
      vibrate: [200, 100, 200],
      data,
      tag: data?.type || 'general', // Prevent duplicate notifications of same type
      requireInteraction: false,
      silent: false
    };

    event.waitUntil(
      sw.registration.showNotification(title, notificationOptions)
    );
  } catch (err) {
    console.error('Failed to display push notification:', err);
  }
});

/**
 * Notification click event — focus app window when notification is clicked
 */
sw.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  // Determine target URL based on notification data
  let targetUrl = '/';

  const data = event.notification.data as {
    type?: string;
    roomNumber?: string;
    itemName?: string;
  } | undefined;

  if (data?.type === 'room-ready') {
    // Navigate to rooms page for reception
    targetUrl = '/reception/rooms';
  } else if (data?.type === 'low-stock') {
    // Navigate to inventory page for managers
    targetUrl = '/reception/inventory';
  }

  // Focus existing app window or open new one
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.startsWith(sw.registration.scope) && 'focus' in client) {
          return client.focus().then(() => {
            // Navigate to target URL if possible
            if ('navigate' in client) {
              return (client as WindowClient).navigate(targetUrl);
            }
            return client;
          });
        }
      }

      // No existing window, open new one
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(targetUrl);
      }
    })
  );
});
