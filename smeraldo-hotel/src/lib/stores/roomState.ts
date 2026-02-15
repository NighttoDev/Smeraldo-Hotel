// Live room map from Supabase Realtime — implemented in Story 2.5
// Subscribe in +layout.svelte only, consume in components via $roomStateStore
import { writable } from 'svelte/store';

export const roomStateStore = writable<Map<string, unknown>>(new Map());
