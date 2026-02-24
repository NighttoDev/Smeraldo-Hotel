/**
 * PWA Configuration Tests
 * Validates manifest and Service Worker configuration
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

describe('PWA Icons', () => {
	it('should have icon-512.png in static/icons/', () => {
		const iconPath = join(process.cwd(), 'static', 'icons', 'icon-512.png');
		expect(existsSync(iconPath)).toBe(true);
	});

	it('should have icon-192.png in static/icons/', () => {
		const iconPath = join(process.cwd(), 'static', 'icons', 'icon-192.png');
		expect(existsSync(iconPath)).toBe(true);
	});

	it('should have favicon.png in static/icons/', () => {
		const iconPath = join(process.cwd(), 'static', 'icons', 'favicon.png');
		expect(existsSync(iconPath)).toBe(true);
	});
});

describe('PWA Manifest Configuration', () => {
	it('should generate manifest.webmanifest after build', () => {
		// This test validates that the build output includes the manifest
		// Run `npm run build` first, then this test will pass
		const manifestPath = join(process.cwd(), 'build', 'client', 'manifest.webmanifest');

		// Skip if build hasn't been run
		if (!existsSync(manifestPath)) {
			console.warn('⚠ Build not found - run `npm run build` to validate manifest');
			return;
		}

		const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

		// Validate required manifest fields
		expect(manifest.name).toBe('Smeraldo Hotel Management');
		expect(manifest.short_name).toBe('Smeraldo Hotel');
		expect(manifest.description).toBe('Hotel management app for reception, housekeeping, and managers');
		expect(manifest.start_url).toBe('/');
		expect(manifest.display).toBe('standalone');
		expect(manifest.background_color).toBe('#F8FAFC');
		expect(manifest.theme_color).toBe('#1E3A8A');
		expect(manifest.lang).toBe('vi');
		expect(manifest.scope).toBe('/');
		expect(manifest.orientation).toBe('any');
		expect(manifest.categories).toEqual(['business', 'productivity']);

		// Validate icons
		expect(manifest.icons).toBeDefined();
		expect(manifest.icons.length).toBe(2);

		const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === '192x192');
		expect(icon192).toBeDefined();
		expect(icon192?.src).toBe('/icons/icon-192.png');
		expect(icon192?.type).toBe('image/png');
		expect(icon192?.purpose).toBe('any maskable');

		const icon512 = manifest.icons.find((i: { sizes: string }) => i.sizes === '512x512');
		expect(icon512).toBeDefined();
		expect(icon512?.src).toBe('/icons/icon-512.png');
		expect(icon512?.type).toBe('image/png');
		expect(icon512?.purpose).toBe('any maskable');
	});

	it('should generate Service Worker after build', () => {
		const swPath = join(process.cwd(), 'build', 'client', 'sw.js');

		// Skip if build hasn't been run
		if (!existsSync(swPath)) {
			console.warn('⚠ Build not found - run `npm run build` to validate Service Worker');
			return;
		}

		expect(existsSync(swPath)).toBe(true);

		// Verify SW file is not empty
		const swContent = readFileSync(swPath, 'utf-8');
		expect(swContent.length).toBeGreaterThan(100);

		// Verify Workbox is included
		const workboxPath = join(process.cwd(), 'build', 'client');
		const files = readdirSync(workboxPath);
		const workboxFile = files.find((f: string) => f.startsWith('workbox-'));
		expect(workboxFile).toBeDefined();
	});
});

describe('app.html PWA Meta Tags', () => {
	it('should include iOS PWA meta tags', () => {
		const appHtmlPath = join(process.cwd(), 'src', 'app.html');
		const appHtml = readFileSync(appHtmlPath, 'utf-8');

		// Validate iOS-specific meta tags
		expect(appHtml).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
		expect(appHtml).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
		expect(appHtml).toContain('<meta name="apple-mobile-web-app-title" content="Smeraldo Hotel"');
		expect(appHtml).toContain('<link rel="apple-touch-icon" href="%sveltekit.assets%/icons/icon-192.png"');

		// Validate theme color
		expect(appHtml).toContain('<meta name="theme-color" content="#1E3A8A"');

		// Validate favicon
		expect(appHtml).toContain('<link rel="icon" href="%sveltekit.assets%/favicon.png"');
	});
});
