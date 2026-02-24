import { describe, it, expect } from 'vitest';
import {
	AttendanceLogSchema,
	CheckInSchema,
	CheckOutSchema,
	CreateBookingFormSchema,
	CreateStaffSchema,
	UpdateStaffSchema,
	UpdateBookingFormSchema,
	CancelBookingSchema
} from './schema';

// ── CreateStaffSchema ─────────────────────────────────────────────────────────

describe('CreateStaffSchema', () => {
	it('accepts valid data', () => {
		const result = CreateStaffSchema.safeParse({
			full_name: 'Nguyễn Văn A',
			email: 'nva@smeraldo.vn',
			password: 'password123',
			role: 'manager'
		});
		expect(result.success).toBe(true);
	});

	it('rejects password shorter than 8 characters', () => {
		const result = CreateStaffSchema.safeParse({
			full_name: 'Test User',
			email: 'test@test.com',
			password: 'short',
			role: 'reception'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const passwordError = result.error.issues.find((e) => e.path[0] === 'password');
			expect(passwordError).toBeDefined();
			expect(passwordError?.message).toContain('8 ký tự');
		}
	});

	it('rejects invalid email format', () => {
		const result = CreateStaffSchema.safeParse({
			full_name: 'Test User',
			email: 'not-an-email',
			password: 'validpassword',
			role: 'reception'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const emailError = result.error.issues.find((e) => e.path[0] === 'email');
			expect(emailError).toBeDefined();
		}
	});

	it('rejects invalid role value', () => {
		const result = CreateStaffSchema.safeParse({
			full_name: 'Test User',
			email: 'test@test.com',
			password: 'validpassword',
			role: 'admin' // not a valid role
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const roleError = result.error.issues.find((e) => e.path[0] === 'role');
			expect(roleError).toBeDefined();
		}
	});

	it('rejects full_name shorter than 2 characters', () => {
		const result = CreateStaffSchema.safeParse({
			full_name: 'A',
			email: 'test@test.com',
			password: 'validpassword',
			role: 'reception'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((e) => e.path[0] === 'full_name');
			expect(nameError).toBeDefined();
		}
	});

	it('accepts all three valid roles', () => {
		const roles = ['manager', 'reception', 'housekeeping'] as const;
		roles.forEach((role) => {
			const result = CreateStaffSchema.safeParse({
				full_name: 'Test User',
				email: 'test@test.com',
				password: 'validpassword',
				role
			});
			expect(result.success).toBe(true);
		});
	});
});

// ── UpdateStaffSchema ─────────────────────────────────────────────────────────

describe('UpdateStaffSchema', () => {
	it('accepts valid update data', () => {
		const result = UpdateStaffSchema.safeParse({
			full_name: 'Trần Thị B',
			role: 'housekeeping',
			is_active: false
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.is_active).toBe(false);
		}
	});

	it('accepts is_active = true', () => {
		const result = UpdateStaffSchema.safeParse({
			full_name: 'Valid Name',
			role: 'reception',
			is_active: true
		});
		expect(result.success).toBe(true);
	});

	it('rejects full_name shorter than 2 characters', () => {
		const result = UpdateStaffSchema.safeParse({
			full_name: 'X',
			role: 'reception',
			is_active: true
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid role', () => {
		const result = UpdateStaffSchema.safeParse({
			full_name: 'Valid Name',
			role: 'superadmin',
			is_active: true
		});
		expect(result.success).toBe(false);
	});
});

// ── AttendanceLogSchema ───────────────────────────────────────────────────────

describe('AttendanceLogSchema', () => {
	it('accepts valid shift values (0, 0.5, 1, 1.5)', () => {
		const validValues = [0, 0.5, 1, 1.5];
		validValues.forEach((shift_value) => {
			const result = AttendanceLogSchema.safeParse({
				staff_id: '550e8400-e29b-41d4-a716-446655440000',
				log_date: '2026-02-15',
				shift_value,
				logged_by: '550e8400-e29b-41d4-a716-446655440001'
			});
			expect(result.success, `shift_value ${shift_value} should be valid`).toBe(true);
		});
	});

	it('rejects invalid shift values', () => {
		const invalidValues = [2, -1, 0.3, 0.7, 3, -0.5];
		invalidValues.forEach((shift_value) => {
			const result = AttendanceLogSchema.safeParse({
				staff_id: '550e8400-e29b-41d4-a716-446655440000',
				log_date: '2026-02-15',
				shift_value,
				logged_by: '550e8400-e29b-41d4-a716-446655440001'
			});
			expect(result.success, `shift_value ${shift_value} should be invalid`).toBe(false);
		});
	});

	it('rejects invalid date format', () => {
		const result = AttendanceLogSchema.safeParse({
			staff_id: '550e8400-e29b-41d4-a716-446655440000',
			log_date: '15/02/2026',
			shift_value: 1,
			logged_by: '550e8400-e29b-41d4-a716-446655440001'
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid UUID for staff_id', () => {
		const result = AttendanceLogSchema.safeParse({
			staff_id: 'not-a-uuid',
			log_date: '2026-02-15',
			shift_value: 1,
			logged_by: '550e8400-e29b-41d4-a716-446655440001'
		});
		expect(result.success).toBe(false);
	});
});

// ── CreateBookingFormSchema ───────────────────────────────────────────────────

describe('CreateBookingFormSchema', () => {
	const validBase = {
		guest_name: 'Nguyễn Văn A',
		room_id: '550e8400-e29b-41d4-a716-446655440000',
		check_in_date: '2026-03-01',
		check_out_date: '2026-03-05',
		booking_source: 'agoda' as const,
		is_long_stay: false
	};

	it('accepts a valid OTA booking', () => {
		const result = CreateBookingFormSchema.safeParse(validBase);
		expect(result.success).toBe(true);
	});

	it('accepts a valid walk-in booking', () => {
		const result = CreateBookingFormSchema.safeParse({
			...validBase,
			booking_source: 'walk_in',
			guest_name: 'Trần Thị B'
		});
		expect(result.success).toBe(true);
	});

	it('rejects when check_out_date is before check_in_date', () => {
		const result = CreateBookingFormSchema.safeParse({
			...validBase,
			check_in_date: '2026-03-10',
			check_out_date: '2026-03-05'
		});
		expect(result.success).toBe(false);
	});

	it('rejects when check_out_date equals check_in_date', () => {
		const result = CreateBookingFormSchema.safeParse({
			...validBase,
			check_in_date: '2026-03-05',
			check_out_date: '2026-03-05'
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty guest_name', () => {
		const result = CreateBookingFormSchema.safeParse({ ...validBase, guest_name: '' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid room_id (not a UUID)', () => {
		const result = CreateBookingFormSchema.safeParse({ ...validBase, room_id: 'not-a-uuid' });
		expect(result.success).toBe(false);
	});

	it('accepts long-stay with duration_days >= 30', () => {
		const result = CreateBookingFormSchema.safeParse({
			...validBase,
			is_long_stay: true,
			duration_days: 30
		});
		expect(result.success).toBe(true);
	});

	it('rejects long-stay with duration_days < 30', () => {
		const result = CreateBookingFormSchema.safeParse({
			...validBase,
			is_long_stay: true,
			duration_days: 15
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid booking_source', () => {
		const result = CreateBookingFormSchema.safeParse({
			...validBase,
			booking_source: 'airbnb' as never
		});
		expect(result.success).toBe(false);
	});
});

// ── CheckInSchema ─────────────────────────────────────────────────────────────

describe('CheckInSchema', () => {
	const validCheckIn = {
		booking_id: '550e8400-e29b-41d4-a716-446655440000',
		room_id: '550e8400-e29b-41d4-a716-446655440001',
		guest_id: '550e8400-e29b-41d4-a716-446655440002',
		guest_name: 'Nguyễn Văn A',
		check_in_date: '2026-02-16',
		check_out_date: '2026-02-18'
	};

	it('accepts valid check-in data', () => {
		const result = CheckInSchema.safeParse(validCheckIn);
		expect(result.success).toBe(true);
	});

	it('rejects empty guest_name', () => {
		const result = CheckInSchema.safeParse({ ...validCheckIn, guest_name: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === 'guest_name');
			expect(err).toBeDefined();
		}
	});

	it('rejects invalid booking_id UUID', () => {
		const result = CheckInSchema.safeParse({ ...validCheckIn, booking_id: 'not-a-uuid' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === 'booking_id');
			expect(err).toBeDefined();
		}
	});

	it('rejects invalid room_id UUID', () => {
		const result = CheckInSchema.safeParse({ ...validCheckIn, room_id: 'not-a-uuid' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === 'room_id');
			expect(err).toBeDefined();
		}
	});

	it('rejects invalid guest_id UUID', () => {
		const result = CheckInSchema.safeParse({ ...validCheckIn, guest_id: 'not-a-uuid' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === 'guest_id');
			expect(err).toBeDefined();
		}
	});

	it('rejects invalid check_in_date format', () => {
		const result = CheckInSchema.safeParse({ ...validCheckIn, check_in_date: '16/02/2026' });
		expect(result.success).toBe(false);
	});
});

// ── CheckOutSchema ────────────────────────────────────────────────────────────

describe('CheckOutSchema', () => {
	it('accepts valid booking_id and room_id', () => {
		const result = CheckOutSchema.safeParse({
			booking_id: '550e8400-e29b-41d4-a716-446655440000',
			room_id: '550e8400-e29b-41d4-a716-446655440001'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing booking_id', () => {
		const result = CheckOutSchema.safeParse({
			room_id: '550e8400-e29b-41d4-a716-446655440001'
		});
		expect(result.success).toBe(false);
	});

	it('rejects non-UUID booking_id', () => {
		const result = CheckOutSchema.safeParse({
			booking_id: 'not-a-uuid',
			room_id: '550e8400-e29b-41d4-a716-446655440001'
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing room_id', () => {
		const result = CheckOutSchema.safeParse({
			booking_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(false);
	});

	it('rejects non-UUID room_id', () => {
		const result = CheckOutSchema.safeParse({
			booking_id: '550e8400-e29b-41d4-a716-446655440000',
			room_id: 'invalid'
		});
		expect(result.success).toBe(false);
	});
});

// ── UpdateBookingFormSchema ────────────────────────────────────────────────────

describe('UpdateBookingFormSchema', () => {
	const validBase = {
		booking_id: '550e8400-e29b-41d4-a716-446655440010',
		guest_id: '550e8400-e29b-41d4-a716-446655440011',
		guest_name: 'Nguyễn Văn A',
		room_id: '550e8400-e29b-41d4-a716-446655440012',
		check_in_date: '2026-03-01',
		check_out_date: '2026-03-05',
		booking_source: 'agoda' as const,
		is_long_stay: false
	};

	it('accepts valid edit payload', () => {
		expect(UpdateBookingFormSchema.safeParse(validBase).success).toBe(true);
	});

	it('rejects invalid guest_id', () => {
		expect(UpdateBookingFormSchema.safeParse({ ...validBase, guest_id: 'x' }).success).toBe(false);
	});

	it('rejects invalid date range', () => {
		expect(
			UpdateBookingFormSchema.safeParse({
				...validBase,
				check_in_date: '2026-03-10',
				check_out_date: '2026-03-05'
			}).success
		).toBe(false);
	});

	it('accepts long-stay with duration_days >= 30', () => {
		expect(
			UpdateBookingFormSchema.safeParse({
				...validBase,
				is_long_stay: true,
				duration_days: 45
			}).success
		).toBe(true);
	});
});

// ── CancelBookingSchema ────────────────────────────────────────────────────────

describe('CancelBookingSchema', () => {
	it('accepts valid cancel payload', () => {
		expect(
			CancelBookingSchema.safeParse({
				booking_id: '550e8400-e29b-41d4-a716-446655440000',
				room_id: '550e8400-e29b-41d4-a716-446655440001',
				guest_name: 'Nguyễn Văn A'
			}).success
		).toBe(true);
	});

	it('rejects invalid IDs', () => {
		expect(
			CancelBookingSchema.safeParse({ booking_id: 'x', room_id: 'y', guest_name: 'A' }).success
		).toBe(false);
	});
});
