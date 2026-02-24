import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getValidTransitions,
  getTransitionError
} from './room-status-transitions';
import type { RoomStatus } from '$lib/stores/roomState';

describe('room-status-transitions', () => {
  describe('isValidTransition', () => {
    it('should allow same status (no-op)', () => {
      const statuses: RoomStatus[] = ['available', 'being_cleaned', 'occupied', 'ready', 'checking_out_today'];
      statuses.forEach(status => {
        expect(isValidTransition(status, status)).toBe(true);
      });
    });

    it('should allow available → being_cleaned', () => {
      expect(isValidTransition('available', 'being_cleaned')).toBe(true);
    });

    it('should NOT allow available → occupied (must use check-in)', () => {
      expect(isValidTransition('available', 'occupied')).toBe(false);
    });

    it('should NOT allow available → ready', () => {
      expect(isValidTransition('available', 'ready')).toBe(false);
    });

    it('should allow being_cleaned → ready', () => {
      expect(isValidTransition('being_cleaned', 'ready')).toBe(true);
    });

    it('should NOT allow being_cleaned → occupied', () => {
      expect(isValidTransition('being_cleaned', 'occupied')).toBe(false);
    });

    it('should NOT allow being_cleaned → available', () => {
      expect(isValidTransition('being_cleaned', 'available')).toBe(false);
    });

    it('should allow ready → available', () => {
      expect(isValidTransition('ready', 'available')).toBe(true);
    });

    it('should NOT allow ready → occupied', () => {
      expect(isValidTransition('ready', 'occupied')).toBe(false);
    });

    it('should allow occupied → being_cleaned', () => {
      expect(isValidTransition('occupied', 'being_cleaned')).toBe(true);
    });

    it('should NOT allow occupied → available (must use check-out)', () => {
      expect(isValidTransition('occupied', 'available')).toBe(false);
    });

    it('should NOT allow occupied → ready', () => {
      expect(isValidTransition('occupied', 'ready')).toBe(false);
    });

    it('should allow checking_out_today → being_cleaned', () => {
      expect(isValidTransition('checking_out_today', 'being_cleaned')).toBe(true);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for available', () => {
      const transitions = getValidTransitions('available');
      expect(transitions).toEqual(['being_cleaned']);
    });

    it('should return valid transitions for being_cleaned', () => {
      const transitions = getValidTransitions('being_cleaned');
      expect(transitions).toEqual(['ready']);
    });

    it('should return valid transitions for ready', () => {
      const transitions = getValidTransitions('ready');
      expect(transitions).toEqual(['available']);
    });

    it('should return valid transitions for occupied', () => {
      const transitions = getValidTransitions('occupied');
      expect(transitions).toEqual(['being_cleaned']);
    });

    it('should return valid transitions for checking_out_today', () => {
      const transitions = getValidTransitions('checking_out_today');
      expect(transitions).toEqual(['being_cleaned']);
    });
  });

  describe('getTransitionError', () => {
    it('should return null for valid transitions', () => {
      expect(getTransitionError('available', 'being_cleaned')).toBeNull();
      expect(getTransitionError('being_cleaned', 'ready')).toBeNull();
      expect(getTransitionError('ready', 'available')).toBeNull();
      expect(getTransitionError('occupied', 'being_cleaned')).toBeNull();
    });

    it('should return specific error for occupied → available', () => {
      const error = getTransitionError('occupied', 'available');
      expect(error).toContain('check-out');
      expect(error).toContain('trả phòng');
    });

    it('should return specific error for available → occupied', () => {
      const error = getTransitionError('available', 'occupied');
      expect(error).toContain('check-in');
      expect(error).toContain('nhận phòng');
    });

    it('should return generic error for other invalid transitions', () => {
      const error = getTransitionError('being_cleaned', 'occupied');
      expect(error).toBeTruthy();
      expect(error).toContain('Không thể chuyển');
    });

    it('should return null for same status', () => {
      expect(getTransitionError('available', 'available')).toBeNull();
    });
  });
});
