// Reports types — Story 6.2+

export interface DailyOccupancy {
	date: string; // YYYY-MM-DD
	occupiedCount: number;
	percentage: number; // 0-100, e.g. 82.6
}

export interface OccupancyReportData {
	dailyBreakdown: DailyOccupancy[];
	totalRoomNights: number;
	avgDailyOccupancy: number; // percentage 0-100
	peakDay: DailyOccupancy | null; // day with highest occupancy
	quietDay: DailyOccupancy | null; // day with lowest occupancy
	totalRooms: number; // actual room count from database
}

// Story 6.3: Monthly Attendance Report types
export interface StaffAttendanceSummary {
	staffId: string;
	fullName: string;
	role: string;
	dailyShifts: Map<string, number>; // Map<day (1-31 as string), shift_value>
	totalDays: number; // sum of all shift_value for the month
}

export interface AttendanceReportData {
	staffSummary: StaffAttendanceSummary[];
}
