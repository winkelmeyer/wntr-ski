import { expect, test } from "@playwright/test";

test("desktop course selection, riding, jump score, pause, restart and audio", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await expect(page.locator("#start")).toBeVisible();
	await page.locator("#start").click();
	await expect(page.locator(".course-card")).toHaveCount(3);
	await page.locator('[data-course="ridge"]').click();
	await page.locator('[data-mode="time"]').click();
	await page.locator("#ride").click();
	await expect(page.locator("#run-label")).toContainText("RAZOR RIDGE");
	await expect(page.locator("#run-clock")).not.toHaveText("00:00");
	await page.keyboard.down("ArrowUp");
	await page.waitForTimeout(1500);
	await page.keyboard.up("ArrowUp");
	await page.keyboard.down("KeyX");
	await page.keyboard.press("Space");
	await expect(page.locator("#score")).not.toHaveText("00000", {
		timeout: 10000,
	});
	await page.keyboard.up("KeyX");
	await page.keyboard.press("Escape");
	await expect(page.locator("#paused")).toBeVisible();
	const clock = await page.locator("#run-clock").textContent();
	await page.waitForTimeout(1100);
	await expect(page.locator("#run-clock")).toHaveText(clock);
	await page.locator("#resume").click();
	await expect(page.locator("#paused")).toBeHidden();
	await page.locator("#restart").click();
	await expect(page.locator("#score")).toHaveText("00000");
	await page.locator("#sound").click();
	await expect(page.locator("#sound")).toContainText("SOUND ON");
	await page.screenshot({ path: "test-results/desktop-ride.png" });
	expect(errors).toEqual([]);
});

test("mobile layout and touch controls", async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await page.screenshot({ path: "test-results/mobile-intro.png" });
	await page.locator("#start").tap();
	await expect(page.locator('[data-board="ice"]')).toBeDisabled();
	await page.locator('[data-course="glacier"]').tap();
	await page.screenshot({ path: "test-results/mobile-lodge.png" });
	await page.locator("#ride").tap();
	await expect(page.locator("#touch")).toBeVisible();
	await page.locator('[data-control="jump"]').tap();
	await expect(page.locator("#score")).not.toHaveText("00000", {
		timeout: 10000,
	});
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.screenshot({ path: "test-results/mobile-ride.png" });
	expect(errors).toEqual([]);
	await context.close();
});
