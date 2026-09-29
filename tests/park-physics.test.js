import assert from "node:assert/strict";
import test from "node:test";
import { createState, step } from "../src/physics.js";
import { rails, terrainHeight } from "../src/terrain.js";

function approach(rail = rails[0]) {
	const state = createState();
	state.x = rail.x - Math.sin(rail.heading) * (rail.length / 2 - 1);
	state.z = rail.z + Math.cos(rail.heading) * (rail.length / 2 - 1);
	state.y = terrainHeight(state.x, state.z);
	state.heading = rail.heading;
	state.speed = 12;
	return state;
}

for (const rail of rails) {
	test(`${rail.id} catches aligned rider, awards distance points and releases at end`, () => {
		const state = approach(rail);
		step(state);
		assert.equal(state.grind?.id, rail.id);
		assert.equal(state.event, "grindStart");
		assert.equal(state.y, terrainHeight(rail.x, rail.z) + rail.height);
		const startScore = state.score;
		for (let i = 0; i < 180 && state.grind; i += 1) step(state);
		assert.equal(state.grind, null);
		assert.ok(state.score > startScore + 100);
		assert.equal(state.airborne, true);
		assert.equal(state.combo, 2);
	});
}

test("jump exits grind and does not immediately reattach", () => {
	const state = approach();
	step(state);
	assert.ok(state.grind);
	step(state, { jump: true, trick: true });
	assert.equal(state.grind, null);
	assert.equal(state.airborne, true);
	assert.ok(state.verticalSpeed > 7);
	assert.ok(state.trickRotation > 0);
	assert.equal(state.event, "grindEnd");
	step(state);
	assert.equal(state.grind, null);
});

test("rail accepts descending landings but rejects crosswise and snowmobile approaches", () => {
	const rail = rails[0];
	const landing = approach();
	landing.y = terrainHeight(rail.x, rail.z) + rail.height + 0.2;
	landing.airborne = true;
	landing.verticalSpeed = -2;
	step(landing);
	assert.ok(landing.grind);
	const crosswise = approach();
	crosswise.heading += Math.PI / 2;
	step(crosswise);
	assert.equal(crosswise.grind, null);
	const mounted = approach();
	mounted.vehicle = "snowmobile";
	step(mounted);
	assert.equal(mounted.grind, null);
});
