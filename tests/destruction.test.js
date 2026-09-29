import assert from "node:assert/strict";
import test from "node:test";
import { destructibles, updateDestruction } from "../src/destruction.js";
import { terrainHeight } from "../src/terrain.js";

function stateAt(prop, speed = 12) {
	return {
		x: prop.x,
		z: prop.z,
		y: terrainHeight(prop.x, prop.z),
		speed,
		score: 0,
		destroyed: [],
		event: "",
		airborne: false,
	};
}

test("fast impacts destroy props and award points only once", () => {
	const prop = destructibles[0];
	const state = stateAt(prop);
	updateDestruction(state);
	assert.deepEqual(state.destroyed, [prop.id]);
	assert.equal(state.score, 75);
	assert.equal(state.event, "smash");
	assert.equal(state.speed, 12 * 0.88);
	updateDestruction(state);
	assert.equal(state.score, 75);
});

test("slow collisions leave destructibles solid and separate the rider", () => {
	const prop = destructibles[0];
	const state = stateAt(prop, 3);
	updateDestruction(state);
	assert.equal(state.destroyed.length, 0);
	assert.ok(
		Math.hypot(state.x - prop.x, state.z - prop.z) >= prop.radius + 0.65 - 1e-9,
	);
	assert.ok(state.speed < 3);
	assert.equal(state.score, 0);
});

test("airborne riders can clear destructibles", () => {
	const prop = destructibles[2];
	const state = stateAt(prop);
	state.y += prop.height + 0.2;
	state.airborne = true;
	updateDestruction(state);
	assert.equal(state.destroyed.length, 0);
	assert.equal(state.speed, 12);
});

test("snowmobile impacts use the vehicle's larger footprint", () => {
	const prop = destructibles[0];
	const state = stateAt(prop, -10);
	state.vehicle = "snowmobile";
	state.x -= prop.radius + 0.9;
	updateDestruction(state);
	assert.deepEqual(state.destroyed, [prop.id]);
	assert.equal(state.score, 75);
});
