import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getActiveStaff, getAttendanceByMonth, upsertAttendanceLog, startShift as dbStartShift, endShift as dbEndShift, getActiveShift } from '$lib/server/db/attendance';

/** Get today's date in Vietnam timezone (YYYY-MM-DD). */
function getTodayVN(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Ho_Chi_Minh',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
}

const LogAttendanceSchema = z.object({
	staff_id: z.string().uuid(),
	log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
	shift_value: z.coerce
		.number()
		.refine((v) => [0, 0.5, 1, 1.5].includes(v), {
			message: 'shift_value must be 0, 0.5, 1, or 1.5'
		})
});

const StartShiftSchema = z.object({
	staff_id: z.string().uuid()
});

const EndShiftSchema = z.object({
	notes: z.string().optional()
});

export const load: PageServerLoad = async ({ locals, url }) => {
	const now = new Date();
	const year = Number(url.searchParams.get('year')) || now.getFullYear();
	const month = Number(url.searchParams.get('month')) || now.getMonth() + 1;

	const { user } = await locals.safeGetSession();

	const [staff, logs, attendanceForm, startShiftForm, endShiftForm] = await Promise.all([
		getActiveStaff(locals.supabase),
		getAttendanceByMonth(locals.supabase, year, month),
		superValidate(zod4(LogAttendanceSchema)),
		superValidate(zod4(StartShiftSchema)),
		superValidate(zod4(EndShiftSchema))
	]);

	// Get active shift and current staff member info for current user
	let activeShift = null;
	let currentStaffMember = null;
	if (user) {
		const staffMember = staff.find((s) => s.id === user.id);
		if (staffMember) {
			currentStaffMember = staffMember;
			activeShift = await getActiveShift(locals.supabase, user.id);
		}
	}

	return {
		staff,
		logs,
		attendanceForm,
		startShiftForm,
		endShiftForm,
		activeShift,
		currentStaffMember,
		year,
		month,
		role: locals.userRole,
		todayVN: getTodayVN()
	};
};

export const actions: Actions = {
	logAttendance: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(LogAttendanceSchema));

		if (!form.valid) {
			return fail(400, { attendanceForm: form });
		}

		const { user } = await locals.safeGetSession();
		if (!user) return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });

		// Explicit role gate — only manager and reception can write attendance
		if (!locals.userRole || !['manager', 'reception'].includes(locals.userRole)) {
			return message(form, { type: 'error', text: 'Không có quyền chấm công' }, { status: 403 });
		}

		const { staff_id, log_date, shift_value } = form.data;
		const isManager = locals.userRole === 'manager';

		// RBAC: reception can only write today's date (Vietnam timezone); manager can write any date
		if (!isManager) {
			const todayVN = getTodayVN();
			if (log_date !== todayVN) {
				return message(form, { type: 'error', text: 'Lễ tân chỉ được chấm công ngày hôm nay' }, { status: 403 });
			}
		}

		try {
			await upsertAttendanceLog(locals.supabase, staff_id, log_date, shift_value, user.id, isManager);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể lưu chấm công';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Đã lưu chấm công' });
	},

	startShift: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(StartShiftSchema));

		if (!form.valid) {
			return fail(400, { startShiftForm: form });
		}

		const { user } = await locals.safeGetSession();
		if (!user) return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });

		// RBAC: Only reception and manager can start shifts
		if (!locals.userRole || !['manager', 'reception'].includes(locals.userRole)) {
			return message(form, { type: 'error', text: 'Không có quyền bắt đầu ca làm việc' }, { status: 403 });
		}

		const { staff_id } = form.data;

		// Check for existing active shift
		const existingShift = await getActiveShift(locals.supabase, staff_id);
		if (existingShift) {
			return message(form, { type: 'error', text: 'Ca làm việc đang hoạt động' }, { status: 409 });
		}

		const todayVN = getTodayVN();

		try {
			await dbStartShift(locals.supabase, staff_id, todayVN, user.id);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể bắt đầu ca làm việc';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Đã bắt đầu ca làm việc' });
	},

	endShift: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(EndShiftSchema));

		if (!form.valid) {
			return fail(400, { endShiftForm: form });
		}

		const { user } = await locals.safeGetSession();
		if (!user) return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });

		// RBAC: Only reception and manager can end shifts
		if (!locals.userRole || !['manager', 'reception'].includes(locals.userRole)) {
			return message(form, { type: 'error', text: 'Không có quyền kết thúc ca làm việc' }, { status: 403 });
		}

		// Get active shift for current user
		const activeShift = await getActiveShift(locals.supabase, user.id);
		if (!activeShift) {
			return message(form, { type: 'error', text: 'Không tìm thấy ca làm việc đang hoạt động' }, { status: 404 });
		}

		const { notes } = form.data;

		try {
			await dbEndShift(locals.supabase, activeShift.id, notes);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Không thể kết thúc ca làm việc';
			return message(form, { type: 'error', text: errorMessage }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Đã kết thúc ca làm việc' });
	}
};
