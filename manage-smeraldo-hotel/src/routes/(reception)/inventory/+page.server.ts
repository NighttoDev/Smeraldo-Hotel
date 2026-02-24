import type { PageServerLoad, Actions } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	getAllInventoryItems,
	logStockIn,
	logStockOut,
	updateLowStockThreshold
} from '$lib/server/db/inventory';
import {
	StockInFormSchema,
	StockOutFormSchema,
	UpdateThresholdFormSchema
} from '$lib/db/schemas/inventory';
import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await getAllInventoryItems(locals.supabase);

	const stockInForm = await superValidate(zod4(StockInFormSchema));
	const stockOutForm = await superValidate(zod4(StockOutFormSchema));
	const thresholdForm = await superValidate(zod4(UpdateThresholdFormSchema));

	return {
		items,
		role: locals.userRole,
		stockInForm,
		stockOutForm,
		thresholdForm
	};
};

/**
 * Helper to get item name by ID without fetching all items
 */
async function getItemName(supabase: SupabaseClient, itemId: string): Promise<string> {
	const { data } = await supabase
		.from('inventory_items')
		.select('name')
		.eq('id', itemId)
		.single();
	return data?.name || 'sản phẩm';
}

export const actions: Actions = {
	stockIn: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(StockInFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Session validation
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { form, message: 'Phiên đăng nhập hết hạn' });
		}

		// RBAC validation - only manager and reception can manage inventory
		if (!locals.userRole || !['manager', 'reception'].includes(locals.userRole)) {
			return fail(403, { form, message: 'Không có quyền quản lý kho hàng' });
		}

		try {
			const { item_id, quantity, notes } = form.data;

			await logStockIn(
				locals.supabase,
				item_id,
				quantity,
				notes || null,
				user.id
			);

			// Optimized: fetch only the item name needed for success message
			const itemName = await getItemName(locals.supabase, item_id);

			return {
				form,
				message: `Đã nhập kho ${quantity} ${itemName}`
			};
		} catch (err) {
			const error = err as Error;
			return fail(500, {
				form,
				message: `Lỗi hệ thống: ${error.message}`
			});
		}
	},

	stockOut: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(StockOutFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Session validation
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { form, message: 'Phiên đăng nhập hết hạn' });
		}

		// RBAC validation - only manager and reception can manage inventory
		if (!locals.userRole || !['manager', 'reception'].includes(locals.userRole)) {
			return fail(403, { form, message: 'Không có quyền quản lý kho hàng' });
		}

		try {
			const { item_id, quantity, recipient_name, notes } = form.data;

			await logStockOut(
				locals.supabase,
				item_id,
				quantity,
				recipient_name,
				notes || null,
				user.id
			);

			// Optimized: fetch only the item name needed for success message
			const itemName = await getItemName(locals.supabase, item_id);

			return {
				form,
				message: `Đã xuất kho ${quantity} ${itemName} cho ${recipient_name}`
			};
		} catch (err) {
			const error = err as Error;

			// Check for insufficient stock error
			if (error.message.includes('Không đủ hàng tồn kho')) {
				return fail(400, {
					form,
					message: error.message
				});
			}

			return fail(500, {
				form,
				message: `Lỗi hệ thống: ${error.message}`
			});
		}
	},

	updateThreshold: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(UpdateThresholdFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Session validation
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { form, message: 'Phiên đăng nhập hết hạn' });
		}

		// RBAC validation - manager-only
		if (locals.userRole !== 'manager') {
			return fail(403, { form, message: 'Chỉ quản lý mới có quyền chỉnh sửa ngưỡng' });
		}

		try {
			const { item_id, threshold } = form.data;

			await updateLowStockThreshold(locals.supabase, item_id, threshold);

			// Fetch item name for success message
			const itemName = await getItemName(locals.supabase, item_id);

			return {
				form,
				message: `Đã cập nhật ngưỡng cho ${itemName}`
			};
		} catch (err) {
			const error = err as Error;
			return fail(500, {
				form,
				message: `Lỗi hệ thống: ${error.message}`
			});
		}
	}
};
