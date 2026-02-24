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
