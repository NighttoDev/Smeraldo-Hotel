import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				'room-available': '#10B981',
				'room-occupied': '#3B82F6',
				'room-checkout': '#F59E0B',
				'room-cleaning': '#8B5CF6',
				'room-ready': '#22C55E',
				primary: '#1E3A8A',
				secondary: '#3B82F6',
				accent: '#CA8A04',
				background: '#F8FAFC',
				'body-text': '#1E40AF',
				'high-contrast': '#0F172A'
			},
			fontFamily: {
				sans: ['Fira Sans', 'sans-serif'],
				mono: ['Fira Code', 'monospace']
			}
		}
	},
	plugins: [tailwindcssAnimate]
} satisfies Config;
