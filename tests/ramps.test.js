import assert from "node:assert/strict";
import test from "node:test";
import { createState, step } from "../src/physics.js";
import {
	halfpipe,
	ramps,
	terrainHeight,
	treesForChunk,
} from "../src/terrain.js";

for (const ramp of ramps) {
	test(`${ramp.id} launches a boosted rider without jumping`, () => {
		const state = createState();
		Object.assign(state, {
			x: ramp.x,
			z: ramp.z + 16,
			speed: 20,
			y: terrainHeight(ramp.x, ramp.z + 16),
			props: [],
		});
		let clearance = 0;
		for (let i = 0; i < 240; i++) {
			step(state, { throttle: 1, boost: true }, 1 / 120);
			clearance = Math.max(
				clearance,
				state.y - terrainHeight(state.x, state.z),
			);
		}
		assert.ok(clearance > 3, `Expected usable air, got ${clearance}`);
		assert.equal(state.crashes, 0);
	});
}

test("ramp approaches and landings are free of procedural trees", () => {
	for (let cx = -1; cx <= 2; cx++)
		for (let cz = -3; cz <= 1; cz++) {
			for (const tree of treesForChunk(cx, cz))
				for (const ramp of ramps) {
					assert.ok(
						!(
							Math.abs(tree.x - ramp.x) < ramp.width / 2 + 5 &&
							tree.z > ramp.z - ramp.depth / 2 - 40 &&
							tree.z < ramp.z + ramp.depth / 2 + 18
						),
					);
				}
		}
});

test("halfpipe has usable raised walls on both sides", () => {
	const center = terrainHeight(halfpipe.x, halfpipe.z);
	for (const side of [-1, 1])
		assert.ok(
			terrainHeight(halfpipe.x + (side * halfpipe.width) / 2, halfpipe.z) >
				center + 2.5,
		);
});
