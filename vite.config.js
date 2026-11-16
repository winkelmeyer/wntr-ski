import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				home: resolve(import.meta.dirname, "index.html"),
				game: resolve(import.meta.dirname, "game/index.html"),
			},
		},
	},
});
