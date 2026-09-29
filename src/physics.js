import { updateDestruction } from "./destruction.js";
import { advanceGrind, attachGrind } from "./park-physics.js";
import {
	CHUNK_SIZE,
	crystals,
	landmarks,
	solids,
	terrainHeight,
	treesForChunk,
} from "./terrain.js";
import { parkSnowmobile } from "./vehicle.js";

export { terrainHeight } from "./terrain.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const gravity = 18;
const treeCache = new Map();

function nearbyTrees(x, z) {
	const cx = Math.floor(x / CHUNK_SIZE);
	const cz = Math.floor(z / CHUNK_SIZE);
	const trees = [];
	for (let dx = -1; dx <= 1; dx += 1) {
		for (let dz = -1; dz <= 1; dz += 1) {
			const key = `${cx + dx},${cz + dz}`;
			if (!treeCache.has(key))
				treeCache.set(key, treesForChunk(cx + dx, cz + dz));
			trees.push(...treeCache.get(key));
		}
	}
	if (treeCache.size > 100) treeCache.clear();
	return trees;
}

export function createState() {
	return {
		x: 0,
		vehicle: "board",
		snowmobile: { x: 10, y: terrainHeight(10, 10), z: 10, heading: 0 },
		grind: null,
		grindCooldown: 0,
		y: terrainHeight(0, 10),
		z: 10,
		heading: 0,
		speed: 0,
		airborne: false,
		verticalSpeed: 0,
		trickRotation: 0,
		airTime: 0,
		score: 0,
		distance: 0,
		elapsed: 0,
		crashes: 0,
		event: "",
		lastLandingScore: 0,
		combo: 1,
		invulnerable: 0,
		destroyed: [],
		visited: [],
		collected: [],
		props: [
			[7, -9],
			[-9, -15],
			[84, -70],
			[-84, -49],
		].map(([x, z], id) => ({
			id: `snowball-${id}`,
			x,
			z,
			y: terrainHeight(x, z) + 1,
			vx: 0,
			vz: 0,
			radius: 1,
		})),
	};
}

export function respawn(state) {
	parkSnowmobile(state);
	Object.assign(state, {
		x: 0,
		z: 10,
		y: terrainHeight(0, 10),
		heading: 0,
		speed: 0,
		airborne: false,
		verticalSpeed: 0,
		trickRotation: 0,
		airTime: 0,
		invulnerable: 1,
		grind: null,
		grindCooldown: 0,
		event: "",
		combo: 1,
	});
	return state;
}

function crash(state) {
	if (state.invulnerable > 0) return;
	state.crashes += 1;
	state.speed *= -0.2;
	state.combo = 1;
	state.invulnerable = 1.4;
	state.event = "crash";
}

function contact(body, obstacle, radius, bottom) {
	if (
		Math.abs(body.x - obstacle.x) >
			(obstacle.width ? obstacle.width / 2 : obstacle.radius) + radius ||
		Math.abs(body.z - obstacle.z) >
			(obstacle.depth ? obstacle.depth / 2 : obstacle.radius) + radius
	)
		return null;
	if (bottom > terrainHeight(obstacle.x, obstacle.z) + obstacle.height)
		return null;
	let dx = body.x - obstacle.x;
	let dz = body.z - obstacle.z;
	if (obstacle.width) {
		const halfWidth = obstacle.width / 2;
		const halfDepth = obstacle.depth / 2;
		const closestX = clamp(dx, -halfWidth, halfWidth);
		const closestZ = clamp(dz, -halfDepth, halfDepth);
		if (Math.abs(dx) <= halfWidth && Math.abs(dz) <= halfDepth) {
			const edgeX = halfWidth - Math.abs(dx);
			const edgeZ = halfDepth - Math.abs(dz);
			return edgeX < edgeZ
				? { nx: Math.sign(dx) || 1, nz: 0, overlap: radius + edgeX }
				: { nx: 0, nz: Math.sign(dz) || 1, overlap: radius + edgeZ };
		}
		dx -= closestX;
		dz -= closestZ;
	} else radius += obstacle.radius;
	const distance = Math.hypot(dx, dz);
	if (distance >= radius) return null;
	return {
		nx: distance > 0.001 ? dx / distance : 1,
		nz: distance > 0.001 ? dz / distance : 0,
		overlap: radius - distance,
	};
}

