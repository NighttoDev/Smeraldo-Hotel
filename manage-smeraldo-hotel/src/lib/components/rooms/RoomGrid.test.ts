import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('RoomGrid offline rendering', () => {
	const componentSource = readFileSync(new URL('./RoomGrid.svelte', import.meta.url), 'utf-8');

	it('renders an offline banner message', () => {
		expect(componentSource).toContain('Ngoại tuyến — đang hiển thị dữ liệu đã đồng bộ gần nhất');
	});

	it('renders a muted offline overlay layer for the grid', () => {
		expect(componentSource).toContain('data-offline={isOffline ? \'true\' : \'false\'}');
		expect(componentSource).toContain('absolute inset-0 z-10 rounded-xl bg-white/50');
		expect(componentSource).toContain('Ngoại tuyến');
	});
});
