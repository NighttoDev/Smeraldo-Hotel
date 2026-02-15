import { z } from 'zod';

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
	check_in_date: z.coerce.date(),
	check_out_date: z.coerce.date(),
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
	log_date: z.coerce.date(),
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
	movement_date: z.coerce.date(),
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