function separate(body, hit) {
	body.x += hit.nx * hit.overlap;
	body.z += hit.nz * hit.overlap;
}

function collideBall(ball, obstacles) {
	for (const obstacle of obstacles) {
		const hit = contact(ball, obstacle, ball.radius, ball.y - ball.radius);
		if (!hit) continue;
		separate(ball, hit);
		const approach = ball.vx * hit.nx + ball.vz * hit.nz;
		if (approach < 0) {
			ball.vx -= hit.nx * approach * 1.35;
			ball.vz -= hit.nz * approach * 1.35;
		}
	}
	ball.y = terrainHeight(ball.x, ball.z) + ball.radius;
}

function collideBalls(balls) {
	for (let i = 0; i < balls.length; i += 1) {
		for (let j = i + 1; j < balls.length; j += 1) {
			const first = balls[i];
			const second = balls[j];
			const dx = second.x - first.x;
			const dz = second.z - first.z;
			const distance = Math.hypot(dx, dz);
			const overlap = first.radius + second.radius - distance;
			if (overlap <= 0) continue;
			const nx = distance > 0.001 ? dx / distance : 1;
			const nz = distance > 0.001 ? dz / distance : 0;
			separate(first, { nx: -nx, nz: -nz, overlap: overlap / 2 });
			separate(second, { nx, nz, overlap: overlap / 2 });
			const approach =
				(first.vx - second.vx) * nx + (first.vz - second.vz) * nz;
			if (approach <= 0) continue;
			const impulse = approach * 0.7;
			first.vx -= nx * impulse;
			first.vz -= nz * impulse;
			second.vx += nx * impulse;
			second.vz += nz * impulse;
		}
	}
}

