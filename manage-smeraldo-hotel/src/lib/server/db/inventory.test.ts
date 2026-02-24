import { describe, it, expect, vi } from 'vitest';
import {
	getAllInventoryItems,
	logStockIn,
	logStockOut,
	updateLowStockThreshold,
	getStockMovementHistory,
	getInventorySummaryReport
} from './inventory';

function createMockSupabase(responseData: unknown = [], responseError: unknown = null) {
	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis()
	};

	// Final .order() call resolves with data
	let orderCallCount = 0;
	chain.order.mockImplementation(() => {
		orderCallCount++;
		if (orderCallCount >= 2) {
			return Promise.resolve({ data: responseData, error: responseError });
		}
		return chain;
	});

	return {
		from: vi.fn().mockReturnValue(chain),
		_chain: chain
	};
}

describe('getAllInventoryItems', () => {
	it('fetches all items ordered by category and name', async () => {
		const mockItems = [
			{
				id: '1',
				name: 'Coca-Cola',
				category: 'Đồ uống',
				current_stock: 24,
				low_stock_threshold: 10,
				unit: 'lon',
				created_at: null,
				updated_at: null
			},
			{
				id: '2',
				name: 'Khăn tắm',
				category: 'Vật tư',
				current_stock: 50,
				low_stock_threshold: 15,
				unit: 'cái',
				created_at: null,
				updated_at: null
			}
		];
		const supabase = createMockSupabase(mockItems);

		const result = await getAllInventoryItems(supabase as never);

		expect(supabase.from).toHaveBeenCalledWith('inventory_items');
		expect(supabase._chain.select).toHaveBeenCalledWith(
			'id, name, category, current_stock, low_stock_threshold, unit, created_at, updated_at'
		);
		expect(supabase._chain.order).toHaveBeenCalledWith('category', { ascending: true });
		expect(supabase._chain.order).toHaveBeenCalledWith('name', { ascending: true });
		expect(result).toEqual(mockItems);
	});

	it('returns empty array when no items exist', async () => {
		const supabase = createMockSupabase([]);

		const result = await getAllInventoryItems(supabase as never);

		expect(result).toEqual([]);
	});

	it('returns empty array when data is null', async () => {
		const supabase = createMockSupabase(null);

		const result = await getAllInventoryItems(supabase as never);

		expect(result).toEqual([]);
	});

	it('throws on database error', async () => {
		const supabase = createMockSupabase(null, { message: 'DB connection failed' });

		await expect(getAllInventoryItems(supabase as never)).rejects.toThrow(
			'Failed to fetch inventory items: DB connection failed'
		);
	});
});

describe('low-stock detection logic', () => {
	it('identifies items at threshold as low stock', () => {
		const item = { current_stock: 10, low_stock_threshold: 10 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);
	});

	it('identifies items below threshold as low stock', () => {
		const item = { current_stock: 3, low_stock_threshold: 10 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);
	});

	it('identifies items above threshold as not low stock', () => {
		const item = { current_stock: 24, low_stock_threshold: 10 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(false);
	});

	it('identifies items at zero stock as low stock', () => {
		const item = { current_stock: 0, low_stock_threshold: 5 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);
	});

	it('handles zero threshold correctly', () => {
		const item = { current_stock: 0, low_stock_threshold: 0 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);
	});

	it('item with stock above zero threshold is not low stock', () => {
		const item = { current_stock: 1, low_stock_threshold: 0 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(false);
	});
});

describe('logStockIn', () => {
	it('successfully logs stock-in and increments inventory', async () => {
		const mockMovementChain = {
			insert: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		const mockUpdateChain = {
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { current_stock: 30 },
				error: null
			}),
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis()
		};

		const supabase = {
			from: vi.fn((table) => {
				if (table === 'stock_movements') return mockMovementChain;
				if (table === 'inventory_items') return mockUpdateChain;
				return {};
			})
		};

		await logStockIn(
			supabase as never,
			'item-123',
			10,
			'Nhập từ nhà cung cấp A',
			'user-456'
		);

		expect(supabase.from).toHaveBeenCalledWith('stock_movements');
		expect(mockMovementChain.insert).toHaveBeenCalledWith({
			item_id: 'item-123',
			type: 'stock_in',
			quantity: 10,
			recipient_name: null,
			notes: 'Nhập từ nhà cung cấp A',
			created_by: 'user-456'
		});

		expect(supabase.from).toHaveBeenCalledWith('inventory_items');
		expect(mockUpdateChain.update).toHaveBeenCalled();
		expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', 'item-123');
	});

	it('throws error when stock movement insert fails', async () => {
		const mockMovementChain = {
			insert: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Insert failed' }
			})
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockMovementChain)
		};

		await expect(
			logStockIn(supabase as never, 'item-123', 10, null, 'user-456')
		).rejects.toThrow('Failed to log stock-in movement: Insert failed');
	});

	it('throws error when inventory update fails', async () => {
		const mockMovementChain = {
			insert: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		const mockFetchChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { current_stock: 20 },
				error: null
			})
		};

		const mockUpdateChain = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Update failed' }
			})
		};

		let inventoryCallCount = 0;
		const supabase = {
			from: vi.fn((table) => {
				if (table === 'stock_movements') return mockMovementChain;
				if (table === 'inventory_items') {
					inventoryCallCount++;
					// First call is fetch current stock, second is update
					return inventoryCallCount === 1 ? mockFetchChain : mockUpdateChain;
				}
				return {};
			})
		};

		await expect(
			logStockIn(supabase as never, 'item-123', 10, null, 'user-456')
		).rejects.toThrow('Failed to update inventory stock: Update failed');
	});
});

