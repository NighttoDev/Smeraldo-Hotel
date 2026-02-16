// Server-only — never import from .svelte components
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttendanceLogRow, AttendanceWithStaff, ActiveStaffMember } from '$lib/types/attendance';

export type { AttendanceLogRow, AttendanceWithStaff, ActiveStaffMember };

/**
 * Fetch all attendance logs for a given month, joined with staff name.
 * Returns logs ordered by log_date ASC.
 */
export async function getAttendanceByMonth(
	supabase: SupabaseClient,
	year: number,
	month: number
): Promise<AttendanceWithStaff[]> {
	const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

	const { data, error } = await supabase
		.from('attendance_logs')
		.select('id, staff_id, log_date, shift_value, logged_by, created_at, updated_at, staff_members!attendance_logs_staff_id_fkey(full_name)')
		.gte('log_date', startDate)
		.lte('log_date', endDate)
		.order('log_date', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch attendance logs: ${error.message}`);
	}

	return (data ?? []) as AttendanceWithStaff[];
}

/**
 * Insert an attendance log entry. If a record already exists for the same
 * staff_id + log_date, uses upsert (INSERT ... ON CONFLICT UPDATE).
 *
 * NOTE: RLS allows INSERT for reception+manager but UPDATE for manager only.
 * For reception re-entries on the same day, we use ignoreDuplicates to avoid
 * hitting the UPDATE policy. Managers use full upsert.
 */
export async function upsertAttendanceLog(
	supabase: SupabaseClient,
	staffId: string,
	logDate: string,
	shiftValue: number,
	loggedBy: string,
	isManager: boolean
): Promise<AttendanceLogRow> {
	if (isManager) {
		// Manager: full upsert (INSERT or UPDATE)
		const { data, error } = await supabase
			.from('attendance_logs')
			.upsert(
				{
					staff_id: staffId,
					log_date: logDate,
					shift_value: shiftValue,
					logged_by: loggedBy
				},
				{ onConflict: 'staff_id,log_date' }
			)
			.select()
			.single();

		if (error || !data) {
			throw new Error(error?.message ?? 'Failed to upsert attendance log');
		}

		return data as AttendanceLogRow;
	}

	// Reception: try INSERT first, then UPDATE on conflict
	// Step 1: Try insert with ignoreDuplicates
	const { data: inserted, error: insertError } = await supabase
		.from('attendance_logs')
		.insert({
			staff_id: staffId,
			log_date: logDate,
			shift_value: shiftValue,
			logged_by: loggedBy
		})
		.select()
		.single();

	if (!insertError && inserted) {
		return inserted as AttendanceLogRow;
	}

	// Step 2: Record exists — update it (reception updating same-day entry)
	const { data: updated, error: updateError } = await supabase
		.from('attendance_logs')
		.update({ shift_value: shiftValue, logged_by: loggedBy })
		.eq('staff_id', staffId)
		.eq('log_date', logDate)
		.select()
		.single();

	if (updateError || !updated) {
		throw new Error(updateError?.message ?? 'Failed to update attendance log');
	}

	return updated as AttendanceLogRow;
}

/**
 * Fetch all active staff members ordered by full_name.
 */
export async function getActiveStaff(
	supabase: SupabaseClient
): Promise<ActiveStaffMember[]> {
	const { data, error } = await supabase
		.from('staff_members')
		.select('id, full_name, role')
		.eq('is_active', true)
		.order('full_name', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch active staff: ${error.message}`);
	}

	return (data ?? []) as ActiveStaffMember[];
}
