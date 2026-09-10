export const courseLength = 2400;

export const courses = [
	{
		id: "north",
		name: "North Face",
		length: courseLength,
		description: "Rolling powder, wide turns, and room to find your flow.",
		difficulty: "Intermediate",
		timeLimit: 120,
		medalScore: 5000,
		color: "#adf4e5",
	},
	{
		id: "ridge",
		name: "Razor Ridge",
		length: 3200,
		description: "A narrow ridgeline. Tight carves. Keep your nerve.",
		difficulty: "Expert",
		timeLimit: 160,
		medalScore: 8500,
		color: "#ffb283",
	},
	{
		id: "glacier",
		name: "Blue Glacier",
		length: 4200,
		description: "Big mountain, bigger air. Make every landing count.",
		difficulty: "Extreme",
		timeLimit: 210,
		medalScore: 14000,
		color: "#b9b0ff",
	},
];

const terrainProfiles = {
	north: {
		slope: 0.16,
		wave: 3.2,
		frequency: 0.014,
		cross: 0.5,
		spacing: 180,
		ramp: 3,
		rampSpan: 17,
		width: 24,
		launch: 5.8,
	},
	ridge: {
		slope: 0.19,
		wave: 2.4,
		frequency: 0.022,
		cross: 1.4,
		spacing: 160,
		ramp: 3.8,
		rampSpan: 15,
		width: 19,
		launch: 6.4,
	},
	glacier: {
		slope: 0.18,
		wave: 4.5,
		frequency: 0.01,
		cross: 0.7,
		spacing: 210,
		ramp: 6,
		rampSpan: 25,
		width: 24,
		launch: 10,
	},
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function terrainHeight(x, z, course = "north") {
	const profile = terrainProfiles[course];
	if (!profile) throw new Error(`Unknown course: ${course}`);
	const distance = -z;
	const wave = Math.sin(distance * profile.frequency) * profile.wave;
	const crossSlope = Math.sin(x * 0.09) * profile.cross;
	const halfSpacing = profile.spacing / 2;
	const rampDistance =
		((((distance + halfSpacing) % profile.spacing) + profile.spacing) %
			profile.spacing) -
		halfSpacing;
	const ramp = Math.max(0, 1 - Math.abs(rampDistance) / profile.rampSpan);
	const rampWidth = Math.max(0, 1 - Math.abs(x) / 18);
	return (
		z * profile.slope +
		wave +
		crossSlope +
		ramp * ramp * rampWidth * profile.ramp
	);
}

export function createState(course = "north") {
	const selectedCourse = courses.find(({ id }) => id === course);
	if (!selectedCourse) throw new Error(`Unknown course: ${course}`);
	return {
		courseId: selectedCourse.id,
		courseLength: selectedCourse.length,
		timeLimit: selectedCourse.timeLimit,
		x: 0,
		z: 0,
		y: terrainHeight(0, 0, course),
		speed: 8,
		lateralSpeed: 0,
		verticalSpeed: 0,
		airborne: false,
		score: 0,
		distance: 0,
		combo: 1,
		crashes: 0,
		finished: false,
		event: "",
		trickRotation: 0,
		airTime: 0,
		invulnerable: 0,
		lastLandingScore: 0,
		elapsed: 0,
	};
}

export function crash(state) {
	if (state.finished || state.invulnerable > 0) return false;
	state.crashes += 1;
	state.speed = Math.max(3, state.speed * 0.3);
	state.lateralSpeed *= -0.25;
	state.combo = 1;
	state.airborne = false;
	state.verticalSpeed = 0;
	state.trickRotation = 0;
	state.airTime = 0;
	state.y = terrainHeight(state.x, state.z, state.courseId);
	state.invulnerable = 2;
	state.event = "crash";
	return true;
}

function advance(state, input, dt, jump) {
	const profile = terrainProfiles[state.courseId];
	const steer = clamp(Number(input.steer) || 0, -1, 1);
	state.invulnerable = Math.max(0, state.invulnerable - dt);
	state.elapsed += dt;
	const acceleration = input.brake ? -14 : input.tuck ? 5.5 : 3.4;
	const topSpeed = input.tuck ? 32 : 25;
	const drag = state.speed > topSpeed ? 5 : Math.abs(steer) * 0.8;
	const oldSpeed = state.speed;
	state.speed = clamp(state.speed + (acceleration - drag) * dt, 3, 32);
	if (!input.tuck && state.speed > topSpeed && oldSpeed <= topSpeed) {
		state.speed = topSpeed;
	}
	const targetLateral = steer * state.speed * (state.airborne ? 0.3 : 0.65);
	state.lateralSpeed +=
		(targetLateral - state.lateralSpeed) * (1 - Math.exp(-8 * dt));
	state.x += state.lateralSpeed * dt;
	if (Math.abs(state.x) > profile.width) {
		state.x = clamp(state.x, -profile.width, profile.width);
		state.lateralSpeed = 0;
		state.speed = Math.max(3, state.speed - 12 * dt);
	}
	const previousDistance = state.distance;
	state.z -= (oldSpeed + state.speed) * 0.5 * (1 - Math.abs(steer) * 0.16) * dt;
	state.distance = Math.min(state.courseLength, -state.z);
	const crossedRamp =
		Math.floor(previousDistance / profile.spacing) <
		Math.floor(state.distance / profile.spacing);
	if (
		!state.airborne &&
		(jump || (crossedRamp && Math.abs(state.x) < 14 && state.speed > 12))
	) {
		state.airborne = true;
		state.verticalSpeed = jump ? 7.8 : profile.launch;
		state.trickRotation = 0;
		state.airTime = 0;
		state.event = "jump";
	}
	const ground = terrainHeight(state.x, state.z, state.courseId);
	if (state.airborne) {
		state.airTime += dt;
		state.y += state.verticalSpeed * dt - 9 * dt * dt;
		state.verticalSpeed -= 18 * dt;
		if (input.trick) state.trickRotation += dt * Math.PI * 2.8;
		if (state.y <= ground && state.verticalSpeed < 0) {
			const spins = Math.floor(state.trickRotation / (Math.PI * 2));
			state.lastLandingScore = Math.round(
				(state.airTime * 40 + spins * 250) * state.combo,
			);
			state.score += state.lastLandingScore;
			state.combo = spins > 0 ? Math.min(5, state.combo + 1) : 1;
			state.airborne = false;
			state.verticalSpeed = 0;
			state.trickRotation = 0;
			state.event = spins > 0 ? "trick" : "land";
			state.y = ground;
		}
	} else {
		state.y = ground;
	}
	if (state.distance >= state.courseLength) {
		state.z = -state.courseLength;
		state.y = Math.max(
			state.y,
			terrainHeight(state.x, state.z, state.courseId),
		);
		state.finished = true;
		state.score += 1000;
		state.event = "finish";
	}
}

export function step(state, input = {}, dt = 1 / 60) {
	state.event = "";
	if (state.finished || !Number.isFinite(dt) || dt <= 0) return state;
	const duration = Math.min(dt, 0.25);
	const count = Math.ceil(duration * 120);
	for (let i = 0; i < count && !state.finished; i += 1) {
		advance(state, input, duration / count, Boolean(input.jump) && i === 0);
	}
	return state;
}