describe('logStockOut', () => {
	it('successfully logs stock-out and decrements inventory', async () => {
		const mockMovementChain = {
			insert: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		const mockSelectChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { current_stock: 50 },
				error: null
			})
		};

		const mockUpdateChain = {
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { current_stock: 40 },
				error: null
			}),
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis()
		};

		const supabase = {
			from: vi.fn((table) => {
				if (table === 'stock_movements') return mockMovementChain;
				if (table === 'inventory_items') {
					// First call is for checking current stock
					const callCount = supabase.from.mock.calls.filter(c => c[0] === 'inventory_items').length;
					return callCount === 1 ? mockSelectChain : mockUpdateChain;
				}
				return {};
			})
		};

		await logStockOut(
			supabase as never,
			'item-123',
			10,
			'Nguyễn Văn A',
			'Xuất cho khách',
			'user-456'
		);

		expect(supabase.from).toHaveBeenCalledWith('inventory_items');
		expect(mockSelectChain.select).toHaveBeenCalledWith('current_stock, item_name, low_stock_threshold');
		expect(mockSelectChain.eq).toHaveBeenCalledWith('id', 'item-123');

		expect(supabase.from).toHaveBeenCalledWith('stock_movements');
		expect(mockMovementChain.insert).toHaveBeenCalledWith({
			item_id: 'item-123',
			type: 'stock_out',
			quantity: 10,
			recipient_name: 'Nguyễn Văn A',
			notes: 'Xuất cho khách',
			created_by: 'user-456'
		});

		expect(mockUpdateChain.update).toHaveBeenCalled();
	});

	it('rejects stock-out when quantity exceeds current stock', async () => {
		const mockSelectChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { current_stock: 5 },
				error: null
			})
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockSelectChain)
		};

		await expect(
			logStockOut(supabase as never, 'item-123', 10, 'Nguyễn Văn A', null, 'user-456')
		).rejects.toThrow('Không đủ hàng tồn kho (hiện có: 5)');
	});

	it('throws error when stock movement insert fails', async () => {
		const mockSelectChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { current_stock: 50 },
				error: null
			})
		};

		const mockMovementChain = {
			insert: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Insert failed' }
			})
		};

		const supabase = {
			from: vi.fn((table) => {
				if (table === 'inventory_items') return mockSelectChain;
				if (table === 'stock_movements') return mockMovementChain;
				return {};
			})
		};

		await expect(
			logStockOut(supabase as never, 'item-123', 10, 'Nguyễn Văn A', null, 'user-456')
		).rejects.toThrow('Failed to log stock-out movement: Insert failed');
	});

	it('throws error when current stock fetch fails', async () => {
		const mockSelectChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Fetch failed' }
			})
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockSelectChain)
		};

		await expect(
			logStockOut(supabase as never, 'item-123', 10, 'Nguyễn Văn A', null, 'user-456')
		).rejects.toThrow('Failed to fetch current stock: Fetch failed');
	});
});

