import { defineConfig } from "@playwright/test";
export default defineConfig({
	testDir: "./tests",
	testMatch: "*.spec.js",
	timeout: 45000,
	use: {
		baseURL: process.env.TEST_URL || "http://localhost:4317",
		viewport: { width: 1440, height: 1000 },
	},
	workers: 1,
});