function advance(state, input, dt, jump, obstacles, ballObstacles) {
	const throttle = clamp(Number(input.throttle) || 0, -1, 1);
	const steer = clamp(Number(input.steer) || 0, -1, 1);
	state.elapsed += dt;
	state.invulnerable = Math.max(0, state.invulnerable - dt);
	state.grindCooldown = Math.max(0, state.grindCooldown - dt);
	if (state.grind && advanceGrind(state, input, dt, jump)) return;
	const mounted = state.vehicle === "snowmobile";
	state.heading += steer * (mounted ? 1.5 : state.airborne ? 1.3 : 2.1) * dt;
	const forwardX = Math.sin(state.heading);
	const forwardZ = -Math.cos(state.heading);
	const beforeGround = terrainHeight(state.x, state.z);
	const slope =
		terrainHeight(state.x + forwardX * 0.5, state.z + forwardZ * 0.5) -
		terrainHeight(state.x - forwardX * 0.5, state.z - forwardZ * 0.5);
	const oldSpeed = state.speed;
	const push =
		throttle *
		(mounted
			? input.boost && throttle > 0
				? 22
				: 14
			: input.boost && throttle > 0
				? 14
				: 9);
	const acceleration = push - (state.airborne ? 0 : slope * 10);
	state.speed += acceleration * dt;
	const friction = input.brake ? 20 : throttle ? 0.8 : 2.5;
	state.speed =
		Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - friction * dt);
	state.speed =
		clamp(
			state.speed,
			mounted ? -12 : -10,
			mounted ? (input.boost ? 44 : 32) : input.boost ? 29 : 20,
		) || 0;
	const travel = (oldSpeed + state.speed) * 0.5 * dt;
	state.x += forwardX * travel;
	state.z += forwardZ * travel;
	state.distance += Math.abs(travel);
	const ground = terrainHeight(state.x, state.z);
	const afterSlope =
		terrainHeight(state.x + forwardX * 0.5, state.z + forwardZ * 0.5) -
		terrainHeight(state.x - forwardX * 0.5, state.z - forwardZ * 0.5);
	const crest = state.speed > 10 && slope > 0.12 && slope - afterSlope > 0.035;
	if (!state.airborne && (jump || crest)) {
		state.airborne = true;
		state.verticalSpeed = jump
			? mounted
				? 4.5
				: 8
			: Math.max(6, state.speed * slope);
		state.airTime = 0;
		state.trickRotation = 0;
		state.y = Math.max(state.y, beforeGround, ground);
		state.event = "jump";
	}
	if (state.airborne) {
		state.airTime += dt;
		state.y += state.verticalSpeed * dt - (gravity * dt * dt) / 2;
		state.verticalSpeed -= gravity * dt;
		if (input.trick && !mounted) state.trickRotation += dt * Math.PI * 3;
		if (state.y <= ground) {
			const spins = Math.floor(state.trickRotation / (Math.PI * 2));
			state.lastLandingScore = Math.round(
				(state.airTime * 30 + spins * 200) * state.combo,
			);
			state.score += state.lastLandingScore;
			state.combo = spins ? Math.min(5, state.combo + 1) : 1;
			state.airborne = false;
			state.verticalSpeed = 0;
			state.trickRotation = 0;
			state.y = ground;
			state.event = spins ? "trick" : "land";
		}
	} else state.y = ground;
	updateDestruction(state);
	for (const obstacle of obstacles) {
		const hit = contact(state, obstacle, mounted ? 1.1 : 0.65, state.y);
		if (!hit) continue;
		separate(state, hit);
		crash(state);
		if (!state.airborne) state.y = terrainHeight(state.x, state.z);
	}
	for (const ball of state.props) {
		const dx = ball.x - state.x;
		const dz = ball.z - state.z;
		const distance = Math.hypot(dx, dz);
		const radius = ball.radius + (mounted ? 1.1 : 0.7);
		if (distance < radius && state.y < ball.y + ball.radius) {
			const nx = distance > 0.001 ? dx / distance : forwardX;
			const nz = distance > 0.001 ? dz / distance : forwardZ;
			ball.x = state.x + nx * radius;
			ball.z = state.z + nz * radius;
			const impulse = Math.max(2, Math.abs(state.speed) * 0.9);
			ball.vx = nx * impulse;
			ball.vz = nz * impulse;
			state.speed *= 0.96;
			if (!state.event) state.event = "snowball";
		}
		ball.vx -=
			(terrainHeight(ball.x + 0.5, ball.z) -
				terrainHeight(ball.x - 0.5, ball.z)) *
			4 *
			dt;
		ball.vz -=
			(terrainHeight(ball.x, ball.z + 0.5) -
				terrainHeight(ball.x, ball.z - 0.5)) *
			4 *
			dt;
		ball.x += ball.vx * dt;
		ball.z += ball.vz * dt;
		ball.vx *= Math.exp(-1.2 * dt);
		ball.vz *= Math.exp(-1.2 * dt);
		ball.y = terrainHeight(ball.x, ball.z) + ball.radius;
	}
	collideBalls(state.props);
	for (let index = 0; index < state.props.length; index += 1) {
		collideBall(state.props[index], ballObstacles[index]);
	}
	attachGrind(state);
	for (const landmark of landmarks) {
		if (
			!state.visited.includes(landmark.id) &&
			Math.hypot(state.x - landmark.x, state.z - landmark.z) < 16
		) {
			state.visited.push(landmark.id);
			state.score += 100;
			state.event = "discovery";
		}
	}
	for (const crystal of crystals) {
		if (
			!state.collected.includes(crystal.id) &&
			Math.hypot(state.x - crystal.x, state.z - crystal.z) < 3 &&
			state.y < terrainHeight(crystal.x, crystal.z) + 5
		) {
			state.collected.push(crystal.id);
			state.score += 150;
			state.event = "collect";
		}
	}
}

export function step(state, input = {}, dt = 1 / 60) {
	state.event = "";
	if (!Number.isFinite(dt) || dt <= 0) return state;
	const duration = Math.min(dt, 0.25);
	const count = Math.ceil(duration * 120);
	const obstacles = [...solids, ...nearbyTrees(state.x, state.z)];
	const ballObstacles = state.props.map((ball) => [
		...solids,
		...nearbyTrees(ball.x, ball.z),
	]);
	for (let i = 0; i < count; i += 1) {
		advance(
			state,
			input,
			duration / count,
			Boolean(input.jump) && i === 0,
			obstacles,
			ballObstacles,
		);
	}
	if (state.vehicle === "snowmobile") {
		Object.assign(state.snowmobile, {
			x: state.x,
			y: state.y,
			z: state.z,
			heading: state.heading,
		});
	}
	return state;
}
