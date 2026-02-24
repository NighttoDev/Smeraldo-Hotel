/**
 * Room Status Transition Validator (Finite State Machine)
 *
 * Defines valid room status transitions to prevent invalid state changes.
 * Used by status override approval workflow to validate manager requests.
 *
 * Valid transitions:
 * - available → being_cleaned (prepare room)
 * - being_cleaned → ready (room clean, ready for next guest)
 * - ready → available (room ready)
 * - available → occupied (check-in only - NOT via override)
 * - occupied → available (check-out only - NOT via override)
 * - occupied → being_cleaned (check-out then cleaning)
 */

import type { RoomStatus } from '$lib/stores/roomState';

/**
 * Transition map defining valid next states for each current state
 */
const VALID_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  available: ['being_cleaned'], // Can start cleaning
  being_cleaned: ['ready'], // After cleaning, mark as ready
  ready: ['available'], // Ready room becomes available
  occupied: ['being_cleaned'], // Cannot go to available via override (must check-out)
  checking_out_today: ['being_cleaned'] // Guest checking out today can transition to cleaning
};

/**
 * Check if a status transition is valid
 *
 * @param from - Current room status
 * @param to - Requested room status
 * @returns true if transition is allowed, false otherwise
 *
 * @example
 * isValidTransition('available', 'being_cleaned') // true
 * isValidTransition('occupied', 'available') // false - must use check-out action
 */
export function isValidTransition(from: RoomStatus, to: RoomStatus): boolean {
  // Same status is always valid (no-op)
  if (from === to) {
    return true;
  }

  // Check if target status is in the allowed transitions
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid transitions from a given status
 *
 * @param from - Current room status
 * @returns Array of valid target statuses
 *
 * @example
 * getValidTransitions('available') // ['being_cleaned']
 */
export function getValidTransitions(from: RoomStatus): RoomStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

/**
 * Get human-readable reason why a transition is invalid
 *
 * @param from - Current room status
 * @param to - Requested room status
 * @returns Error message explaining why transition is invalid, or null if valid
 */
export function getTransitionError(from: RoomStatus, to: RoomStatus): string | null {
  if (isValidTransition(from, to)) {
    return null;
  }

  // Special case: occupied → available requires check-out
  if (from === 'occupied' && to === 'available') {
    return 'Không thể chuyển phòng đang ở thành trống. Vui lòng sử dụng chức năng trả phòng (check-out).';
  }

  // Special case: available → occupied requires check-in
  if (from === 'available' && to === 'occupied') {
    return 'Không thể chuyển phòng trống thành đang ở. Vui lòng sử dụng chức năng nhận phòng (check-in).';
  }

  // Generic error
  return `Không thể chuyển trạng thái từ "${from}" sang "${to}". Vui lòng chọn trạng thái khác.`;
}

/**
 * Status labels in Vietnamese for UI display
 */
export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  available: 'Trống',
  being_cleaned: 'Đang dọn',
  occupied: 'Đang ở',
  ready: 'Sẵn sàng',
  checking_out_today: 'Trả phòng hôm nay'
};
