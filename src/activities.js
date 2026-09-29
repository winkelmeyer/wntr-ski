import { terrainHeight } from "./terrain.js";
import { nearSnowmobile, toggleVehicle } from "./vehicle.js";

export const raceGates = [
	{ x: 90, z: -70 },
	{ x: 65, z: -113 },
	{ x: 40, z: -164 },
	{ x: -12, z: -126 },
	{ x: -73, z: -82 },
	{ x: -53, z: -33 },
	{ x: 0, z: -18 },
	{ x: 57, z: -43 },
	{ x: 90, z: -70 },
];
export const liftBase = { x: -20.7, z: -23 };
export const liftTop = { x: 37.3, z: -183 };

export function nearbyActivity(state) {
	if (state.lift) return "JUMP OFF THE LIFT";
	if (state.vehicle === "snowmobile") return "PARK SNOWMOBILE";
	if (nearSnowmobile(state)) return "HOP ON SNOWMOBILE";
	if (state.race?.active) return "END SNOWFLAKE CIRCUIT";
	if (Math.hypot(state.x - liftBase.x, state.z - liftBase.z) < 12)
		return "RIDE TO THE OVERLOOK";
	if (Math.hypot(state.x - 90, state.z + 70) < 18)
		return "START SNOWFLAKE CIRCUIT";
	return "";
}

export function interact(state) {
	if (state.lift) {
		state.lift = null;
		state.airborne = true;
		state.verticalSpeed = 1;
		return "FRESH TRACKS FROM HERE.";
	}
	if (nearSnowmobile(state)) {
		toggleVehicle(state);
		return state.vehicle === "snowmobile"
			? "SNOWMOBILE! SHIFT TO BOOST · E TO PARK."
			: "BACK ON YOUR BOARD. SNOWMOBILE PARKED HERE.";
	}
	if (state.race?.active) {
		state.race = null;
		return "BACK TO TAKING IT EASY.";
	}
	if (Math.hypot(state.x - liftBase.x, state.z - liftBase.z) < 12) {
		state.lift = { progress: 0 };
		state.speed = 0;
		state.airborne = false;
		state.trickRotation = 0;
		return "NEXT STOP: THE OVERLOOK.";
	}
	if (Math.hypot(state.x - 90, state.z + 70) < 18) {
		state.race = { active: true, next: 1, elapsed: 0 };
		return "FOLLOW THE ORANGE RINGS. YOUR CLOCK IS RUNNING.";
	}
	return "";
}

export function advanceActivities(state, dt) {
	if (state.lift) {
		state.lift.progress = Math.min(1, state.lift.progress + dt / 22);
		const t = state.lift.progress;
		state.x = liftBase.x + (liftTop.x - liftBase.x) * t;
		state.z = liftBase.z + (liftTop.z - liftBase.z) * t;
		state.y =
			(terrainHeight(-23, -23) + 6.8) * (1 - t) +
			(terrainHeight(35, -183) + 7.8) * t;
		state.heading = Math.atan2(liftTop.x - liftBase.x, liftBase.z - liftTop.z);
		if (t === 1) {
			state.lift = null;
			state.airborne = true;
			state.verticalSpeed = 0;
			return "TOP OF THE WORLD. PICK YOUR OWN WAY DOWN.";
		}
	}
	if (state.race?.active) {
		state.race.elapsed += dt;
		const gate = raceGates[state.race.next];
		if (Math.hypot(state.x - gate.x, state.z - gate.z) < 7) {
			state.race.next += 1;
			if (state.race.next === raceGates.length) {
				state.race.active = false;
				state.bestRace = Math.min(
					state.bestRace ?? Infinity,
					state.race.elapsed,
				);
				state.score += 750;
				return `CIRCUIT COMPLETE · ${state.race.elapsed.toFixed(1)}s · +750`;
			}
			return `NICE LINE. ${state.race.next - 1} / ${raceGates.length - 1} GATES`;
		}
	}
	return "";
}
