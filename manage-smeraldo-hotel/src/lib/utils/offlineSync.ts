import {
	OFFLINE_QUEUE_MAX_RETRIES,
	type QueueItem,
	type QueueSyncResult,
	getQueueItemCount,
	getQueuedItems,
	incrementQueueItemRetry,
	isQueueItemExceededRetries,
	removeQueuedItem,
	resetQueueItemRetry
} from '$lib/utils/offlineQueue';
import {
	clearOfflineSyncError,
	markRealtimeActivity,
	setOfflineQueueCount,
	setOfflineSyncError
} from '$lib/stores/realtimeStatus';

let flushInFlight: Promise<void> | null = null;

function labelForAction(action: QueueItem['action']): string {
	switch (action) {
		case 'room_override_status':
			return 'cập nhật trạng thái phòng';
		case 'attendance_log':
			return 'chấm công';
		case 'inventory_stock_in':
			return 'nhập kho';
		case 'inventory_stock_out':
			return 'xuất kho';
		default:
			return 'đồng bộ dữ liệu';
	}
}

export async function refreshOfflineQueueCount(): Promise<void> {
	const count = await getQueueItemCount();
	setOfflineQueueCount(count);
}

async function postQueueItems(items: QueueItem[]): Promise<QueueSyncResult[]> {
	const response = await fetch('/api/sync', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ items })
	});

	if (!response.ok) {
		throw new Error('SYNC_REQUEST_FAILED');
	}

	const payload = (await response.json()) as {
		data: { results: QueueSyncResult[] } | null;
		error: { message: string; code: string } | null;
	};

	if (payload.error || !payload.data) {
		throw new Error(payload.error?.message ?? 'SYNC_RESPONSE_ERROR');
	}

	return payload.data.results;
}

async function markBatchRequestFailure(items: QueueItem[]): Promise<void> {
	for (const item of items) {
		const updated = await incrementQueueItemRetry(item.id);
		if (updated && updated.retries >= OFFLINE_QUEUE_MAX_RETRIES) {
			setOfflineSyncError(`Đồng bộ thất bại cho ${labelForAction(item.action)} — chạm để thử lại`);
		}
	}
}

async function flushNow(): Promise<void> {
	if (typeof navigator !== 'undefined' && !navigator.onLine) {
		await refreshOfflineQueueCount();
		return;
	}

	const queue = await getQueuedItems();
	if (queue.length === 0) {
		clearOfflineSyncError();
		await refreshOfflineQueueCount();
		return;
	}

	const retryableItems = queue.filter((item) => !isQueueItemExceededRetries(item));
	if (retryableItems.length === 0) {
		const blocked = queue[0];
		setOfflineSyncError(`Đồng bộ thất bại cho ${labelForAction(blocked.action)} — chạm để thử lại`);
		await refreshOfflineQueueCount();
		return;
	}

	let results: QueueSyncResult[];
	try {
		results = await postQueueItems(retryableItems);
	} catch {
		await markBatchRequestFailure(retryableItems);
		await refreshOfflineQueueCount();
		return;
	}

	const processedIds = new Set<string>();
	for (const result of results) {
		const item = retryableItems.find((candidate) => candidate.id === result.itemId);
		if (!item) continue;
		processedIds.add(result.itemId);

		if (result.ok) {
			await removeQueuedItem(result.itemId);
			clearOfflineSyncError();
			markRealtimeActivity();
			continue;
		}

		const updated = await incrementQueueItemRetry(result.itemId);
		if (updated && updated.retries >= OFFLINE_QUEUE_MAX_RETRIES) {
			setOfflineSyncError(
				`Đồng bộ thất bại cho ${labelForAction(item.action)} — chạm để thử lại`
			);
		}
	}

	for (const item of retryableItems) {
		if (processedIds.has(item.id)) continue;
		const updated = await incrementQueueItemRetry(item.id);
		if (updated && updated.retries >= OFFLINE_QUEUE_MAX_RETRIES) {
			setOfflineSyncError(`Đồng bộ thất bại cho ${labelForAction(item.action)} — chạm để thử lại`);
		}
	}

	await refreshOfflineQueueCount();
}

export async function flushOfflineQueue(): Promise<void> {
	if (flushInFlight) return flushInFlight;
	flushInFlight = flushNow().finally(() => {
		flushInFlight = null;
	});
	return flushInFlight;
}

export async function retryFailedOfflineSync(): Promise<void> {
	const queue = await getQueuedItems();
	const blockedItems = queue.filter((item) => isQueueItemExceededRetries(item));
	for (const item of blockedItems) {
		await resetQueueItemRetry(item.id);
	}
	clearOfflineSyncError();
	await flushOfflineQueue();
}
