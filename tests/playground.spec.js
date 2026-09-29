import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });

test("each WASD key starts the game and does not resume a paused game", async ({
	page,
}) => {
	for (const key of ["w", "a", "s", "d"]) {
		await page.goto("/");
		await expect(page.locator(".intro-note")).toContainText(
			"to start exploring",
		);
		await page.keyboard.press(key);
		await expect(page.locator("#intro")).toBeHidden();
		await expect(page.locator("#hud")).toBeVisible();
		await page.keyboard.press("Escape");
		await page.keyboard.press(key);
		await expect(page.locator("#paused")).toBeVisible();
	}
});

test("hop on the snowmobile, smash a snowman, park and return to the board", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await page.keyboard.down("d");
	await page.waitForTimeout(750);
	await page.keyboard.up("d");
	await page.keyboard.down("w");
	await expect(page.locator("#interaction-label")).toHaveText(
		"HOP ON SNOWMOBILE",
		{ timeout: 8000 },
	);
	await page.keyboard.up("w");
	await page.keyboard.press("e");
	await expect(page.locator("#vehicle-label")).toHaveText("SNOWMOBILE");
	await expect(page.locator("#interaction-label")).toHaveText(
		"PARK SNOWMOBILE",
	);
	await page.locator("#sound").click();
	await page.keyboard.down("d");
	await page.waitForTimeout(2000);
	await page.keyboard.up("d");
	await page.keyboard.down("w");
	await expect(page.locator("#trick")).toContainText("SMASH!", {
		timeout: 8000,
	});
	await page.keyboard.up("w");
	await page.screenshot({
		path: test.info().outputPath("snowmobile-smash.png"),
	});
	await page.keyboard.press("e");
	await expect(page.locator("#vehicle-label")).toHaveText("SNOWBOARD");
	await page.keyboard.press("e");
	await expect(page.locator("#vehicle-label")).toHaveText("SNOWMOBILE");
	await page.keyboard.press("r");
	await expect(page.locator("#vehicle-label")).toHaveText("SNOWBOARD");
	await expect(page.locator("#location-name")).toHaveText("BASECAMP LODGE");
	await page.locator("#map-toggle").click();
	await expect(page.locator('[data-destination="snowmobile"]')).toContainText(
		"HOP ON AND EXPLORE",
	);
	expect(errors).toEqual([]);
});
