import { terrainHeight } from "./terrain.js";

export const destructibles = [
	["crate", 30, 15],
	["crate", 33, 16],
	["snowman", -8, 18],
	["snowman", 12, 24],
	["fence", -18, 22],
	["crate", 45, -65],
	["crate", 48, -67],
	["snowman", 135, -70],
	["fence", 137, -65],
	["crate", 65, -116],
	["snowman", -85, -35],
	["fence", 27, -174],
].map(([type, x, z], index) => ({
	id: `breakable-${index}`,
	type,
	x,
	z,
	radius: type === "fence" ? 1.5 : type === "snowman" ? 0.8 : 0.95,
	height: type === "snowman" ? 2.7 : 1.6,
}));

export function updateDestruction(state) {
	const riderRadius = state.vehicle === "snowmobile" ? 1.1 : 0.65;
	for (const prop of destructibles) {
		if (state.destroyed.includes(prop.id)) continue;
		const dx = state.x - prop.x;
		const dz = state.z - prop.z;
		const distance = Math.hypot(dx, dz);
		const radius = prop.radius + riderRadius;
		if (
			distance >= radius ||
			state.y >= terrainHeight(prop.x, prop.z) + prop.height
		)
			continue;
		if (Math.abs(state.speed) >= 7) {
			state.destroyed.push(prop.id);
			state.score += 75;
			state.event = "smash";
			state.speed *= 0.88;
		} else {
			const nx = distance > 0.001 ? dx / distance : 1;
			const nz = distance > 0.001 ? dz / distance : 0;
			state.x += nx * (radius - distance);
			state.z += nz * (radius - distance);
			state.speed *= 0.35;
			if (!state.airborne) state.y = terrainHeight(state.x, state.z);
		}
	}
}
