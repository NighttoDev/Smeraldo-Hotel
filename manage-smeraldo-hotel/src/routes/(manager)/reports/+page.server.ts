import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getMonthlyOccupancyReport, getMonthlyAttendanceReport } from '$lib/server/db/reports';
import { getInventorySummaryReport } from '$lib/server/db/inventory';

export const load: PageServerLoad = async ({ url, locals }) => {
	try {
		// Get year and month from URL query params, default to current month (Vietnam timezone)
		const now = new Date();
		const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
		const nowVN = new Date(now.getTime() + VN_OFFSET_MS);
		const currentYear = nowVN.getUTCFullYear();
		const currentMonth = nowVN.getUTCMonth() + 1; // JavaScript months are 0-indexed

		const yearParam = url.searchParams.get('year');
		const monthParam = url.searchParams.get('month');

		const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear;
		const selectedMonth = monthParam ? parseInt(monthParam, 10) : currentMonth;

		// Validate month range
		if (selectedMonth < 1 || selectedMonth > 12) {
			throw error(400, 'Tháng không hợp lệ');
		}

		// Fetch all reports in parallel (Story 6.4: added inventory report)
		const [occupancyReport, attendanceReport, inventoryReport] = await Promise.all([
			getMonthlyOccupancyReport(locals.supabase, selectedYear, selectedMonth),
			getMonthlyAttendanceReport(locals.supabase, selectedYear, selectedMonth),
			getInventorySummaryReport(locals.supabase, selectedYear, selectedMonth)
		]);

		return {
			occupancyReport,
			attendanceReport,
			inventoryReport,
			selectedYear,
			selectedMonth
		};
	} catch (err) {
		console.error('Error loading reports:', err);
		throw error(500, 'Không thể tải báo cáo');
	}
};
