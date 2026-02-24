// Live inventory map from Supabase Realtime — subscribe in +layout.svelte only
import { writable, derived } from 'svelte/store';

export interface InventoryItemState {
	id: string;
	name: string;
	category: string;
	current_stock: number;
	low_stock_threshold: number;
	unit: string;
	created_at: string | null;
	updated_at: string | null;
}

/** All inventory items keyed by ID for O(1) lookup */
export const inventoryStateStore = writable<Map<string, InventoryItemState>>(new Map());

/** Derived: all inventory items as array sorted by category, then name */
export const inventoryListStore = derived(inventoryStateStore, ($items) =>
	Array.from($items.values()).sort((a, b) => {
		if (a.category !== b.category) {
			return a.category.localeCompare(b.category);
		}
		return a.name.localeCompare(b.name);
	})
);

/** Derived: low stock items (current_stock <= threshold) */
export const lowStockItemsStore = derived(inventoryStateStore, ($items) =>
	Array.from($items.values())
		.filter((item) => item.current_stock <= item.low_stock_threshold)
		.sort((a, b) => {
			// Sort by urgency: lowest stock first
			const urgencyA = a.current_stock / a.low_stock_threshold;
			const urgencyB = b.current_stock / b.low_stock_threshold;
			return urgencyA - urgencyB;
		})
);

/** Derived: unique categories sorted alphabetically */
export const categoriesStore = derived(inventoryListStore, ($items) =>
	[...new Set($items.map((item) => item.category))].sort()
);

/** Derived: total items count */
export const totalItemsCountStore = derived(inventoryStateStore, ($items) => $items.size);

/** Derived: low stock count */
export const lowStockCountStore = derived(lowStockItemsStore, ($items) => $items.length);

/** Initialize the store from server data */
export function initInventoryState(items: InventoryItemState[]): void {
	const map = new Map<string, InventoryItemState>();
	for (const item of items) {
		map.set(item.id, item);
	}
	inventoryStateStore.set(map);
}

/** Update a single inventory item in the store (from Realtime) */
export function updateInventoryInStore(item: InventoryItemState): void {
	inventoryStateStore.update((map) => {
		const newMap = new Map(map);
		newMap.set(item.id, item);
		return newMap;
	});
}

/** Remove an inventory item from the store (from Realtime DELETE) */
export function removeInventoryFromStore(itemId: string): void {
	inventoryStateStore.update((map) => {
		const newMap = new Map(map);
		newMap.delete(itemId);
		return newMap;
	});
}
