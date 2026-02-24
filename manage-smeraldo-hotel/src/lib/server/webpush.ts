/**
 * Web Push Notification Service (Story 7.4)
 * Server-side module for dispatching push notifications using W3C Web Push API with VAPID
 *
 * @module webpush
 */

import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '$env/static/private';

// Configure web-push library with VAPID keys
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to a specific staff member's subscribed devices
 * @param supabase - Supabase client instance (must have service role access for deleting expired subscriptions)
 * @param staffId - UUID of the staff member to notify
 * @param title - Notification title (max 100 chars recommended)
 * @param body - Notification body text (max 200 chars recommended)
 * @param data - Optional structured data (e.g., room_id, booking_id for click actions)
 * @throws Error if subscription query fails
 */
export async function sendPushNotification(
  supabase: SupabaseClient,
  staffId: string,
  title: string,
  body: string,
  data?: object
): Promise<void> {
  // Query all active subscriptions for this staff member
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh_key, auth_key')
    .eq('staff_id', staffId);

  if (error) throw new Error(`Failed to fetch subscriptions: ${error.message}`);

  // Send push to each subscription (parallel)
  const promises = (subscriptions ?? []).map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh_key,
        auth: sub.auth_key
      }
    };

    const payload = JSON.stringify({ title, body, data });

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (err: unknown) {
      // 410 Gone = subscription expired or invalid, delete from DB
      if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
        console.info(`Deleted expired subscription: ${sub.endpoint}`);
      } else {
        console.error(`Push notification failed for ${sub.endpoint}:`, err);
      }
    }
  });

  await Promise.all(promises);
}

/**
 * Notify all reception staff about an important event (e.g., room ready for check-in)
 * @param supabase - Supabase client instance
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional structured data
 */
export async function notifyReceptionStaff(
  supabase: SupabaseClient,
  title: string,
  body: string,
  data?: object
): Promise<void> {
  // Get all reception staff IDs
  const { data: receptionStaff, error } = await supabase
    .from('staff_members')
    .select('id')
    .eq('role', 'reception');

  if (error) throw new Error(`Failed to fetch reception staff: ${error.message}`);

  // Send notification to each reception staff member
  const promises = (receptionStaff ?? []).map((staff) =>
    sendPushNotification(supabase, staff.id, title, body, data)
  );

  await Promise.all(promises);
}

/**
 * Notify all managers about an important event (e.g., low stock alert)
 * @param supabase - Supabase client instance
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional structured data
 */
export async function notifyManagers(
  supabase: SupabaseClient,
  title: string,
  body: string,
  data?: object
): Promise<void> {
  // Get all manager IDs
  const { data: managers, error } = await supabase
    .from('staff_members')
    .select('id')
    .eq('role', 'manager');

  if (error) throw new Error(`Failed to fetch managers: ${error.message}`);

  // Send notification to each manager
  const promises = (managers ?? []).map((staff) =>
    sendPushNotification(supabase, staff.id, title, body, data)
  );

  await Promise.all(promises);
}

/**
 * Notify both reception and manager staff (for critical events)
 * @param supabase - Supabase client instance
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional structured data
 */
export async function notifyReceptionAndManagers(
  supabase: SupabaseClient,
  title: string,
  body: string,
  data?: object
): Promise<void> {
  // Get all reception + manager staff IDs
  const { data: staff, error } = await supabase
    .from('staff_members')
    .select('id')
    .in('role', ['reception', 'manager']);

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`);

  // Send notification to each staff member
  const promises = (staff ?? []).map((s) =>
    sendPushNotification(supabase, s.id, title, body, data)
  );

  await Promise.all(promises);
}
