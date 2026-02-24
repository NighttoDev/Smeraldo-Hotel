import { z } from 'zod';

// ── Shared Validators ─────────────────────────────────────────────────────────

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date string');

// ── Enum Schemas ──────────────────────────────────────────────────────────────

export const StaffRoleSchema = z.enum(['manager', 'reception', 'housekeeping']);

export const RoomStatusSchema = z.enum([
	'available',
	'occupied',
	'checking_out_today',
	'being_cleaned',
	'ready'
]);

export const BookingSourceSchema = z.enum([
	'agoda',
	'booking_com',
	'trip_com',
	'facebook',
	'walk_in'
]);

export const MovementTypeSchema = z.enum(['stock_in', 'stock_out']);

// ── Table Schemas ─────────────────────────────────────────────────────────────

export const StaffMemberSchema = z.object({
	id: z.string().uuid(),
	full_name: z.string().min(1),
	role: StaffRoleSchema,
	is_active: z.boolean().optional().default(true),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional()
});

export const RoomSchema = z.object({
	id: z.string().uuid().optional(),
	room_number: z.string().min(1),
	floor: z.number().int(),
	room_type: z.string().min(1),
	status: RoomStatusSchema.optional().default('available'),
	current_guest_name: z.string().nullable().optional(),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional()
});

export const GuestSchema = z.object({
	id: z.string().uuid().optional(),
	full_name: z.string().min(1),
	phone: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	notes: z.string().nullable().optional(),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional()
});

export const BookingSchema = z.object({
	id: z.string().uuid().optional(),
	room_id: z.string().uuid(),
	guest_id: z.string().uuid(),
	check_in_date: DateString,
	check_out_date: DateString,
	nights_count: z.number().int().optional(),
	booking_source: BookingSourceSchema.nullable().optional(),
	status: z.string().optional().default('confirmed'),
	created_by: z.string().uuid().nullable().optional(),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional()
});

export const AttendanceLogSchema = z.object({
	id: z.string().uuid().optional(),
	staff_id: z.string().uuid(),
	log_date: DateString,
	shift_value: z
		.number()
		.refine((v) => [0, 0.5, 1, 1.5].includes(v), {
			message: 'shift_value must be 0, 0.5, 1, or 1.5'
		}),
	logged_by: z.string().uuid(),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional()
});

export const InventoryItemSchema = z.object({
	id: z.string().uuid().optional(),
	name: z.string().min(1),
	category: z.string().min(1),
	current_stock: z.number().int().optional().default(0),
	low_stock_threshold: z.number().int().optional().default(5),
	unit: z.string().optional().default('units'),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional()
});

export const StockMovementSchema = z.object({
	id: z.string().uuid().optional(),
	item_id: z.string().uuid(),
	movement_type: MovementTypeSchema,
	quantity: z.number().int(),
	recipient_name: z.string().nullable().optional(),
	logged_by: z.string().uuid(),
	movement_date: DateString,
	created_at: z.string().datetime().optional()
});

export const RoomStatusLogSchema = z.object({
	id: z.string().uuid().optional(),
	room_id: z.string().uuid(),
	previous_status: RoomStatusSchema.nullable().optional(),
	new_status: RoomStatusSchema,
	changed_by: z.string().uuid(),
	changed_at: z.string().datetime().optional(),
	notes: z.string().nullable().optional()
});

// ── Shared Interface Types ─────────────────────────────────────────────────────
// Defined here (not in $lib/server/) so both server files and .svelte components
// can import them without violating the server-only boundary.

/** A booking row joined with its guest record (via Supabase FK join). */
export interface BookingWithGuest {
	id: string;
	room_id: string;
	guest_id: string;
	check_in_date: string;
	check_out_date: string;
	nights_count: number;
	booking_source: BookingSource | null;
	status: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	guest: {
		id: string;
		full_name: string;
	};
}

/** Booking list row with joined guest + room data for bookings index page. */
export interface BookingListItem {
	id: string;
	room_id: string;
	guest_id: string;
	check_in_date: string;
	check_out_date: string;
	nights_count: number;
	booking_source: BookingSource | null;
	status: string;
	created_at: string;
	guest: {
		id: string;
		full_name: string;
	};
	room: {
		id: string;
		room_number: string;
		floor: number;
	};
}

/** Booking detail row with guest + room data for booking detail page. */
export interface BookingDetail {
	id: string;
	room_id: string;
	guest_id: string;
	check_in_date: string;
	check_out_date: string;
	nights_count: number;
	booking_source: BookingSource | null;
	status: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	guest: {
		id: string;
		full_name: string;
	};
	room: {
		id: string;
		room_number: string;
		floor: number;
		room_type: string;
		status: RoomStatus;
	};
}

