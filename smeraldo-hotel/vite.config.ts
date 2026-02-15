import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			// Full PWA config (icons, offline strategy) in Story 7.1
			manifest: {
				name: 'Smeraldo Hotel',
				short_name: 'Smeraldo',
				display: 'standalone',
				start_url: '/',
				background_color: '#F8FAFC',
				theme_color: '#1E3A8A'
			}
		})
	]
});
