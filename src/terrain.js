export const CHUNK_SIZE = 96;

export const ramps = [
	{ id: "first-air", x: 20, z: 8, width: 7, depth: 10, height: 3.6 },
	{ id: "lodge-line", x: 28, z: -45, width: 7, depth: 10, height: 3.6 },
	{ id: "park-one", x: 80, z: -57, width: 8, depth: 10, height: 3.2 },
	{ id: "park-two", x: 103, z: -81, width: 8, depth: 10, height: 3.2 },
	{ id: "park-three", x: 78, z: -99, width: 8, depth: 10, height: 3.2 },
	{ id: "big-air", x: 94, z: -133, width: 10, depth: 14, height: 5 },
];

export const halfpipe = { x: 120, z: -115, width: 18, length: 32, height: 5 };

export const rails = [
	{
		id: "park-long",
		x: 115,
		z: -60,
		length: 15,
		heading: 0,
		height: 1.2,
		radius: 0.22,
	},
	{
		id: "park-side",
		x: 61,
		z: -78,
		length: 11,
		heading: Math.PI / 2,
		height: 1,
		radius: 0.18,
	},
];

export const landmarks = [
	{ id: "lodge", name: "Basecamp Lodge", x: 0, z: 0, color: "#ffc68a" },
	{ id: "park", name: "Powder Playground", x: 90, z: -70, color: "#ff896c" },
	{ id: "lake", name: "Mirror Lake", x: -100, z: -70, color: "#8be6ff" },
	{ id: "summit", name: "Aurora Overlook", x: 40, z: -190, color: "#c7aeff" },
];

export const solids = [
	{ id: "chalet", x: -13, z: -9, width: 8, depth: 6, height: 7 },
	{ id: "fire", x: 13, z: -13, radius: 1.6, height: 1.2 },
	...[0, 0.25, 0.5, 0.75, 1].map((t, index) => ({
		id: `lift-tower-${index}`,
		x: -23 + 58 * t,
		z: -23 - 160 * t,
		radius: 0.3,
		height: 8,
	})),
];

export const crystals = [
	[0, -23],
	[17, -40],
	[42, -55],
	[67, -66],
	[94, -91],
	[73, -113],
	[57, -143],
	[43, -172],
	[20, -156],
	[-10, -125],
	[-43, -102],
	[-76, -85],
	[-106, -58],
	[-78, -41],
	[-47, -27],
	[-23, -12],
].map(([x, z], index) => ({ id: `crystal-${index}`, x, z }));

const smooth = (value) => {
	const t = Math.max(0, Math.min(1, value));
	return t * t * (3 - 2 * t);
};

export function terrainHeight(x, z) {
	const distance = Math.hypot(x, z);
	const hills =
		Math.sin(x / 55) * 3 + Math.sin(z / 63) * 4 + Math.sin((x + z) / 89) * 2;
	const summit = 24 * Math.exp(-((x - 40) ** 2 + (z + 190) ** 2) / 8500);
	let height = (hills + summit) * smooth((distance - 16) / 44);
	const lakeBlend = 1 - smooth((Math.hypot(x + 100, z + 70) - 23) / 16);
	height = height * (1 - lakeBlend) - 2.5 * lakeBlend;
	for (const ramp of ramps) {
		height +=
			ramp.height *
			Math.exp(
				-(
					(x - ramp.x) ** 2 / (ramp.width ** 2 / 2) +
					(z - ramp.z) ** 2 / (ramp.depth ** 2 * 0.19)
				),
			);
	}
	const pipeX = Math.abs(x - halfpipe.x);
	const pipeZ = Math.abs(z - halfpipe.z);
	const wall = smooth((pipeX - 2) / (halfpipe.width / 2 - 2));
	const outside = 1 - smooth((pipeX - halfpipe.width / 2) / 6);
	const ends = 1 - smooth((pipeZ - halfpipe.length / 2 + 5) / 9);
	height += halfpipe.height * wall * outside * ends;
	return height;
}

function random(seed) {
	const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return value - Math.floor(value);
}

function nearTrail(x, z) {
	const route = [{ x: 0, z: 10 }, ...crystals, { x: 0, z: 10 }];
	return route.some((point, index) => {
		if (!index) return false;
		const previous = route[index - 1];
		const dx = point.x - previous.x;
		const dz = point.z - previous.z;
		const t = Math.max(
			0,
			Math.min(
				1,
				((x - previous.x) * dx + (z - previous.z) * dz) / (dx * dx + dz * dz),
			),
		);
		return Math.hypot(x - previous.x - dx * t, z - previous.z - dz * t) < 7;
	});
}

export function treesForChunk(cx, cz) {
	const trees = [];
	for (let i = 0; i < 34; i += 1) {
		const seed = cx * 73856093 + cz * 19349663 + i * 83492791;
		const x = (cx + random(seed)) * CHUNK_SIZE;
		const z = (cz + random(seed + 11)) * CHUNK_SIZE;
		if (
			landmarks.some(
				(point) =>
					Math.hypot(x - point.x, z - point.z) <
					(point.id === "lake" ? 42 : 23),
			) ||
			nearTrail(x, z) ||
			ramps.some(
				(ramp) =>
					Math.abs(x - ramp.x) < ramp.width / 2 + 5 &&
					z > ramp.z - ramp.depth / 2 - 40 &&
					z < ramp.z + ramp.depth / 2 + 18,
			) ||
			(Math.abs(x - halfpipe.x) < 22 && Math.abs(z - halfpipe.z) < 35) ||
			rails.some((rail) => Math.hypot(x - rail.x, z - rail.z) < rail.length + 7)
		)
			continue;
		const height = 4 + random(seed + 29) * 6;
		trees.push({ x, z, radius: 0.55 + height * 0.055, height });
	}
	return trees;
}
