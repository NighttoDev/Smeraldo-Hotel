import { z } from 'zod';
import { RoomStatusSchema } from '$lib/db/schema';

const DB_NAME = 'smeraldo-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'queue_items';
export const OFFLINE_QUEUE_MAX_RETRIES = 3;

export const OfflineActionSchema = z.enum(['room_override_status', 'attendance_log', 'inventory_stock_in', 'inventory_stock_out']);
export type OfflineAction = z.infer<typeof OfflineActionSchema>;

const RoomOverridePayloadSchema = z.object({
	room_id: z.string().uuid(),
	new_status: RoomStatusSchema
});

const AttendanceLogPayloadSchema = z.object({
	staff_id: z.string().uuid(),
	log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	shift_value: z.union([z.literal(0), z.literal(0.5), z.literal(1), z.literal(1.5)])
});

const InventoryStockInPayloadSchema = z.object({
	item_id: z.string().uuid(),
	quantity: z.number().int().positive(),
	notes: z.string().max(500).nullable().optional()
});

const InventoryStockOutPayloadSchema = z.object({
	item_id: z.string().uuid(),
	quantity: z.number().int().positive(),
	recipient_name: z.string().min(1).max(100),
	notes: z.string().max(500).nullable().optional()
});

export type QueuePayload =
	| z.infer<typeof RoomOverridePayloadSchema>
	| z.infer<typeof AttendanceLogPayloadSchema>
	| z.infer<typeof InventoryStockInPayloadSchema>
	| z.infer<typeof InventoryStockOutPayloadSchema>;

export interface QueueItem<TPayload extends QueuePayload = QueuePayload> {
	id: string;
	action: OfflineAction;
	payload: TPayload;
	timestamp: string;
	retries: number;
}

export interface QueueSyncResult {
	itemId: string;
	ok: boolean;
	error?: string;
	conflict?: boolean;
}

const QueueItemBaseFields = {
	id: z.string().uuid(),
	timestamp: z.string().datetime(),
	retries: z.number().int().min(0)
} as const;

export const QueueItemSchema = z.discriminatedUnion('action', [
	z.object({
		...QueueItemBaseFields,
		action: z.literal('room_override_status'),
		payload: RoomOverridePayloadSchema
	}),
	z.object({
		...QueueItemBaseFields,
		action: z.literal('attendance_log'),
		payload: AttendanceLogPayloadSchema
	}),
	z.object({
		...QueueItemBaseFields,
		action: z.literal('inventory_stock_in'),
		payload: InventoryStockInPayloadSchema
	}),
	z.object({
		...QueueItemBaseFields,
		action: z.literal('inventory_stock_out'),
		payload: InventoryStockOutPayloadSchema
	})
]);

export const QueueBatchSchema = z.object({
	items: z.array(QueueItemSchema).default([])
});

export type EnqueueInput =
	| { action: 'room_override_status'; payload: z.infer<typeof RoomOverridePayloadSchema>; timestamp?: string }
	| { action: 'attendance_log'; payload: z.infer<typeof AttendanceLogPayloadSchema>; timestamp?: string }
	| { action: 'inventory_stock_in'; payload: z.infer<typeof InventoryStockInPayloadSchema>; timestamp?: string }
	| { action: 'inventory_stock_out'; payload: z.infer<typeof InventoryStockOutPayloadSchema>; timestamp?: string };

function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortQueueItems(items: QueueItem[]): QueueItem[] {
	return [...items].sort((a, b) => {
		if (a.timestamp !== b.timestamp) return a.timestamp.localeCompare(b.timestamp);
		return a.id.localeCompare(b.id);
	});
}

function validateQueueItem(input: unknown): QueueItem {
	return QueueItemSchema.parse(input) as QueueItem;
}

function openQueueDb(): Promise<IDBDatabase> {
	if (!isBrowser()) {
		return Promise.reject(new Error('IndexedDB is only available in the browser'));
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
	});
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
	return openQueueDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, mode);
				const store = tx.objectStore(STORE_NAME);

				run(store)
					.then((value) => {
						tx.oncomplete = () => {
							db.close();
							resolve(value);
						};
						tx.onerror = () => {
							db.close();
							reject(tx.error ?? new Error('IndexedDB transaction failed'));
						};
						tx.onabort = () => {
							db.close();
							reject(tx.error ?? new Error('IndexedDB transaction aborted'));
						};
					})
					.catch((error) => {
						db.close();
						tx.abort();
						reject(error);
					});
			})
	);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
	});
}

export function getQueueItemCount(): Promise<number> {
	return withStore('readonly', async (store) => requestToPromise<number>(store.count()));
}

export function getQueuedItems(): Promise<QueueItem[]> {
	return withStore('readonly', async (store) => {
		const all = (await requestToPromise(store.getAll())) as unknown[];
		return sortQueueItems(all.map(validateQueueItem));
	});
}

export async function enqueueOfflineAction(input: EnqueueInput): Promise<QueueItem> {
	const candidate = validateQueueItem({
		id: generateId(),
		action: input.action,
		payload: input.payload,
		timestamp: input.timestamp ?? new Date().toISOString(),
		retries: 0
	});

	return withStore('readwrite', async (store) => {
		await requestToPromise(store.put(candidate));
		return candidate;
	});
}

export function removeQueuedItem(itemId: string): Promise<void> {
	return withStore('readwrite', async (store) => {
		await requestToPromise(store.delete(itemId));
	});
}

export async function incrementQueueItemRetry(itemId: string): Promise<QueueItem | null> {
	return withStore('readwrite', async (store) => {
		const existing = await requestToPromise(store.get(itemId));
		if (!existing) return null;
		const parsed = validateQueueItem(existing);
		const updated = validateQueueItem({ ...parsed, retries: parsed.retries + 1 });
		await requestToPromise(store.put(updated));
		return updated;
	});
}

export async function resetQueueItemRetry(itemId: string): Promise<QueueItem | null> {
	return withStore('readwrite', async (store) => {
		const existing = await requestToPromise(store.get(itemId));
		if (!existing) return null;
		const parsed = validateQueueItem(existing);
		const updated = validateQueueItem({ ...parsed, retries: 0 });
		await requestToPromise(store.put(updated));
		return updated;
	});
}

export async function replaceQueuedItem(item: QueueItem): Promise<QueueItem> {
	const validated = validateQueueItem(item);
	return withStore('readwrite', async (store) => {
		await requestToPromise(store.put(validated));
		return validated;
	});
}

export async function clearOfflineQueue(): Promise<void> {
	return withStore('readwrite', async (store) => {
		await requestToPromise(store.clear());
	});
}

export function isQueueItemExceededRetries(item: QueueItem): boolean {
	return item.retries >= OFFLINE_QUEUE_MAX_RETRIES;
}
