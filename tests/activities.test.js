import assert from "node:assert/strict";
import test from "node:test";
import {
	advanceActivities,
	interact,
	liftBase,
	liftTop,
	nearbyActivity,
	raceGates,
} from "../src/activities.js";
import { createState, step } from "../src/physics.js";
import { terrainHeight } from "../src/terrain.js";

test("chairlift carries the rider to the summit and releases them to a safe landing", () => {
	const state = createState();
	Object.assign(state, liftBase);
	assert.match(nearbyActivity(state), /RIDE/);
	assert.match(interact(state), /OVERLOOK/);
	for (let i = 0; i < 22 * 60 + 1; i++) advanceActivities(state, 1 / 60);
	assert.equal(state.lift, null);
	assert.ok(Math.hypot(state.x - liftTop.x, state.z - liftTop.z) < 0.01);
	for (let i = 0; i < 120; i++) step(state, {}, 1 / 60);
	assert.equal(state.airborne, false);
	assert.equal(state.y, terrainHeight(state.x, state.z));
	assert.ok(state.visited.includes("summit"));
});
test("jumping off a lift restores normal physics", () => {
	const state = Object.assign(createState(), liftBase);
	interact(state);
	advanceActivities(state, 5);
	interact(state);
	assert.equal(state.lift, null);
	assert.equal(state.airborne, true);
	for (let i = 0; i < 200; i++) step(state, { throttle: 1 }, 1 / 60);
	assert.ok(Number.isFinite(state.y));
	assert.ok(state.distance > 10);
});
test("circuit requires gates in order, awards once, and keeps the fastest time", () => {
	const state = Object.assign(createState(), raceGates[0]);
	interact(state);
	Object.assign(state, raceGates[3]);
	advanceActivities(state, 5);
	assert.equal(state.race.next, 1);
	for (const gate of raceGates.slice(1)) {
		Object.assign(state, gate);
		advanceActivities(state, 5);
	}
	assert.equal(state.race.active, false);
	assert.equal(state.score, 750);
	assert.equal(state.bestRace, 45);
	advanceActivities(state, 5);
	assert.equal(state.score, 750);
	interact(state);
	for (const gate of raceGates.slice(1)) {
		Object.assign(state, gate);
		advanceActivities(state, 10);
	}
	assert.equal(state.bestRace, 45);
	assert.equal(state.score, 1500);
});
