/**
 * Custom Service Worker with Push Notification Support (Story 7.4)
 * Handles offline caching via Workbox and Web Push API events
 */

/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

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

// Fetch event — serve from cache, fallback to network
sw.addEventListener('fetch', (event: FetchEvent) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

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
    let badge = '/icons/favicon.png';

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
