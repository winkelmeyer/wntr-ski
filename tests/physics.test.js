import assert from "node:assert/strict";
import test from "node:test";
import { createState, respawn, step } from "../src/physics.js";
import {
	crystals,
	landmarks,
	solids,
	terrainHeight,
	treesForChunk,
} from "../src/terrain.js";

function place(state, x, z) {
	state.x = x;
	state.z = z;
	state.y = terrainHeight(x, z);
}

test("movement and interactions agree at 4 Hz and 60 Hz", () => {
	const states = [4, 60].map((fps) => {
		const state = createState();
		for (let frame = 0; frame < fps * 10; frame += 1) {
			step(state, { throttle: 1, steer: 0.15 }, 1 / fps);
		}
		return state;
	});
	for (const field of [
		"x",
		"y",
		"z",
		"speed",
		"heading",
		"elapsed",
		"score",
		"crashes",
	]) {
		assert.ok(Math.abs(states[0][field] - states[1][field]) < 1e-8, field);
	}
});

test("rider starts at rest, can reverse, turn around and explore without boundaries", () => {
	const state = createState();
	step(state, {}, 0.25);
	assert.equal(state.speed, 0);
	assert.equal(state.z, 10);
	for (let i = 0; i < 120; i += 1) step(state, { throttle: -1 });
	assert.ok(state.z > 15);
	for (let i = 0; i < 100; i += 1) step(state, { steer: 1, brake: true });
	assert.ok(state.heading > Math.PI);
	place(state, 510, 400);
	for (let i = 0; i < 120; i += 1) step(state, { throttle: 1 });
	assert.ok(state.x > 400);
	assert.ok(state.z > 350);
	assert.ok(state.speed > 0);
});

test("jumping and spinning lands on terrain and scores", () => {
	const state = createState();
	step(state, { jump: true, trick: true });
	assert.equal(state.airborne, true);
	for (let i = 0; i < 180 && state.airborne; i += 1)
		step(state, { trick: true });
	assert.equal(state.airborne, false);
	assert.equal(state.y, terrainHeight(state.x, state.z));
	assert.ok(state.lastLandingScore >= 200);
	assert.equal(state.combo, 2);
});

test("trees collide consistently even when a frame would pass through them", () => {
	const tree = treesForChunk(2, 2)[0];
	assert.ok(tree);
	for (const fps of [4, 60]) {
		const state = createState();
		place(state, tree.x, tree.z + 4);
		state.speed = 29;
		for (let frame = 0; frame < fps / 2; frame += 1)
			step(state, { throttle: 1, boost: true }, 1 / fps);
		assert.equal(state.crashes, 1);
		assert.ok(state.z > tree.z);
		assert.ok(
			Math.hypot(state.x - tree.x, state.z - tree.z) >= tree.radius + 0.64,
		);
	}
});

test("landmarks and crystals reward discovery only once", () => {
	const state = createState();
	state.visited = landmarks.map(({ id }) => id);
	const crystal = crystals[0];
	place(state, crystal.x, crystal.z);
	step(state);
	assert.deepEqual(state.collected, [crystal.id]);
	assert.equal(state.score, 150);
	step(state);
	assert.equal(state.score, 150);
	state.visited = [];
	place(state, landmarks[0].x, landmarks[0].z);
	step(state);
	assert.equal(state.score, 250);
	step(state);
	assert.equal(state.score, 250);
});

test("snowballs receive momentum and slow down after rider leaves", () => {
	const state = createState();
	const ball = state.props[0];
	place(state, ball.x, ball.z + 3);
	state.speed = 15;
	for (let i = 0; i < 30; i += 1) step(state, { throttle: 1 });
	assert.ok(Math.hypot(ball.vx, ball.vz) > 0);
	const speed = Math.hypot(ball.vx, ball.vz);
	const previousZ = ball.z;
	respawn(state);
	for (let i = 0; i < 120; i += 1) step(state);
	assert.ok(ball.z < previousZ);
	assert.ok(Math.hypot(ball.vx, ball.vz) < speed / 5);
});

