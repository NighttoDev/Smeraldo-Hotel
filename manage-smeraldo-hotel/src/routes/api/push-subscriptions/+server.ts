/**
 * Push Subscription Management API (Story 7.4)
 * Endpoint for saving/deleting push subscriptions
 *
 * @route POST /api/push-subscriptions - Save new subscription
 * @route DELETE /api/push-subscriptions - Remove subscription
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * POST /api/push-subscriptions
 * Save a new push subscription for the current user
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Get current user
  const { user } = await locals.safeGetSession();
  if (!user) {
    return error(401, 'Unauthorized');
  }

  try {
    const body = (await request.json()) as SubscriptionPayload;

    // Validate payload
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return error(400, 'Invalid subscription payload');
    }

    // Insert subscription (UPSERT to handle re-subscriptions)
    const { error: dbError } = await locals.supabase
      .from('push_subscriptions')
      .upsert(
        {
          staff_id: user.id,
          endpoint: body.endpoint,
          p256dh_key: body.keys.p256dh,
          auth_key: body.keys.auth
        },
        { onConflict: 'staff_id,endpoint' }
      );

    if (dbError) {
      console.error('Failed to save push subscription:', dbError);
      return error(500, 'Failed to save subscription');
    }

    return json({ data: { saved: true }, error: null });
  } catch (err: unknown) {
    console.error('Push subscription save failed:', err);
    return json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
};

/**
 * DELETE /api/push-subscriptions
 * Remove a push subscription
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) {
    return error(401, 'Unauthorized');
  }

  try {
    const body = (await request.json()) as { endpoint: string };

    if (!body.endpoint) {
      return error(400, 'Missing endpoint');
    }

    const { error: dbError } = await locals.supabase
      .from('push_subscriptions')
      .delete()
      .eq('staff_id', user.id)
      .eq('endpoint', body.endpoint);

    if (dbError) {
      console.error('Failed to delete push subscription:', dbError);
      return error(500, 'Failed to delete subscription');
    }

    return json({ data: { deleted: true }, error: null });
  } catch (err: unknown) {
    console.error('Push subscription delete failed:', err);
    return json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
};
