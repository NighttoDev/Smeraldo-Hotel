import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			srcDir: 'src',
			filename: 'service-worker.ts',
			strategies: 'injectManifest',
			registerType: 'autoUpdate',
			devOptions: { enabled: false },
			injectManifest: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}']
			},
			workbox: {
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true,
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /\/api\/sync/,
						handler: 'NetworkOnly',
						method: 'POST',
						options: {
							cacheName: 'api-sync-network-only'
						}
					},
					{
						urlPattern: /\/api\/.*/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 5 * 60
							}
						}
					},
					{
						urlPattern: /\/.*\/__data\.json.*/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'sveltekit-data-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 5 * 60
							}
						}
					},
					{
						urlPattern: /\/_app\/.*/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'app-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 30 * 24 * 60 * 60
							}
						}
					},
					{
						urlPattern: /\/icons\/.*/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'icons-cache',
							expiration: {
								maxEntries: 20,
								maxAgeSeconds: 365 * 24 * 60 * 60
							}
						}
					},
					{
						urlPattern: ({ url }) => {
							// Match SvelteKit route groups: /(manager), /(reception), /(housekeeping)
							// and root path
							return url.pathname === '/' ||
								/^\/(manager|reception|housekeeping)\//.test(url.pathname);
						},
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'pages-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 24 * 60 * 60
							}
						}
					}
				]
			},
			manifest: {
				name: 'Smeraldo Hotel Management',
				short_name: 'Smeraldo Hotel',
				description: 'Hotel management app for reception, housekeeping, and managers',
				start_url: '/',
				display: 'standalone',
				background_color: '#F8FAFC',
				theme_color: '#1E3A8A',
				lang: 'vi',
				scope: '/',
				orientation: 'any',
				categories: ['business', 'productivity'],
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			}
		})
	]
});
