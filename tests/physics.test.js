import assert from "node:assert/strict";
import test from "node:test";
import {
	courseLength,
	courses,
	crash,
	createState,
	step,
	terrainHeight,
} from "../src/physics.js";

test("distance is consistent at 30, 60, and 144 frames per second", () => {
	const distances = [30, 60, 144].map((fps) => {
		const state = createState();
		for (let frame = 0; frame < fps * 20; frame += 1) {
			step(state, { tuck: true }, 1 / fps);
		}
		assert.ok(state.speed <= 32);
		return state.distance;
	});
	assert.ok(Math.max(...distances) - Math.min(...distances) < 0.02);
});

test("a jumping rider lands and earns a spin bonus", () => {
	const state = createState();
	step(state, { jump: true, trick: true }, 1 / 60);
	assert.equal(state.airborne, true);
	let frames = 0;
	while (state.airborne && frames < 300) {
		step(state, { trick: true }, 1 / 60);
		frames += 1;
	}
	assert.equal(state.airborne, false);
	assert.ok(state.score >= 250);
	assert.equal(state.combo, 2);
	assert.equal(state.y, terrainHeight(state.x, state.z));
});

test("crash slows the rider, resets combo, and grants temporary immunity", () => {
	const state = createState();
	state.speed = 25;
	state.combo = 4;
	assert.equal(crash(state), true);
	assert.equal(state.crashes, 1);
	assert.equal(state.combo, 1);
	assert.equal(state.speed, 7.5);
	assert.equal(crash(state), false);
	for (let i = 0; i < 130; i += 1) step(state, {}, 1 / 60);
	assert.equal(crash(state), true);
	assert.equal(state.crashes, 2);
});

test("course completion is terminal and awards its bonus once", () => {
	const state = createState();
	state.z = -courseLength + 0.05;
	state.distance = -state.z;
	state.y = terrainHeight(state.x, state.z);
	step(state, {}, 1 / 60);
	assert.equal(state.finished, true);
	assert.equal(state.distance, courseLength);
	assert.equal(state.z, -courseLength);
	assert.equal(state.event, "finish");
	const score = state.score;
	step(state, { jump: true }, 1 / 60);
	assert.equal(state.score, score);
	assert.equal(crash(state), false);
});

test("braking and steering keep the rider inside the trail", () => {
	const state = createState();
	for (let i = 0; i < 600; i += 1)
		step(state, { steer: 1, brake: true }, 1 / 60);
	assert.ok(state.x <= 24);
	assert.equal(state.speed, 3);
	assert.ok(state.distance > 0);
});

for (const course of courses) {
	test(`${course.name} completes at its own finish line`, () => {
		const state = createState(course.id);
		assert.equal(state.courseId, course.id);
		assert.equal(state.courseLength, course.length);
		assert.equal(state.timeLimit, course.timeLimit);
		for (
			let frame = 0;
			frame < course.timeLimit * 60 && !state.finished;
			frame += 1
		) {
			step(state, { tuck: true, trick: true }, 1 / 60);
		}
		assert.equal(state.finished, true);
		assert.equal(state.distance, course.length);
		assert.equal(state.z, -course.length);
		assert.ok(state.score > 1000);
	});
}

test("each course has distinct continuous terrain", () => {
	const heights = courses.map(({ id }) => terrainHeight(4, -360, id));
	assert.equal(new Set(heights).size, courses.length);
	for (const { id } of courses) {
		for (let z = -1; z >= -600; z -= 1) {
			assert.ok(
				Math.abs(terrainHeight(0, z, id) - terrainHeight(0, z - 0.001, id)) <
					0.002,
			);
		}
	}
	assert.equal(createState().courseLength, courseLength);
	assert.throws(() => createState("missing"), /Unknown course/);
});

test("ridge narrows carving bounds and glacier ramps launch higher", () => {
	const ridge = createState("ridge");
	for (let i = 0; i < 600; i += 1) step(ridge, { steer: 1 }, 1 / 60);
	assert.equal(ridge.x, 19);
	const launchSpeeds = ["north", "glacier"].map((courseId) => {
		const state = createState(courseId);
		state.speed = 25;
		state.distance = courseId === "north" ? 179.99 : 209.99;
		state.z = -state.distance;
		state.y = terrainHeight(0, state.z, courseId);
		step(state, {}, 1 / 120);
		assert.equal(state.airborne, true);
		return state.verticalSpeed;
	});
	assert.ok(launchSpeeds[1] > launchSpeeds[0] + 3);
});