// ── Inferred Types ────────────────────────────────────────────────────────────

export type StaffRole = z.infer<typeof StaffRoleSchema>;
export type RoomStatus = z.infer<typeof RoomStatusSchema>;
export type BookingSource = z.infer<typeof BookingSourceSchema>;
export type MovementType = z.infer<typeof MovementTypeSchema>;

export type StaffMember = z.infer<typeof StaffMemberSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Guest = z.infer<typeof GuestSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type AttendanceLog = z.infer<typeof AttendanceLogSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type StockMovement = z.infer<typeof StockMovementSchema>;
export type RoomStatusLog = z.infer<typeof RoomStatusLogSchema>;

// ── Form Schemas (for Superforms validation) ──────────────────────────────────

// ── Check-In Form Schema (for Superforms validation) ─────────────────────────

export const CheckInSchema = z.object({
	booking_id: z.string().uuid({ error: 'Booking ID không hợp lệ' }),
	room_id: z.string().uuid({ error: 'Room ID không hợp lệ' }),
	guest_id: z.string().uuid({ error: 'Guest ID không hợp lệ' }),
	guest_name: z.string().min(1, { error: 'Tên khách không được để trống' }),
	check_in_date: DateString,
	check_out_date: DateString
});

export type CheckIn = z.infer<typeof CheckInSchema>;

// ── Check-Out Form Schema (for Superforms validation) ────────────────────────

export const CheckOutSchema = z.object({
	booking_id: z.string().uuid({ error: 'Booking ID không hợp lệ' }),
	room_id: z.string().uuid({ error: 'Room ID không hợp lệ' }),
});

export type CheckOut = z.infer<typeof CheckOutSchema>;

// ── Booking Edit/Cancel Form Schemas (for Superforms validation) ─────────────

export const UpdateBookingFormSchema = z
	.object({
		booking_id: z.string().uuid({ error: 'Booking ID không hợp lệ' }),
		guest_id: z.string().uuid({ error: 'Guest ID không hợp lệ' }),
		guest_name: z.string().min(1, { error: 'Tên khách không được để trống' }),
		room_id: z.string().uuid({ error: 'Vui lòng chọn phòng' }),
		check_in_date: DateString,
		check_out_date: DateString,
		booking_source: BookingSourceSchema,
		is_long_stay: z.boolean().optional().default(false),
		duration_days: z.number().int().min(30, { error: 'Thời gian lưu trú phải ít nhất 30 ngày' }).optional()
	})
	.refine(
		(data) => {
			if (data.is_long_stay) {
				return (data.duration_days ?? 0) >= 30;
			}
			return data.check_out_date > data.check_in_date;
		},
		{
			error: 'Ngày check-out phải sau ngày check-in (hoặc thời gian lưu trú phải ≥ 30 ngày)',
			path: ['check_out_date']
		}
	);

export type UpdateBookingForm = z.infer<typeof UpdateBookingFormSchema>;

export const CancelBookingSchema = z.object({
	booking_id: z.string().uuid({ error: 'Booking ID không hợp lệ' }),
	room_id: z.string().uuid({ error: 'Room ID không hợp lệ' }),
	guest_name: z.string().min(1, { error: 'Tên khách không hợp lệ' })
});

export type CancelBooking = z.infer<typeof CancelBookingSchema>;

// ── Booking Form Schema (for Superforms validation) ───────────────────────────

export const CreateBookingFormSchema = z
	.object({
		guest_name: z.string().min(1, { error: 'Tên khách không được để trống' }),
		room_id: z.string().uuid({ error: 'Vui lòng chọn phòng' }),
		check_in_date: DateString,
		check_out_date: DateString,
		booking_source: BookingSourceSchema,
		is_long_stay: z.boolean().optional().default(false),
		duration_days: z.number().int().min(30, { error: 'Thời gian lưu trú phải ít nhất 30 ngày' }).optional()
	})
	.refine(
		(data) => {
			if (data.is_long_stay) {
				return (data.duration_days ?? 0) >= 30;
			}
			return data.check_out_date > data.check_in_date;
		},
		{
			error: 'Ngày check-out phải sau ngày check-in (hoặc thời gian lưu trú phải ≥ 30 ngày)',
			path: ['check_out_date']
		}
	);

export type CreateBookingForm = z.infer<typeof CreateBookingFormSchema>;

export const CreateStaffSchema = z.object({
	full_name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
	email: z.string().email('Email không hợp lệ'),
	password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
	role: StaffRoleSchema
});

export const UpdateStaffSchema = z.object({
	full_name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
	role: StaffRoleSchema,
	is_active: z.boolean()
});
