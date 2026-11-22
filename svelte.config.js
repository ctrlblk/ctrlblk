import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
	preprocess: [vitePreprocess()],

	vitePlugin: {
		// Our own components compile in runes mode, so any Svelte 4 syntax left
		// in them fails to compile. Libraries compile as they ship.
		dynamicCompileOptions({ filename }) {
			if (!filename.includes('node_modules')) {
				return { runes: true };
			}
		}
	}
};

export default config;
