import assert from "node:assert/strict";
import test from "node:test";
import { createState, respawn, step } from "../src/physics.js";
import { terrainHeight } from "../src/terrain.js";
import { nearSnowmobile, toggleVehicle } from "../src/vehicle.js";

function mount() {
	const state = createState();
	state.x = state.snowmobile.x;
	state.z = state.snowmobile.z;
	assert.equal(toggleVehicle(state), true);
	return state;
}

test("snowmobile requires proximity and can be driven, parked and remounted", () => {
	const state = createState();
	assert.equal(nearSnowmobile(state), false);
	assert.equal(toggleVehicle(state), false);
	state.x = 10;
	assert.equal(nearSnowmobile(state), true);
	assert.equal(toggleVehicle(state), true);
	assert.equal(state.vehicle, "snowmobile");
	for (let i = 0; i < 120; i += 1) step(state, { throttle: 1 });
	assert.ok(state.z < 0);
	assert.equal(state.snowmobile.z, state.z);
	const parked = { ...state.snowmobile };
	assert.equal(toggleVehicle(state), true);
	assert.equal(state.vehicle, "board");
	assert.equal(state.speed, 0);
	assert.ok(Math.hypot(state.x - parked.x, state.z - parked.z) >= 2.99);
	assert.equal(state.snowmobile.z, parked.z);
	assert.equal(toggleVehicle(state), true);
	assert.equal(state.x, parked.x);
	assert.equal(state.z, parked.z);
});

test("snowmobile boost, reverse and steering use vehicle controls", () => {
	const state = mount();
	state.x = -100;
	state.z = -43;
	state.y = terrainHeight(state.x, state.z);
	for (let i = 0; i < 120; i += 1) step(state, { throttle: 1, boost: true });
	assert.ok(state.speed > 32);
	assert.ok(state.speed <= 44);
	state.x = -100;
	state.z = -90;
	state.y = terrainHeight(state.x, state.z);
	state.speed = 0;
	for (let i = 0; i < 120; i += 1) step(state, { throttle: -1 });
	assert.ok(state.speed <= -10);
	assert.ok(state.speed >= -12);
	const heading = state.heading;
	step(state, { steer: 1 }, 0.25);
	assert.ok(Math.abs(state.heading - heading - 0.375) < 1e-8);
});

test("snowmobile bunny hops cannot spin and respawn parks it", () => {
	const state = mount();
	step(state, { jump: true, trick: true });
	assert.equal(state.airborne, true);
	assert.ok(state.verticalSpeed < 5);
	assert.equal(state.trickRotation, 0);
	const parkedX = state.x;
	const parkedZ = state.z;
	respawn(state);
	assert.equal(state.vehicle, "board");
	assert.equal(state.x, 0);
	assert.equal(state.z, 10);
	assert.equal(state.snowmobile.x, parkedX);
	assert.equal(state.snowmobile.z, parkedZ);
	assert.equal(state.snowmobile.y, terrainHeight(parkedX, parkedZ));
});

test("dismount chooses the clear side beside a chalet wall", () => {
	const state = mount();
	Object.assign(state, { x: -13, z: -4.8, heading: -Math.PI / 2 });
	assert.equal(toggleVehicle(state), true);
	assert.ok(state.z > -4.8);
	assert.equal(state.vehicle, "board");
});
