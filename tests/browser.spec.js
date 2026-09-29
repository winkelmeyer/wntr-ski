import { expect, test } from "@playwright/test";

test("keyboard entry, driving, collecting, pause, map, respawn, audio and saved progress", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await expect(page.locator("#start")).toBeVisible();
	await expect(page.locator("#credit")).toHaveText(
		"almost oneshooted by astra",
	);
	await page.locator("#start").focus();
	await page.keyboard.press("Enter");
	await expect(page.locator("#hud")).toBeVisible();
	await expect(page.locator("#touch")).toBeHidden();
	await page.keyboard.down("w");
	await expect(page.locator("#collected")).toHaveText("1 / 16", {
		timeout: 15000,
	});
	await page.keyboard.up("w");
	await page.keyboard.press("Escape");
	await expect(page.locator("#paused")).toBeVisible();
	const speed = await page.locator("#speed").textContent();
	await page.waitForTimeout(500);
	await expect(page.locator("#speed")).toHaveText(speed);
	await page.keyboard.press("Tab");
	await page.keyboard.press("Tab");
	await expect(page.locator("#resume")).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page.locator("#paused")).toBeHidden();
	await page.keyboard.press("m");
	await expect(page.locator("#map-panel")).toBeVisible();
	await page.locator('[data-destination="lake"]').click();
	await expect(page.locator("#waypoint-text")).toContainText("MIRROR LAKE");
	await page.keyboard.press("r");
	await expect(page.locator("#location-name")).toHaveText("BASECAMP LODGE");
	await page.keyboard.down("x");
	await page.keyboard.press("Space");
	await expect(page.locator("#trick")).toContainText("STOMPED", {
		timeout: 5000,
	});
	await page.keyboard.up("x");
	await page.locator("#sound").click();
	await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");
	await page.screenshot({ path: "test-results/desktop-open-world.png" });
	await page.reload();
	await page.locator("#start").click();
	await expect(page.locator("#collected")).toHaveText("1 / 16");
	expect(errors).toEqual([]);
});

test("mobile joystick, simultaneous boost, jump, cancellation, and compact map", async ({
	browser,
}) => {
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
	await expect(page.locator("#touch")).toBeVisible();
	const box = await page.locator("#joystick").boundingBox();
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	const boost = await page.locator('[data-control="boost"]').boundingBox();
	const touch = await context.newCDPSession(page);
	const finger = { id: 1, x, y: y - 38 };
	const second = {
		id: 2,
		x: boost.x + boost.width / 2,
		y: boost.y + boost.height / 2,
	};
	await touch.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [finger],
	});
	await touch.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [finger, second],
	});
	await expect
		.poll(async () => Number(await page.locator("#speed").textContent()))
		.toBeGreaterThan(15);
	await touch.send("Input.dispatchTouchEvent", {
		type: "touchCancel",
		touchPoints: [],
	});
	await page.locator('[data-control="jump"]').tap();
	await expect(page.locator("#trick")).toContainText("FRESH AIR", {
		timeout: 7000,
	});
	await touch.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [
			{ id: 3, x: 170, y: 400 },
			{ id: 4, x: 220, y: 400 },
		],
	});
	await touch.send("Input.dispatchTouchEvent", {
		type: "touchMove",
		touchPoints: [
			{ id: 3, x: 125, y: 400 },
			{ id: 4, x: 265, y: 400 },
		],
	});
	await touch.send("Input.dispatchTouchEvent", {
		type: "touchEnd",
		touchPoints: [],
	});
	expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
	await page.locator("#map-toggle").tap();
	await expect(page.locator("#map-panel")).toBeVisible();
	await page.screenshot({ path: "test-results/mobile-map.png" });
	await page.locator('[data-destination="park"]').tap();
	await expect(page.locator("#waypoint-text")).toContainText(
		"POWDER PLAYGROUND",
	);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.screenshot({ path: "test-results/mobile-ride.png" });
	expect(errors).toEqual([]);
	await context.close();
});
