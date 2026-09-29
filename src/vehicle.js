import { CHUNK_SIZE, solids, terrainHeight, treesForChunk } from "./terrain.js";

function dismountPosition(state) {
	const trees = [];
	const cx = Math.floor(state.x / CHUNK_SIZE);
	const cz = Math.floor(state.z / CHUNK_SIZE);
	for (let dx = -1; dx <= 1; dx += 1) {
		for (let dz = -1; dz <= 1; dz += 1)
			trees.push(...treesForChunk(cx + dx, cz + dz));
	}
	const obstacles = [...solids, ...trees];
	for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
		const x = state.x + Math.sin(state.heading + angle) * 3;
		const z = state.z - Math.cos(state.heading + angle) * 3;
		if (
			obstacles.some((obstacle) =>
				obstacle.width
					? Math.abs(x - obstacle.x) < obstacle.width / 2 + 0.7 &&
						Math.abs(z - obstacle.z) < obstacle.depth / 2 + 0.7
					: Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + 0.7,
			)
		)
			continue;
		return { x, z, y: terrainHeight(x, z) };
	}
	return null;
}

export function nearSnowmobile(state) {
	return (
		state.vehicle === "snowmobile" ||
		Math.hypot(state.x - state.snowmobile.x, state.z - state.snowmobile.z) < 5
	);
}

export function parkSnowmobile(state) {
	if (state.vehicle !== "snowmobile") return;
	Object.assign(state.snowmobile, {
		x: state.x,
		y: terrainHeight(state.x, state.z),
		z: state.z,
		heading: state.heading,
	});
	state.vehicle = "board";
}

export function toggleVehicle(state) {
	if (!nearSnowmobile(state)) return false;
	if (state.vehicle === "snowmobile") {
		const position = dismountPosition(state);
		if (!position) return false;
		parkSnowmobile(state);
		Object.assign(state, position);
	} else {
		state.vehicle = "snowmobile";
		Object.assign(state, state.snowmobile);
	}
	state.speed = 0;
	state.airborne = false;
	state.verticalSpeed = 0;
	state.trickRotation = 0;
	state.airTime = 0;
	state.grind = null;
	state.event = "";
	return true;
}
