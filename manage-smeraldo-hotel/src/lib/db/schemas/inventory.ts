import { z } from 'zod';

/**
 * Stock-in form validation schema
 * Used when logging new inventory items received
 */
export const StockInFormSchema = z.object({
	item_id: z.string().uuid({ message: 'Mã vật tư không hợp lệ' }),
	quantity: z.coerce
		.number({ message: 'Số lượng phải là số' })
		.int({ message: 'Số lượng phải là số nguyên' })
		.positive({ message: 'Số lượng phải lớn hơn 0' }),
	notes: z.string().max(500, { message: 'Ghi chú không được quá 500 ký tự' }).optional()
});

export type StockInFormData = z.infer<typeof StockInFormSchema>;

/**
 * Stock-out form validation schema
 * Used when logging inventory items given to guests or staff
 */
export const StockOutFormSchema = z.object({
	item_id: z.string().uuid({ message: 'Mã vật tư không hợp lệ' }),
	quantity: z.coerce
		.number({ message: 'Số lượng phải là số' })
		.int({ message: 'Số lượng phải là số nguyên' })
		.positive({ message: 'Số lượng phải lớn hơn 0' }),
	recipient_name: z
		.string()
		.min(1, { message: 'Tên người nhận không được để trống' })
		.max(100, { message: 'Tên người nhận không được quá 100 ký tự' }),
	notes: z.string().max(500, { message: 'Ghi chú không được quá 500 ký tự' }).optional()
});

export type StockOutFormData = z.infer<typeof StockOutFormSchema>;

/**
 * Update threshold form validation schema
 * Used when manager updates low-stock threshold for a product
 */
export const UpdateThresholdFormSchema = z.object({
	item_id: z.string().uuid({ message: 'Mã vật tư không hợp lệ' }),
	threshold: z.coerce
		.number({ message: 'Ngưỡng phải là số' })
		.int({ message: 'Ngưỡng phải là số nguyên' })
		.nonnegative({ message: 'Ngưỡng không được âm' })
});

export type UpdateThresholdFormData = z.infer<typeof UpdateThresholdFormSchema>;
