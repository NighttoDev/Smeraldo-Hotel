<script lang="ts">
  /**
   * Push Subscription Manager Component (Story 7.4)
   * Manages Web Push API subscriptions for the current user
   * Handles browser compatibility checks and graceful degradation
   */

  import { onMount } from 'svelte';
  import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';

  let supported = $state(false);
  let subscribed = $state(false);
  let loading = $state(false);
  let permissionDenied = $state(false);

  /**
   * Convert base64url VAPID public key to Uint8Array for subscription
   */
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  /**
   * Check if Push API is supported and if user is already subscribed
   */
  async function checkSupport(): Promise<void> {
    // Check browser support for Notification API and Service Worker
    supported = 'Notification' in window && 'serviceWorker' in navigator;

    if (!supported) {
      console.info('Push notifications not supported on this browser');
      return;
    }

    // Check if notification permission was previously denied
    if (Notification.permission === 'denied') {
      permissionDenied = true;
      return;
    }

    // Check if user already has an active subscription
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      subscribed = subscription !== null;
    } catch (err) {
      console.error('Failed to check subscription status:', err);
    }
  }

  /**
   * Subscribe to push notifications
   * 1. Request notification permission
   * 2. Create push subscription with VAPID key
   * 3. Save subscription to database
   */
  async function subscribe(): Promise<void> {
    loading = true;

    try {
      // Step 1: Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        permissionDenied = true;
        loading = false;
        return;
      }

      // Step 2: Get Service Worker registration and subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_PUBLIC_KEY);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource
      });

      // Step 3: Save subscription to database
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Subscription keys missing');
      }

      // Convert keys to base64 for storage
      const p256dhBase64 = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
      const authBase64 = btoa(String.fromCharCode(...new Uint8Array(authKey)));

      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: p256dhBase64,
            auth: authBase64
          }
        })
      });

      if (response.ok) {
        subscribed = true;
        console.info('Push subscription saved successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to save subscription:', errorText);
        // TODO: Replace with toast notification component
      }
    } catch (err) {
      console.error('Push subscription failed:', err);
      // TODO: Replace with toast notification component
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    checkSupport();
  });
</script>

{#if supported && !subscribed && !permissionDenied}
  <div class="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700 z-50">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Nhận thông báo
        </h3>
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Bật thông báo để nhận cảnh báo về phòng trống và tồn kho thấp ngay cả khi không mở ứng dụng
        </p>
        <div class="flex gap-2">
          <button
            onclick={subscribe}
            disabled={loading}
            class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded transition-colors"
          >
            {loading ? 'Đang bật...' : 'Bật thông báo'}
          </button>
          <button
            onclick={() => (supported = false)}
            class="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  </div>
{:else if permissionDenied}
  <div class="fixed bottom-4 right-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 max-w-sm z-50">
    <p class="text-xs text-yellow-800 dark:text-yellow-200">
      Thông báo đã bị chặn. Vui lòng bật thông báo trong cài đặt trình duyệt.
    </p>
  </div>
{/if}