test("respawn preserves exploration progress and clears rider motion", () => {
	const state = createState();
	state.visited.push("park");
	state.collected.push("crystal-0");
	state.score = 450;
	state.speed = 20;
	state.airborne = true;
	state.verticalSpeed = 8;
	respawn(state);
	assert.equal(state.x, 0);
	assert.equal(state.z, 10);
	assert.equal(state.speed, 0);
	assert.equal(state.airborne, false);
	assert.equal(state.verticalSpeed, 0);
	assert.equal(state.score, 450);
	assert.deepEqual(state.collected, ["crystal-0"]);
	assert.deepEqual(state.visited, ["park"]);
});

test("terrain is deterministic and lake is flat", () => {
	assert.deepEqual(treesForChunk(-2, 3), treesForChunk(-2, 3));
	assert.equal(terrainHeight(-100, -70), -2.5);
	assert.equal(terrainHeight(-110, -70), -2.5);
	for (const landmark of landmarks) {
		assert.ok(
			Math.abs(
				terrainHeight(landmark.x, landmark.z) -
					terrainHeight(landmark.x + 0.001, landmark.z),
			) < 0.01,
		);
	}
});

test("park kickers launch the rider without pressing jump", () => {
	const state = createState();
	place(state, 80, -45);
	state.speed = 20;
	let launched = false;
	for (let i = 0; i < 120; i += 1) {
		step(state, { throttle: 1 });
		if (state.airborne) launched = true;
	}
	assert.equal(launched, true);
});

test("chalet walls, campfire and lift towers stop a boosted rider at low FPS", () => {
	for (const solid of solids) {
		const state = createState();
		state.props = [];
		const edge = solid.depth ? solid.depth / 2 : solid.radius;
		place(state, solid.x, solid.z + edge + 3);
		state.speed = 29;
		step(state, { throttle: 1, boost: true }, 0.25);
		assert.equal(state.crashes, 1, solid.id);
		assert.ok(state.z >= solid.z + edge + 0.64, solid.id);
	}
});

test("rider can clear low objects in the air", () => {
	const fire = solids.find(({ id }) => id === "fire");
	const state = createState();
	state.props = [];
	place(state, fire.x, fire.z + 4);
	state.y += 5;
	state.airborne = true;
	state.speed = 29;
	step(state, { throttle: 1, boost: true }, 0.25);
	assert.equal(state.crashes, 0);
	assert.ok(state.z < fire.z);
});

test("snowballs bounce off buildings and trees", () => {
	const obstacles = [
		solids.find(({ id }) => id === "chalet"),
		treesForChunk(2, 2)[0],
	];
	for (const obstacle of obstacles) {
		const state = createState();
		const edge = obstacle.depth ? obstacle.depth / 2 : obstacle.radius;
		const ball = state.props[0];
		Object.assign(ball, {
			x: obstacle.x,
			z: obstacle.z + edge + 2,
			vx: 0,
			vz: -20,
		});
		ball.y = terrainHeight(ball.x, ball.z) + ball.radius;
		state.props = [ball];
		step(state, {}, 0.25);
		assert.ok(ball.z > obstacle.z + edge + 0.99);
		assert.ok(ball.vz > 0);
	}
});

test("snowballs transfer momentum to each other", () => {
	const state = createState();
	place(state, 100, 100);
	state.props = [
		{ id: "first", x: -3, z: 5, y: 1, vx: 12, vz: 0, radius: 1 },
		{ id: "second", x: 0, z: 5, y: 1, vx: 0, vz: 0, radius: 1 },
	];
	step(state, {}, 0.25);
	const [first, second] = state.props;
	assert.ok(second.vx > 4);
	assert.ok(second.x > 0);
	assert.ok(second.x - first.x >= 1.99);
	assert.ok(first.vx < second.vx);
});

test("snowballs roll gently downhill", () => {
	const state = createState();
	const ball = state.props[0];
	Object.assign(ball, { x: 40, z: -170, vx: 0, vz: 0 });
	ball.y = terrainHeight(ball.x, ball.z) + ball.radius;
	state.props = [ball];
	const initialHeight = ball.y;
	for (let i = 0; i < 120; i += 1) step(state);
	assert.ok(ball.y < initialHeight - 0.01);
	assert.ok(Math.hypot(ball.vx, ball.vz) > 0.01);
});
