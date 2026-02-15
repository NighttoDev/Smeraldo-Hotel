// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
// import type { Database } from '$lib/db/types'; // Uncomment after Story 1.2 types are generated

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
