import { rails, terrainHeight } from "./terrain.js";

export function attachGrind(state) {
	if (
		state.vehicle !== "board" ||
		state.grind ||
		state.grindCooldown > 0 ||
		Math.abs(state.speed) < 5
	)
		return;
	for (const rail of rails) {
		const fx = Math.sin(rail.heading);
		const fz = -Math.cos(rail.heading);
		const dx = state.x - rail.x;
		const dz = state.z - rail.z;
		const progress = dx * fx + dz * fz;
		const across = Math.abs(dx * fz - dz * fx);
		const alignment =
			Math.cos(state.heading - rail.heading) * Math.sign(state.speed);
		const height = terrainHeight(rail.x, rail.z) + rail.height;
		if (
			Math.abs(progress) > rail.length / 2 ||
			across > 0.8 ||
			Math.abs(alignment) < 0.82
		)
			continue;
		if (
			state.airborne &&
			(state.verticalSpeed > 0 || Math.abs(state.y - height) > 0.45)
		)
			continue;
		const direction = Math.sign(alignment);
		state.grind = { id: rail.id, direction, progress };
		state.heading = rail.heading + (direction < 0 ? Math.PI : 0);
		state.speed = Math.abs(state.speed);
		state.x = rail.x + fx * progress;
		state.z = rail.z + fz * progress;
		state.y = height;
		state.airborne = false;
		state.verticalSpeed = 0;
		state.trickRotation = 0;
		state.event = "grindStart";
		return;
	}
}

export function advanceGrind(state, input, dt, jump) {
	const rail = rails.find(({ id }) => id === state.grind.id);
	if (!rail) throw new Error(`Unknown rail: ${state.grind.id}`);
	const endGrind = () => {
		state.grind = null;
		state.grindCooldown = 0.7;
		state.airborne = true;
		state.verticalSpeed = jump ? 8 : 1;
		state.airTime = 0;
		state.trickRotation = 0;
		state.combo = Math.min(5, state.combo + 1);
		state.event = "grindEnd";
	};
	if (jump) {
		endGrind();
		return false;
	}
	state.speed = Math.max(0, state.speed + (input.brake ? -18 : -0.8) * dt);
	const travel = state.speed * dt;
	const next = state.grind.progress + travel * state.grind.direction;
	const progress = Math.max(-rail.length / 2, Math.min(rail.length / 2, next));
	const distance = Math.abs(progress - state.grind.progress);
	state.grind.progress = progress;
	state.x = rail.x + Math.sin(rail.heading) * progress;
	state.z = rail.z - Math.cos(rail.heading) * progress;
	state.y = terrainHeight(rail.x, rail.z) + rail.height;
	state.distance += distance;
	state.score += distance * 20 * state.combo;
	if (Math.abs(next) >= rail.length / 2 || state.speed < 1) endGrind();
	return true;
}
