import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStockMovementHistory } from '$lib/server/db/inventory';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Session validation
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, { status: 401 });
	}

	// Extract query params
	const itemId = url.searchParams.get('itemId');
	const limit = Number(url.searchParams.get('limit')) || 50;
	const offset = Number(url.searchParams.get('offset')) || 0;

	if (!itemId) {
		return json(
			{ error: { message: 'itemId is required', code: 'MISSING_PARAM' } },
			{ status: 400 }
		);
	}

	try {
		// Fetch movement history
		const movements = await getStockMovementHistory(locals.supabase, itemId, limit, offset);

		// Get total count for pagination (query separately)
		const { count, error: countError } = await locals.supabase
			.from('stock_movements')
			.select('*', { count: 'exact', head: true })
			.eq('item_id', itemId);

		if (countError) {
			throw new Error(`Failed to count movements: ${countError.message}`);
		}

		return json({
			data: {
				movements,
				total: count || 0,
				page: Math.floor(offset / limit) + 1,
				pageSize: limit
			},
			error: null
		});
	} catch (error) {
		console.error('Error fetching movement history:', error);
		return json(
			{
				data: null,
				error: {
					message: error instanceof Error ? error.message : 'Internal server error',
					code: 'FETCH_FAILED'
				}
			},
			{ status: 500 }
		);
	}
};
