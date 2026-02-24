/**
 * Shift Timer Utility
 *
 * Monitors shift duration and triggers callback at 12-hour mark for auto-logout.
 * Uses setInterval with 1-minute precision to check elapsed time.
 */

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute

export interface ShiftTimerConfig {
	/** Timestamp when shift started (ISO string or Date) */
	shiftStartTime: string | Date;
	/** Callback invoked when 12 hours elapsed */
	onExpire: () => void;
	/** Optional callback for debug/logging (elapsed minutes) */
	onTick?: (elapsedMinutes: number) => void;
}

/**
 * Start monitoring shift duration
 *
 * @param config - Timer configuration
 * @returns Cleanup function to stop the timer
 *
 * @example
 * ```ts
 * const cleanup = startShiftTimer({
 *   shiftStartTime: '2026-02-24T08:00:00Z',
 *   onExpire: () => { console.log('12h elapsed - auto logout'); }
 * });
 *
 * // Later: stop the timer
 * cleanup();
 * ```
 */
export function startShiftTimer(config: ShiftTimerConfig): () => void {
	const { shiftStartTime, onExpire, onTick } = config;

	// Parse shift start time
	const startTime = typeof shiftStartTime === 'string' ? new Date(shiftStartTime) : shiftStartTime;

	if (isNaN(startTime.getTime())) {
		throw new Error('Invalid shiftStartTime provided');
	}

	// Check immediately on start
	checkElapsed();

	// Set up interval to check every minute
	const intervalId = setInterval(checkElapsed, CHECK_INTERVAL_MS);

	function checkElapsed(): void {
		const now = new Date();
		const elapsedMs = now.getTime() - startTime.getTime();
		const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

		// Optional tick callback for debugging/logging
		if (onTick) {
			onTick(elapsedMinutes);
		}

		// Trigger expiration if 12 hours or more elapsed
		if (elapsedMs >= TWELVE_HOURS_MS) {
			clearInterval(intervalId);
			onExpire();
		}
	}

	// Return cleanup function
	return () => {
		clearInterval(intervalId);
	};
}

/**
 * Calculate remaining time until 12-hour mark
 *
 * @param shiftStartTime - When shift started
 * @returns Object with remainingMs and formatted time string
 */
export function getRemainingTime(shiftStartTime: string | Date): {
	remainingMs: number;
	hours: number;
	minutes: number;
	formatted: string;
} {
	const startTime = typeof shiftStartTime === 'string' ? new Date(shiftStartTime) : shiftStartTime;

	if (isNaN(startTime.getTime())) {
		throw new Error('Invalid shiftStartTime provided');
	}

	const now = new Date();
	const elapsedMs = now.getTime() - startTime.getTime();
	const remainingMs = Math.max(0, TWELVE_HOURS_MS - elapsedMs);

	const hours = Math.floor(remainingMs / (60 * 60 * 1000));
	const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

	return {
		remainingMs,
		hours,
		minutes,
		formatted: `${hours}h ${minutes}m`
	};
}

/**
 * Check if shift has exceeded 12 hours
 */
export function isShiftExpired(shiftStartTime: string | Date): boolean {
	const startTime = typeof shiftStartTime === 'string' ? new Date(shiftStartTime) : shiftStartTime;

	if (isNaN(startTime.getTime())) {
		return false;
	}

	const now = new Date();
	const elapsedMs = now.getTime() - startTime.getTime();

	return elapsedMs >= TWELVE_HOURS_MS;
}