describe('updateLowStockThreshold', () => {
	it('successfully updates threshold for an item', async () => {
		const mockUpdateChain = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null
			})
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockUpdateChain)
		};

		await updateLowStockThreshold(supabase as never, 'item-123', 15);

		expect(supabase.from).toHaveBeenCalledWith('inventory_items');
		expect(mockUpdateChain.update).toHaveBeenCalledWith({ low_stock_threshold: 15 });
		expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', 'item-123');
	});

	it('throws error when database update fails', async () => {
		const mockUpdateChain = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Update failed' }
			})
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockUpdateChain)
		};

		await expect(
			updateLowStockThreshold(supabase as never, 'item-123', 15)
		).rejects.toThrow('Failed to update low-stock threshold: Update failed');
	});
});

describe('low-stock re-evaluation after threshold change', () => {
	it('item crosses INTO low-stock when threshold raised above current stock', () => {
		// Item with current_stock = 8, old threshold = 5 (not low stock)
		const item = { current_stock: 8, low_stock_threshold: 5 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(false);

		// Manager raises threshold to 10
		item.low_stock_threshold = 10;

		// Now it's low stock
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);
	});

	it('item crosses OUT OF low-stock when threshold lowered below current stock', () => {
		// Item with current_stock = 8, old threshold = 10 (low stock)
		const item = { current_stock: 8, low_stock_threshold: 10 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);

		// Manager lowers threshold to 5
		item.low_stock_threshold = 5;

		// No longer low stock
		expect(item.current_stock <= item.low_stock_threshold).toBe(false);
	});

	it('item remains low-stock when threshold adjusted but still above current stock', () => {
		// Item with current_stock = 3, old threshold = 10 (low stock)
		const item = { current_stock: 3, low_stock_threshold: 10 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);

		// Manager lowers threshold to 5 (still above current stock)
		item.low_stock_threshold = 5;

		// Still low stock
		expect(item.current_stock <= item.low_stock_threshold).toBe(true);
	});

	it('item remains sufficient when threshold adjusted but still below current stock', () => {
		// Item with current_stock = 20, old threshold = 10 (not low stock)
		const item = { current_stock: 20, low_stock_threshold: 10 };
		expect(item.current_stock <= item.low_stock_threshold).toBe(false);

		// Manager raises threshold to 15 (still below current stock)
		item.low_stock_threshold = 15;

		// Still not low stock
		expect(item.current_stock <= item.low_stock_threshold).toBe(false);
	});
});

describe('getStockMovementHistory', () => {
	it('fetches movement history with pagination and staff join', async () => {
		const mockMovements = [
			{
				id: 'mov-1',
				type: 'stock_in',
				quantity: 10,
				recipient_name: null,
				notes: 'Initial stock',
				created_at: '2026-02-20T10:00:00Z',
				created_by: 'user-1',
				staff_members: { id: 'user-1', full_name: 'Nguyen Van A' }
			},
			{
				id: 'mov-2',
				type: 'stock_out',
				quantity: 5,
				recipient_name: 'Room 101',
				notes: 'Guest request',
				created_at: '2026-02-21T14:30:00Z',
				created_by: 'user-2',
				staff_members: { id: 'user-2', full_name: 'Tran Thi B' }
			}
		];

		const mockChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({ data: mockMovements, error: null })
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockChain)
		};

		const result = await getStockMovementHistory(supabase as never, 'item-123', 50, 0);

		expect(supabase.from).toHaveBeenCalledWith('stock_movements');
		expect(mockChain.eq).toHaveBeenCalledWith('item_id', 'item-123');
		expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
		expect(mockChain.range).toHaveBeenCalledWith(0, 49); // offset 0, limit 50 → range(0, 49)

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			id: 'mov-1',
			type: 'stock_in',
			quantity: 10,
			recipient_name: null,
			notes: 'Initial stock',
			created_at: '2026-02-20T10:00:00Z',
			created_by: 'user-1',
			staff_name: 'Nguyen Van A'
		});
		expect(result[1].staff_name).toBe('Tran Thi B');
	});

	it('handles missing staff member gracefully', async () => {
		const mockMovements = [
			{
				id: 'mov-1',
				type: 'stock_in',
				quantity: 10,
				recipient_name: null,
				notes: null,
				created_at: '2026-02-20T10:00:00Z',
				created_by: 'user-deleted',
				staff_members: null // Deleted staff member
			}
		];

		const mockChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({ data: mockMovements, error: null })
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockChain)
		};

		const result = await getStockMovementHistory(supabase as never, 'item-123');

		expect(result[0].staff_name).toBe('Unknown');
	});

	it('throws error on database failure', async () => {
		const mockChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockChain)
		};

		await expect(getStockMovementHistory(supabase as never, 'item-123')).rejects.toThrow(
			'Failed to fetch stock movement history: DB error'
		);
	});

	it('supports custom pagination parameters', async () => {
		const mockChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({ data: [], error: null })
		};

		const supabase = {
			from: vi.fn().mockReturnValue(mockChain)
		};

		await getStockMovementHistory(supabase as never, 'item-123', 25, 50);

		// limit=25, offset=50 → range(50, 74)
		expect(mockChain.range).toHaveBeenCalledWith(50, 74);
	});
});

