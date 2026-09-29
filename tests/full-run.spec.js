import { expect, test } from "@playwright/test";

test.use({
	viewport: { width: 960, height: 640 },
	deviceScaleFactor: 1,
	actionTimeout: 10000,
	screenshot: "only-on-failure",
});

async function followCompass(page, arrived, timeout = 60000) {
	await page.evaluate(() => {
		const held = new Set();
		let frame;
		const dispatch = (type, key) =>
			window.dispatchEvent(
				new KeyboardEvent(type, {
					key: key === "ShiftLeft" ? "Shift" : key.slice(-1).toLowerCase(),
					code: key,
					bubbles: true,
				}),
			);
		const navigate = () => {
			const arrow = document.getElementById("waypoint-arrow");
			const angle = Number(
				arrow.style.transform.match(/rotate\(([-\d.e+]+)rad\)/)?.[1] ?? 0,
			);
			const turn = Math.atan2(Math.sin(angle), Math.cos(angle));
			const description = document.getElementById("waypoint-text").textContent;
			const distance = Number(description.match(/(\d+) M$/)?.[1] ?? 0);
			const speed = Number(document.getElementById("speed").textContent);
			const slowing =
				distance < 28 && speed > (description.startsWith("GATE") ? 45 : 25);
			const desired = new Set();
			if (Math.abs(turn) > 0.18) desired.add(turn > 0 ? "KeyD" : "KeyA");
			if (Math.abs(turn) < 0.65 && !slowing) desired.add("KeyW");
			else desired.add("KeyB");
			if (Math.abs(turn) < 0.25 && distance > 45) desired.add("ShiftLeft");
			for (const key of held) if (!desired.has(key)) dispatch("keyup", key);
			for (const key of desired) if (!held.has(key)) dispatch("keydown", key);
			held.clear();
			for (const key of desired) held.add(key);
			frame = requestAnimationFrame(navigate);
		};
		window.stopCompassNavigation = () => {
			cancelAnimationFrame(frame);
			for (const key of held) dispatch("keyup", key);
			delete window.stopCompassNavigation;
		};
		frame = requestAnimationFrame(navigate);
	});
	const deadline = Date.now() + timeout;
	try {
		while (Date.now() < deadline && !(await arrived())) {
			await page.waitForTimeout(100);
		}
	} finally {
		await page.evaluate(() => window.stopCompassNavigation?.());
	}
	if (!(await arrived())) {
		await page.screenshot({
			path: test.info().outputPath("navigation-failed.png"),
		});
		throw new Error(
			`Navigation stopped: ${await page.locator("#waypoint-text").textContent()} / speed ${await page.locator("#speed").textContent()} / ${await page.locator("#interaction-label").textContent()}`,
		);
	}
}

test("ride the chairlift, explore the summit, then complete an eight-gate circuit using controls", async ({
	page,
}) => {
	test.setTimeout(240000);
	const errors = [];
	page.on("pageerror", (error) => {
		errors.push(error.message);
	});
	await page.goto("/");
	await page.locator("#start").click();
	await page.keyboard.down("a");
	await page.waitForTimeout(750);
	await page.keyboard.up("a");
	await page.keyboard.down("w");
	await page.waitForTimeout(2400);
	await page.keyboard.up("w");
	await page.keyboard.down("b");
	await page.waitForTimeout(1100);
	await page.keyboard.up("b");
	await page.locator("#map-toggle").click();
	await page.locator('[data-destination="lift"]').click();
	await followCompass(
		page,
		async () =>
			(await page.locator("#interact").isVisible()) &&
			(await page.locator("#interaction-label").textContent()).includes(
				"RIDE TO",
			),
	);
	await page.keyboard.press("e");
	await expect(page.locator("#interaction-label")).toHaveText(
		"JUMP OFF THE LIFT",
	);
	await expect(page.locator("#location-name")).toHaveText("AURORA OVERLOOK", {
		timeout: 35000,
	});
	await expect
		.poll(
			() =>
				page.evaluate(() =>
					JSON.parse(
						localStorage.getItem("wntr-ski:explore:v1"),
					)?.visited.includes("summit"),
				),
			{ timeout: 12000 },
		)
		.toBe(true);
	await expect(page.locator("#interaction-label")).not.toHaveText(
		"JUMP OFF THE LIFT",
		{ timeout: 12000 },
	);
	await page.screenshot({ path: test.info().outputPath("summit.png") });
	await page.locator("#map-toggle").click();
	await page.locator('[data-destination="park"]').click();
	await followCompass(
		page,
		async () =>
			(await page.locator("#interact").isVisible()) &&
			(await page.locator("#interaction-label").textContent()).includes(
				"START SNOWFLAKE",
			),
	);
	await page.keyboard.press("e");
	await expect(page.locator("#waypoint-text")).toContainText("GATE 1 / 8");
	await followCompass(
		page,
		async () =>
			Boolean(
				await page.evaluate(
					() =>
						JSON.parse(localStorage.getItem("wntr-ski:explore:v1"))?.bestRace,
				),
			),
		120000,
	);
	const bestRace = await page.evaluate(
		() => JSON.parse(localStorage.getItem("wntr-ski:explore:v1")).bestRace,
	);
	expect(bestRace).toBeGreaterThan(20);
	expect(bestRace).toBeLessThan(120);
	await page.screenshot({
		path: test.info().outputPath("circuit-complete.png"),
	});
	expect(errors).toEqual([]);
});
