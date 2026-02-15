import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	roomStateStore,
	roomListStore,
	roomStatusCountsStore,
	floorsStore,
	initRoomState,
	updateRoomInStore
} from './roomState';
import type { RoomState } from './roomState';

const mockRooms: RoomState[] = [
	{
		id: '1',
		room_number: '301',
		floor: 3,
		room_type: 'Standard',
		status: 'available',
		current_guest_name: null
	},
	{
		id: '2',
		room_number: '302',
		floor: 3,
		room_type: 'Standard',
		status: 'occupied',
		current_guest_name: 'Nguyen Van A'
	},
	{
		id: '3',
		room_number: '401',
		floor: 4,
		room_type: 'Deluxe',
		status: 'being_cleaned',
		current_guest_name: null
	}
];

describe('roomStateStore', () => {
	beforeEach(() => {
		roomStateStore.set(new Map());
	});

	it('initRoomState populates store correctly', () => {
		initRoomState(mockRooms);
		const map = get(roomStateStore);
		expect(map.size).toBe(3);
		expect(map.get('1')?.room_number).toBe('301');
	});

	it('updateRoomInStore updates a single room', () => {
		initRoomState(mockRooms);
		updateRoomInStore({ ...mockRooms[0], status: 'occupied', current_guest_name: 'Test Guest' });
		const map = get(roomStateStore);
		expect(map.get('1')?.status).toBe('occupied');
		expect(map.get('1')?.current_guest_name).toBe('Test Guest');
	});
});

describe('roomListStore', () => {
	beforeEach(() => {
		roomStateStore.set(new Map());
	});

	it('sorts by floor then room_number', () => {
		initRoomState(mockRooms);
		const list = get(roomListStore);
		expect(list[0].floor).toBe(3);
		expect(list[0].room_number).toBe('301');
		expect(list[2].floor).toBe(4);
	});
});

describe('roomStatusCountsStore', () => {
	beforeEach(() => {
		roomStateStore.set(new Map());
	});

	it('counts correctly', () => {
		initRoomState(mockRooms);
		const counts = get(roomStatusCountsStore);
		expect(counts.available).toBe(1);
		expect(counts.occupied).toBe(1);
		expect(counts.being_cleaned).toBe(1);
		expect(counts.checking_out_today).toBe(0);
		expect(counts.ready).toBe(0);
	});
});

describe('floorsStore', () => {
	beforeEach(() => {
		roomStateStore.set(new Map());
	});

	it('returns unique sorted floors', () => {
		initRoomState(mockRooms);
		const floors = get(floorsStore);
		expect(floors).toEqual([3, 4]);
	});
});