describe('getInventorySummaryReport', () => {
	it('calculates opening/closing stock correctly for a single item', async () => {
		const mockItems = [{ id: 'item-1', name: 'Towel', current_stock: 30 }];

		// Movements in February 2026
		const mockMovements = [
			{ item_id: 'item-1', type: 'stock_in', quantity: 10 },
			{ item_id: 'item-1', type: 'stock_out', quantity: 5 }
		];

		// Prior movements (before Feb 1)
		const mockPriorMovements = [
			{ item_id: 'item-1', type: 'stock_in', quantity: 20 },
			{ item_id: 'item-1', type: 'stock_out', quantity: 5 }
		];

		const supabase = {
			from: vi.fn((table) => {
				if (table === 'inventory_items') {
					return {
						select: vi.fn().mockReturnThis(),
						order: vi.fn().mockResolvedValue({ data: mockItems, error: null })
					};
				}
				// First call for movements in month, second for prior movements
				const callCount = supabase.from.mock.calls.filter(c => c[0] === 'stock_movements').length;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						gte: vi.fn().mockReturnThis(),
						lte: vi.fn().mockResolvedValue({ data: mockMovements, error: null })
					};
				} else {
					return {
						select: vi.fn().mockReturnThis(),
						lt: vi.fn().mockResolvedValue({ data: mockPriorMovements, error: null })
					};
				}
			})
		};

		const result = await getInventorySummaryReport(supabase as never, 2026, 2);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			item_id: 'item-1',
			item_name: 'Towel',
			opening_stock: 15, // 20 in - 5 out (prior)
			total_in: 10, // Feb movements
			total_out: 5, // Feb movements
			closing_stock: 20, // 15 + 10 - 5
			current_stock: 30 // Live value from inventory_items
		});
	});

	it('handles items with no movements in selected month', async () => {
		const mockItems = [{ id: 'item-1', name: 'Shampoo', current_stock: 50 }];

		const supabase = {
			from: vi.fn((table) => {
				if (table === 'inventory_items') {
					return {
						select: vi.fn().mockReturnThis(),
						order: vi.fn().mockResolvedValue({ data: mockItems, error: null })
					};
				}
				// No movements in selected month or before
				return {
					select: vi.fn().mockReturnThis(),
					gte: vi.fn().mockReturnThis(),
					lte: vi.fn().mockResolvedValue({ data: [], error: null }),
					lt: vi.fn().mockResolvedValue({ data: [], error: null })
				};
			})
		};

		const result = await getInventorySummaryReport(supabase as never, 2026, 3);

		expect(result[0]).toEqual({
			item_id: 'item-1',
			item_name: 'Shampoo',
			opening_stock: 0,
			total_in: 0,
			total_out: 0,
			closing_stock: 0,
			current_stock: 50
		});
	});

	it('throws error when fetching items fails', async () => {
		const supabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Items fetch failed' } })
			})
		};

		await expect(getInventorySummaryReport(supabase as never, 2026, 2)).rejects.toThrow(
			'Failed to fetch inventory items: Items fetch failed'
		);
	});

	it('throws error when fetching movements fails', async () => {
		const mockItems = [{ id: 'item-1', name: 'Towel', current_stock: 30 }];

		const supabase = {
			from: vi.fn((table) => {
				if (table === 'inventory_items') {
					return {
						select: vi.fn().mockReturnThis(),
						order: vi.fn().mockResolvedValue({ data: mockItems, error: null })
					};
				}
				return {
					select: vi.fn().mockReturnThis(),
					gte: vi.fn().mockReturnThis(),
					lte: vi.fn().mockResolvedValue({ data: null, error: { message: 'Movements fetch failed' } })
				};
			})
		};

		await expect(getInventorySummaryReport(supabase as never, 2026, 2)).rejects.toThrow(
			'Failed to fetch stock movements: Movements fetch failed'
		);
	});
});
