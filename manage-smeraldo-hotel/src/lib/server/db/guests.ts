// Server-only — never import from .svelte components
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GuestRow {
	id: string;
	full_name: string;
	phone: string | null;
	email: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface GuestInsert {
	full_name: string;
	phone?: string | null;
	email?: string | null;
	notes?: string | null;
}

/**
 * Create a new guest record. Returns the created row.
 */
export async function createGuest(
	supabase: SupabaseClient,
	data: GuestInsert
): Promise<GuestRow> {
	const { data: guest, error } = await supabase
		.from('guests')
		.insert({
			full_name: data.full_name,
			phone: data.phone ?? null,
			email: data.email ?? null,
			notes: data.notes ?? null
		})
		.select()
		.single();

	if (error || !guest) {
		throw new Error(`createGuest failed: ${error?.message ?? 'No data returned'}`);
	}

	return guest as GuestRow;
}

/**
 * Fetch a guest by ID. Returns null if not found.
 */
export async function getGuestById(
	supabase: SupabaseClient,
	id: string
): Promise<GuestRow | null> {
	const { data, error } = await supabase
		.from('guests')
		.select('id, full_name, phone, email, notes, created_at, updated_at')
		.eq('id', id)
		.maybeSingle();

	if (error) {
		throw new Error(`getGuestById failed: ${error.message}`);
	}

	return data as GuestRow | null;
}

/**
 * Update guest full name by ID.
 */
export async function updateGuestNameById(
	supabase: SupabaseClient,
	id: string,
	fullName: string
): Promise<void> {
	const { error } = await supabase.from('guests').update({ full_name: fullName }).eq('id', id);

	if (error) {
		throw new Error(`updateGuestNameById failed: ${error.message}`);
	}
}
