import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getInventorySummaryReport } from '$lib/server/db/inventory';

export const load: PageServerLoad = async ({ url, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Phiên đăng nhập hết hạn');
	}

	if (locals.userRole !== 'manager') {
		throw error(403, 'Chỉ quản lý mới có quyền xem báo cáo');
	}

	// Get current date in Vietnam timezone
	const nowVN = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Ho_Chi_Minh',
		year: 'numeric',
		month: '2-digit'
	}).format(new Date());
	const currentYear = Number(nowVN.slice(0, 4));
	const currentMonth = Number(nowVN.slice(5, 7));

	// Parse year/month from query params, default to current month
	const year = Number(url.searchParams.get('year')) || currentYear;
	const month = Number(url.searchParams.get('month')) || currentMonth;

	const report = await getInventorySummaryReport(locals.supabase, year, month);

	return {
		report,
		year,
		month
	};
};
