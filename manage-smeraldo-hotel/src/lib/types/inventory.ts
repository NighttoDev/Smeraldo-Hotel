export interface InventoryItemRow {
	id: string;
	name: string;
	category: string;
	current_stock: number;
	low_stock_threshold: number;
	unit: string;
	created_at: string | null;
	updated_at: string | null;
}

export interface StockMovementWithStaff {
	id: string;
	type: 'stock_in' | 'stock_out';
	quantity: number;
	recipient_name: string | null;
	notes: string | null;
	created_at: string;
	created_by: string;
	staff_name: string;
}

export interface InventorySummaryRow {
	item_id: string;
	item_name: string;
	opening_stock: number;
	total_in: number;
	total_out: number;
	closing_stock: number;
	current_stock: number;
}
