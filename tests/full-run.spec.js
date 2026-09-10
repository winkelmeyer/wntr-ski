import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 1 });

test("complete a real freeride run, persist a medal, unlock a board, and ride again", async ({
	page,
}) => {
	test.setTimeout(300000);
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await page.locator("#start").click();
	await expect(page.locator('[data-board="ice"]')).toBeDisabled();
	await page.locator('[data-course="north"]').click();
	await page.locator('[data-mode="freeride"]').click();
	await page.locator("#ride").click();
	await expect(page.locator("#run-label")).toHaveText("NORTH FACE / FREERIDE");
	await page.keyboard.down("ArrowUp");
	await page.keyboard.down("KeyX");
	await expect(page.locator("#result")).toBeVisible({ timeout: 240000 });
	await page.keyboard.up("KeyX");
	await page.keyboard.up("ArrowUp");
	await expect(page.locator("#result-text")).toContainText("MEDAL");

	const progress = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("wntr-ski:progress:v1")),
	);
	const record = progress.records["north:freeride"];
	expect(record.score).toBeGreaterThan(1000);
	expect(record.time).toBeGreaterThan(60);
	expect(record.time).toBeLessThan(150);
	expect(["bronze", "silver", "gold"]).toContain(record.medal);
	expect(progress.medals).toBe(1);
	await expect(page.locator("#result-text")).toContainText(
		record.score.toLocaleString(),
	);
	await page.screenshot({ path: "test-results/full-run-result.png" });

	await page.locator("#home").click();
	await expect(page.locator("#lodge")).toBeVisible();
	await expect(page.locator('[data-course="north"] .record')).toContainText(
		`BEST ${record.score}`,
	);
	await expect(page.locator('[data-board="ice"]')).toBeEnabled();
	await page.locator('[data-board="ice"]').click();
	await expect(page.locator('[data-board="ice"]')).toHaveClass(/selected/);
	await page.locator("#close-lodge").click();
	await expect(page.locator("#intro")).toBeVisible();
	await page.reload();
	await page.locator("#start").click();
	await expect(page.locator('[data-board="ice"]')).toHaveClass(/selected/);
	await expect(page.locator('[data-course="north"] .record')).toContainText(
		`BEST ${record.score}`,
	);
	await page.locator("#ride").click();
	await expect(page.locator("#hud")).toBeVisible();
	await expect(page.locator("#score")).toHaveText("00000");
	await page.keyboard.down("KeyX");
	await page.keyboard.press("Space");
	await expect(page.locator("#score")).not.toHaveText("00000", {
		timeout: 10000,
	});
	await page.keyboard.up("KeyX");
	await page.locator("#restart").click();
	await expect(page.locator("#score")).toHaveText("00000");
	expect(errors).toEqual([]);
});
