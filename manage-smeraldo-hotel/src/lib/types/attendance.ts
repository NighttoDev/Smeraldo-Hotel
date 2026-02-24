export interface AttendanceLogRow {
	id: string;
	staff_id: string;
	log_date: string;
	shift_value: number;
	logged_by: string;
	created_at: string | null;
	updated_at: string | null;
	shift_started_at: string | null;
	shift_ended_at: string | null;
	notes: string | null;
}

export interface AttendanceWithStaff extends AttendanceLogRow {
	staff_members: { full_name: string }[] | { full_name: string } | null;
}

export interface ActiveStaffMember {
	id: string;
	full_name: string;
	role: string;
}
