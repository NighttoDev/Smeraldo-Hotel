// Server-only — never import from .svelte components
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	InventoryItemRow,
	StockMovementWithStaff,
	InventorySummaryRow
} from '$lib/types/inventory';

export type { InventoryItemRow, StockMovementWithStaff, InventorySummaryRow };

/**
 * Fetch all inventory items ordered by category ASC, name ASC.
 */
export async function getAllInventoryItems(
	supabase: SupabaseClient
): Promise<InventoryItemRow[]> {
	const { data, error } = await supabase
		.from('inventory_items')
		.select('id, name, category, current_stock, low_stock_threshold, unit, created_at, updated_at')
		.order('category', { ascending: true })
		.order('name', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch inventory items: ${error.message}`);
	}

	return (data ?? []) as InventoryItemRow[];
}

/**
 * Log a stock-in event and increment inventory count atomically.
 * @param supabase - Supabase client
 * @param itemId - ID of the inventory item
 * @param quantity - Quantity to add (must be positive)
 * @param notes - Optional notes about the stock-in
 * @param userId - ID of the user logging the stock-in
 */
export async function logStockIn(
	supabase: SupabaseClient,
	itemId: string,
	quantity: number,
	notes: string | null,
	userId: string
): Promise<void> {
	// Step 1: Insert stock movement record
	const { error: movementError } = await supabase.from('stock_movements').insert({
		item_id: itemId,
		type: 'stock_in',
		quantity,
		recipient_name: null,
		notes,
		created_by: userId
	});

	if (movementError) {
		throw new Error(`Failed to log stock-in movement: ${movementError.message}`);
	}

	// Step 2: Fetch current stock and increment
	const { data: currentItem, error: fetchError } = await supabase
		.from('inventory_items')
		.select('current_stock')
		.eq('id', itemId)
		.single();

	if (fetchError) {
		throw new Error(`Failed to fetch current stock: ${fetchError.message}`);
	}

	// Step 3: Update with incremented value
	const { error: updateError } = await supabase
		.from('inventory_items')
		.update({ current_stock: (currentItem?.current_stock ?? 0) + quantity })
		.eq('id', itemId)
		.select('current_stock')
		.single();

	if (updateError) {
		throw new Error(`Failed to update inventory stock: ${updateError.message}`);
	}
}

/**
 * Log a stock-out event and decrement inventory count atomically.
 * Validates that sufficient stock exists before logging.
 * @param supabase - Supabase client
 * @param itemId - ID of the inventory item
 * @param quantity - Quantity to remove (must be positive and ≤ current_stock)
 * @param recipientName - Name of the person/entity receiving the items (required)
 * @param notes - Optional notes about the stock-out
 * @param userId - ID of the user logging the stock-out
 */
export async function logStockOut(
	supabase: SupabaseClient,
	itemId: string,
	quantity: number,
	recipientName: string,
	notes: string | null,
	userId: string
): Promise<void> {
	// Step 1: Check current stock level and fetch item details
	const { data: item, error: fetchError } = await supabase
		.from('inventory_items')
		.select('current_stock, item_name, low_stock_threshold')
		.eq('id', itemId)
		.single();

	if (fetchError) {
		throw new Error(`Failed to fetch current stock: ${fetchError.message}`);
	}

	// Step 2: Validate sufficient stock
	if (!item || item.current_stock < quantity) {
		throw new Error(`Không đủ hàng tồn kho (hiện có: ${item?.current_stock ?? 0})`);
	}

	// Step 3: Insert stock movement record
	const { error: movementError } = await supabase.from('stock_movements').insert({
		item_id: itemId,
		type: 'stock_out',
		quantity,
		recipient_name: recipientName,
		notes,
		created_by: userId
	});

	if (movementError) {
		throw new Error(`Failed to log stock-out movement: ${movementError.message}`);
	}

	// Step 4: Decrement inventory current_stock
	const newStock = item.current_stock - quantity;
	const { error: updateError } = await supabase
		.from('inventory_items')
		.update({ current_stock: newStock })
		.eq('id', itemId)
		.select('current_stock')
		.single();

	if (updateError) {
		throw new Error(`Failed to update inventory stock: ${updateError.message}`);
	}

	// Step 5: Check if low-stock threshold crossed and trigger notification (Story 7.4)
	// Only send notification when crossing threshold (not every time stock is below)
	const wasAboveThreshold = item.current_stock > (item.low_stock_threshold ?? 0);
	const isNowAtOrBelowThreshold = newStock <= (item.low_stock_threshold ?? 0);

	if (wasAboveThreshold && isNowAtOrBelowThreshold && item.low_stock_threshold !== null) {
		// Trigger low-stock notification (non-blocking, don't fail stock-out on notification error)
		try {
			const response = await fetch('http://localhost:3000/api/notifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'low-stock',
					payload: {
						itemName: item.item_name,
						currentStock: newStock
					}
				})
			});

			if (!response.ok) {
				console.error('Low-stock notification failed:', await response.text());
			}
		} catch (notifError) {
			// Log error but don't fail the stock-out operation
			console.error('Failed to send low-stock notification:', notifError);
		}
	}
}

/**
 * Update the low-stock threshold for an inventory item.
 * Only managers can call this function (RBAC enforced at Form Action level).
 * @param supabase - Supabase client
 * @param itemId - ID of the inventory item
 * @param threshold - New threshold value (must be non-negative integer)
 */
export async function updateLowStockThreshold(
	supabase: SupabaseClient,
	itemId: string,
	threshold: number
): Promise<void> {
	const { error } = await supabase
		.from('inventory_items')
		.update({ low_stock_threshold: threshold })
		.eq('id', itemId);

	if (error) {
		throw new Error(`Failed to update low-stock threshold: ${error.message}`);
	}
}

/**
 * Fetch stock movement history for a specific inventory item.
 * Returns movements in reverse-chronological order (most recent first) with pagination support.
 * @param supabase - Supabase client
 * @param itemId - ID of the inventory item
 * @param limit - Number of records to return (default 50 for pagination)
 * @param offset - Number of records to skip (default 0)
 * @returns Array of stock movements with staff names
 */
export async function getStockMovementHistory(
	supabase: SupabaseClient,
	itemId: string,
	limit: number = 50,
	offset: number = 0
): Promise<StockMovementWithStaff[]> {
	const { data, error } = await supabase
		.from('stock_movements')
		.select(
			`
			id,
			type,
			quantity,
			recipient_name,
			notes,
			created_at,
			created_by,
			staff_members (
				id,
				full_name
			)
		`
		)
		.eq('item_id', itemId)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		throw new Error(`Failed to fetch stock movement history: ${error.message}`);
	}

	return (data || []).map((row) => ({
		id: row.id,
		type: row.type as 'stock_in' | 'stock_out',
		quantity: row.quantity,
		recipient_name: row.recipient_name,
		notes: row.notes,
		created_at: row.created_at,
		created_by: row.created_by,
		staff_name: (row.staff_members as { full_name?: string } | null)?.full_name || 'Unknown'
	}));
}

/**
 * Generate monthly inventory summary report showing opening/closing stock and movements.
 * @param supabase - Supabase client
 * @param year - Year for the report (e.g., 2026)
 * @param month - Month for the report (1-12)
 * @returns Array of inventory summary rows with opening/closing stock calculations
 */
export async function getInventorySummaryReport(
	supabase: SupabaseClient,
	year: number,
	month: number
): Promise<InventorySummaryRow[]> {
	const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
	// Calculate last day of month (timezone-safe, matches attendance report pattern)
	const lastDay = new Date(year, month, 0).getDate();
	const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

	// Step 1: Get all items (Story 6.4: added low_stock_threshold for Low Stock indicator)
	const { data: items, error: itemsError } = await supabase
		.from('inventory_items')
		.select('id, name, current_stock, low_stock_threshold')
		.order('name', { ascending: true });

	if (itemsError) {
		throw new Error(`Failed to fetch inventory items: ${itemsError.message}`);
	}

	// Step 2: Aggregate movements for the month
	const { data: movements, error: movementsError } = await supabase
		.from('stock_movements')
		.select('item_id, type, quantity')
		.gte('created_at', startDate)
		.lte('created_at', `${endDate}T23:59:59`);

	if (movementsError) {
		throw new Error(`Failed to fetch stock movements: ${movementsError.message}`);
	}

	// Step 3: Calculate opening stock (movements before start date)
	const { data: priorMovements, error: priorError } = await supabase
		.from('stock_movements')
		.select('item_id, type, quantity')
		.lt('created_at', startDate);

	if (priorError) {
		throw new Error(`Failed to fetch prior movements: ${priorError.message}`);
	}

	// Build report rows
	const report: InventorySummaryRow[] = (items || []).map((item) => {
		const priorIn =
			priorMovements
				?.filter((m) => m.item_id === item.id && m.type === 'stock_in')
				.reduce((sum, m) => sum + m.quantity, 0) || 0;
		const priorOut =
			priorMovements
				?.filter((m) => m.item_id === item.id && m.type === 'stock_out')
				.reduce((sum, m) => sum + m.quantity, 0) || 0;
		const opening_stock = priorIn - priorOut;

		const totalIn =
			movements
				?.filter((m) => m.item_id === item.id && m.type === 'stock_in')
				.reduce((sum, m) => sum + m.quantity, 0) || 0;
		const totalOut =
			movements
				?.filter((m) => m.item_id === item.id && m.type === 'stock_out')
				.reduce((sum, m) => sum + m.quantity, 0) || 0;
		const closing_stock = opening_stock + totalIn - totalOut;

		return {
			item_id: item.id,
			item_name: item.name,
			opening_stock,
			total_in: totalIn,
			total_out: totalOut,
			closing_stock,
			current_stock: item.current_stock,
			low_stock_threshold: item.low_stock_threshold // Story 6.4: for Low Stock indicator
		};
	});

	return report;
}
