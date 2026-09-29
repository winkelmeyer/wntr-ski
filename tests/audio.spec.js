import { expect, test } from "@playwright/test";

test("real Web Audio effects respond to jumps, landings, mute and pause", async ({
	page,
}) => {
	await page.addInitScript(() => {
		const Original = window.AudioContext;
		window.AudioContext = class extends Original {
			constructor(...args) {
				super(...args);
				window.audioProbe = { oscillators: 0, buffers: 0, gains: [] };
			}
			createOscillator() {
				window.audioProbe.oscillators++;
				return super.createOscillator();
			}
			createBufferSource() {
				window.audioProbe.buffers++;
				return super.createBufferSource();
			}
			createGain() {
				const gain = super.createGain();
				window.audioProbe.gains.push(gain);
				return gain;
			}
		};
	});
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await page.locator("#start").click();
	await page.locator("#sound").click();
	await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");
	const before = await page.evaluate(() => window.audioProbe.oscillators);
	await page.keyboard.press("Space");
	await expect(page.locator("#trick")).toContainText("FRESH AIR");
	const after = await page.evaluate(() => ({
		oscillators: window.audioProbe.oscillators,
		buffers: window.audioProbe.buffers,
	}));
	expect(after.oscillators).toBeGreaterThanOrEqual(before + 2);
	expect(after.buffers).toBeGreaterThanOrEqual(4);
	await page.keyboard.press("Escape");
	await expect
		.poll(() => page.evaluate(() => window.audioProbe.gains[0].gain.value))
		.toBeLessThan(0.01);
	await page.locator("#resume").click();
	await expect
		.poll(() => page.evaluate(() => window.audioProbe.gains[0].gain.value))
		.toBeGreaterThan(0.5);
	await page.locator("#sound").click();
	const muted = await page.evaluate(() => window.audioProbe.oscillators);
	await page.keyboard.press("Space");
	await page.waitForTimeout(1300);
	expect(await page.evaluate(() => window.audioProbe.oscillators)).toBe(muted);
	expect(errors).toEqual([]);
});

test("touch controls remain reachable in landscape", async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 844, height: 390 },
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();
	await page.goto("/");
	await page.locator("#start").tap();
	for (const selector of [
		"#joystick",
		'[data-control="jump"]',
		'[data-control="boost"]',
		"#pause",
		"#map-toggle",
	]) {
		const box = await page.locator(selector).boundingBox();
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.y).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(844);
		expect(box.y + box.height).toBeLessThanOrEqual(390);
	}
	await page.locator('[data-control="jump"]').tap();
	await expect(page.locator("#trick")).toContainText("FRESH AIR");
	await page.screenshot({ path: "test-results/mobile-landscape.png" });
	await page.locator("#map-toggle").tap();
	await page.locator('[data-destination="lift"]').tap();
	await expect(page.locator("#waypoint-text")).toContainText("THE CHAIRLIFT");
	await context.close();
});
