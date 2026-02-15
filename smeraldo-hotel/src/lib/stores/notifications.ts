// Push notification queue — implemented in Story 7.4
import { writable } from 'svelte/store';

export const notificationStore = writable<unknown[]>([]);
