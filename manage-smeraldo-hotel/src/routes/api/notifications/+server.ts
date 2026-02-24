/**
 * Push Notification API Endpoint (Story 7.4)
 * Internal API for dispatching push notifications to staff members
 *
 * @route POST /api/notifications
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notifyReceptionStaff, notifyManagers } from '$lib/server/webpush';

/**
 * Notification payload schema
 */
interface NotificationPayload {
  type: 'low-stock' | 'room-ready';
  payload: {
    itemName?: string;
    currentStock?: number;
    roomNumber?: string;
    [key: string]: unknown;
  };
}

/**
 * POST /api/notifications
 * Dispatches push notifications to appropriate staff members based on notification type
 *
 * Request body:
 * {
 *   type: 'low-stock' | 'room-ready',
 *   payload: { itemName, currentStock } | { roomNumber }
 * }
 *
 * Response:
 * {
 *   data: { sent: true },
 *   error: null
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = (await request.json()) as NotificationPayload;

    // Validate notification type
    if (!body.type || !['low-stock', 'room-ready'].includes(body.type)) {
      return error(400, 'Invalid notification type. Must be "low-stock" or "room-ready"');
    }

    // Validate payload
    if (!body.payload || typeof body.payload !== 'object') {
      return error(400, 'Missing or invalid payload');
    }

    const { type, payload } = body;

    // Dispatch notification based on type
    if (type === 'low-stock') {
      // Low stock notification — notify managers only
      const { itemName, currentStock } = payload;

      if (!itemName || currentStock === undefined) {
        return error(400, 'Low-stock notification requires itemName and currentStock');
      }

      await notifyManagers(
        locals.supabase,
        '⚠️ Cảnh báo tồn kho thấp',
        `${itemName} — Còn ${currentStock} đơn vị`,
        { type: 'low-stock', itemName, currentStock }
      );
    } else if (type === 'room-ready') {
      // Room ready notification — notify reception staff
      const { roomNumber } = payload;

      if (!roomNumber) {
        return error(400, 'Room-ready notification requires roomNumber');
      }

      await notifyReceptionStaff(
        locals.supabase,
        '✅ Phòng sẵn sàng',
        `Phòng ${roomNumber} đã sẵn sàng cho khách nhận phòng`,
        { type: 'room-ready', roomNumber }
      );
    }

    // Return success response
    return json({
      data: { sent: true },
      error: null
    });
  } catch (err: unknown) {
    console.error('Push notification dispatch failed:', err);

    // Return error response (don't expose internal error details to client)
    return json(
      {
        data: null,
        error: 'Failed to send notification'
      },
      { status: 500 }
    );
  }
};
