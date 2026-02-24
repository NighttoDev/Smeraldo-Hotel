import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';
import { load } from './+page.server';

// Mock SvelteKit error function
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status: number, message: string) => {
		throw { status, message };
	})
}));

// Mock inventory database function
vi.mock('$lib/server/db/inventory', () => ({
	getInventorySummaryReport: vi.fn().mockResolvedValue([
		{
			item_id: 'item-1',
			item_name: 'Towel',
			opening_stock: 10,
			total_in: 5,
			total_out: 3,
			closing_stock: 12,
			current_stock: 15
		}
	])
}));

describe('inventory-report +page.server (RBAC)', () => {
	const mockUrl = new URL('http://localhost:5173/inventory-report');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('allows manager to access inventory report', async () => {
		const mockLocals = {
			safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
			userRole: 'manager',
			supabase: {} as never
		};

		const result = (await load({
			url: mockUrl,
			locals: mockLocals as never
		} as never)) as { report: unknown[]; year: number; month: number };

		expect(mockLocals.safeGetSession).toHaveBeenCalled();
		expect(result).toHaveProperty('report');
		expect(result).toHaveProperty('year');
		expect(result).toHaveProperty('month');
		expect(Array.isArray(result.report)).toBe(true);
	});

	it('blocks reception user with 403 error', async () => {
		const mockLocals = {
			safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
			userRole: 'reception',
			supabase: {} as never
		};

		await expect(
			load({
				url: mockUrl,
				locals: mockLocals as never
			} as never)
		).rejects.toMatchObject({
			status: 403,
			message: 'Chỉ quản lý mới có quyền xem báo cáo'
		});

		expect(error).toHaveBeenCalledWith(403, 'Chỉ quản lý mới có quyền xem báo cáo');
	});

	it('blocks housekeeping user with 403 error', async () => {
		const mockLocals = {
			safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
			userRole: 'housekeeping',
			supabase: {} as never
		};

		await expect(
			load({
				url: mockUrl,
				locals: mockLocals as never
			} as never)
		).rejects.toMatchObject({
			status: 403,
			message: 'Chỉ quản lý mới có quyền xem báo cáo'
		});
	});

	it('blocks unauthenticated user with 401 error', async () => {
		const mockLocals = {
			safeGetSession: vi.fn().mockResolvedValue({ user: null }),
			userRole: '',
			supabase: {} as never
		};

		await expect(
			load({
				url: mockUrl,
				locals: mockLocals as never
			} as never)
		).rejects.toMatchObject({
			status: 401,
			message: 'Phiên đăng nhập hết hạn'
		});

		expect(error).toHaveBeenCalledWith(401, 'Phiên đăng nhập hết hạn');
	});

	it('parses year and month from query params', async () => {
		const urlWithParams = new URL('http://localhost:5173/inventory-report?year=2025&month=5');
		const mockLocals = {
			safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
			userRole: 'manager',
			supabase: {} as never
		};

		const result = (await load({
			url: urlWithParams,
			locals: mockLocals as never
		} as never)) as { year: number; month: number };

		expect(result.year).toBe(2025);
		expect(result.month).toBe(5);
	});

	it('defaults to current month when query params are missing', async () => {
		const mockLocals = {
			safeGetSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
			userRole: 'manager',
			supabase: {} as never
		};

		const result = (await load({
			url: mockUrl,
			locals: mockLocals as never
		} as never)) as { year: number; month: number };

		// Should default to current year/month (we can't assert exact values since they change)
		expect(typeof result.year).toBe('number');
		expect(typeof result.month).toBe('number');
		expect(result.year).toBeGreaterThan(2020);
		expect(result.month).toBeGreaterThanOrEqual(1);
		expect(result.month).toBeLessThanOrEqual(12);
	});
});
