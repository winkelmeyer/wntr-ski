import * as THREE from "three";
import { terrainHeight } from "./physics.js";

const snow = new THREE.MeshStandardMaterial({
	color: 0xe6eeed,
	roughness: 0.92,
	flatShading: true,
});
const bark = new THREE.MeshStandardMaterial({ color: 0x344b50, roughness: 1 });
const pine = new THREE.MeshStandardMaterial({
	color: 0x335b60,
	roughness: 1,
	flatShading: true,
});
const orange = new THREE.MeshStandardMaterial({
	color: 0xfc6534,
	roughness: 0.6,
});
const dark = new THREE.MeshStandardMaterial({
	color: 0x142c3b,
	roughness: 0.7,
});

function mesh(geometry, material, parent, x, y, z) {
	const item = new THREE.Mesh(geometry, material);
	item.position.set(x, y, z);
	item.castShadow = true;
	item.receiveShadow = true;
	parent.add(item);
	return item;
}

export function createWorld(canvas, courseId = "north", boardColor = 0xfc6534) {
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: "high-performance",
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
	renderer.setSize(innerWidth, innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xaecbd7);
	scene.fog = new THREE.FogExp2(
		0xb8d0db,
		courseId === "ridge" ? 0.005 : 0.0038,
	);
	const camera = new THREE.PerspectiveCamera(
		58,
		innerWidth / innerHeight,
		0.1,
		1400,
	);
	scene.add(new THREE.HemisphereLight(0xd7edff, 0x627983, 2.8));
	const sun = new THREE.DirectionalLight(0xffead0, 3.4);
	sun.position.set(-90, 120, 30);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, {
		left: -55,
		right: 55,
		top: 65,
		bottom: -65,
		near: 1,
		far: 350,
	});
	sun.shadow.bias = -0.001;
	scene.add(sun, sun.target);
	const geometry = new THREE.PlaneGeometry(320, 4600, 80, 1000);
	geometry.rotateX(-Math.PI / 2);
	const positions = geometry.attributes.position;
	const colors = [];
	const color = new THREE.Color();
	for (let i = 0; i < positions.count; i++) {
		const x = positions.getX(i);
		const z = positions.getZ(i) - 2150;
		const bank = Math.max(0, Math.abs(x) - 25);
		positions.setXYZ(
			i,
			x,
			terrainHeight(x, z, courseId) + bank * bank * 0.006,
			z,
		);
		color.setHex(i % 7 === 0 ? 0xd4e4e8 : 0xe9f1ef);
		colors.push(color.r, color.g, color.b);
	}
	geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	geometry.computeVertexNormals();
	const ground = new THREE.Mesh(
		geometry,
		new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
	);
	ground.receiveShadow = true;
	scene.add(ground);
	const mountains = new THREE.Group();
	for (let i = 0; i < 25; i++) {
		const radius = 55 + random(i + 83) * 90;
		const height = 100 + random(i + 15) * 220;
		const peak = mesh(
			new THREE.ConeGeometry(radius, height, 5, 3),
			snow,
			mountains,
			Math.cos(i * 2.4) * (270 + random(i) * 180),
			height * 0.28 - 55,
			-270 - random(i + 6) * 500,
		);
		peak.rotation.y = i * 0.7;
	}
	scene.add(mountains);
	const obstacles = [];
	const trunkGeometry = new THREE.CylinderGeometry(0.17, 0.28, 2, 5);
	const pineGeometry = new THREE.ConeGeometry(1.5, 4, 6);
	const snowGeometry = new THREE.ConeGeometry(1.28, 3.4, 6);
	const treeParts = new Map();
	for (let i = 0; i < 1050; i++) {
		const z = 50 - random(i + 202) * 4400;
		const side = i % 2 ? -1 : 1;
		const x = side * (13 + random(i + 44) * 94);
		if (z > -70 && Math.abs(x) < 22) continue;
		const bank = Math.max(0, Math.abs(x) - 25);
		const y = terrainHeight(x, z, courseId) + bank * bank * 0.006;
		const tree = new THREE.Group();
		const scale = 0.8 + random(i + 99) * 1.9;
		tree.position.set(x, y, z);
		tree.scale.setScalar(scale);
		mesh(trunkGeometry, bark, tree, 0, 0.9, 0);
		for (let level = 0; level < 3; level++) {
			const layer = mesh(pineGeometry, pine, tree, 0, 2.4 + level * 1.2, 0);
			layer.scale.setScalar(1 - level * 0.22);
			const cap = mesh(snowGeometry, snow, tree, 0, 2.85 + level * 1.2, 0);
			cap.scale.setScalar(1 - level * 0.22);
		}
		tree.updateMatrixWorld(true);
		tree.traverse((part) => {
			if (!part.isMesh) return;
			const key = `${part.geometry.uuid}:${part.material.uuid}`;
			if (!treeParts.has(key))
				treeParts.set(key, {
					geometry: part.geometry,
					material: part.material,
					matrices: [],
				});
			treeParts.get(key).matrices.push(part.matrixWorld.clone());
		});
		if (Math.abs(x) < 27) obstacles.push({ x, z, radius: scale * 1.1 });
	}
	for (const {
		geometry: partGeometry,
		material,
		matrices,
	} of treeParts.values()) {
		const instance = new THREE.InstancedMesh(
			partGeometry,
			material,
			matrices.length,
		);
		matrices.forEach((matrix, index) => {
			instance.setMatrixAt(index, matrix);
		});
		instance.castShadow = true;
		instance.receiveShadow = true;
		scene.add(instance);
	}
	for (let i = 0; i < 44; i++) {
		const z = -i * 100 - 30;
		for (const x of [-24, 24]) {
			const y = terrainHeight(x, z, courseId);
			mesh(
				new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5),
				dark,
				scene,
				x,
				y + 1.3,
				z,
			);
			mesh(
				new THREE.BoxGeometry(0.7, 0.45, 0.06),
				orange,
				scene,
				x,
				y + 2.25,
				z,
			);
		}
	}
	const rider = new THREE.Group();
	const boardMaterial = orange.clone();
	boardMaterial.color.set(boardColor);
	const board = mesh(
		new THREE.CapsuleGeometry(0.2, 1.9, 4, 10),
		boardMaterial,
		rider,
		0,
		0.16,
		0,
	);
	board.rotation.z = Math.PI / 2;
	board.scale.z = 0.2;
	const body = new THREE.Group();
	body.position.y = 0.25;
	mesh(new THREE.BoxGeometry(0.62, 0.85, 0.42), orange, body, 0, 1.16, 0);
	const head = mesh(
		new THREE.SphereGeometry(0.27, 16, 12),
		dark,
		body,
		0,
		1.87,
		0,
	);
	head.scale.y = 1.05;
	const goggles = mesh(
		new THREE.BoxGeometry(0.41, 0.12, 0.19),
		new THREE.MeshStandardMaterial({
			color: 0xf6c974,
			metalness: 0.7,
			roughness: 0.2,
		}),
		body,
		0,
		1.9,
		-0.22,
	);
	goggles.rotation.y = -0.15;
	for (const side of [-1, 1]) {
		const leg = mesh(
			new THREE.CapsuleGeometry(0.13, 0.52, 3, 6),
			dark,
			body,
			side * 0.25,
			0.45,
			0,
		);
		leg.rotation.z = side * -0.32;
		const arm = mesh(
			new THREE.CapsuleGeometry(0.12, 0.55, 3, 6),
			orange,
			body,
			side * 0.52,
			1.25,
			0,
		);
		arm.rotation.z = side * 1.03;
		mesh(
			new THREE.SphereGeometry(0.14, 6, 6),
			dark,
			body,
			side * 0.87,
			1.06,
			0,
		);
	}
	mesh(new THREE.BoxGeometry(0.42, 0.55, 0.23), dark, body, 0, 1.2, 0.29);
	rider.add(body);
	scene.add(rider);
	const particlePositions = new Float32Array(450 * 3);
	const particles = new THREE.BufferGeometry();
	particles.setAttribute(
		"position",
		new THREE.BufferAttribute(particlePositions, 3),
	);
	const powder = new THREE.Points(
		particles,
		new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.13,
			transparent: true,
			opacity: 0.65,
			depthWrite: false,
		}),
	);
	scene.add(powder);
	const trailGeometry = new THREE.BufferGeometry();
	const trailPositions = new Float32Array(1800 * 3);
	trailGeometry.setAttribute(
		"position",
		new THREE.BufferAttribute(trailPositions, 3),
	);
	trailGeometry.setDrawRange(0, 0);
	const trail = new THREE.Points(
		trailGeometry,
		new THREE.PointsMaterial({
			color: 0x9dbbc9,
			size: 0.26,
			transparent: true,
			opacity: 0.45,
		}),
	);
	scene.add(trail);
	let trailIndex = 0;
	let trailCount = 0;
	const desired = new THREE.Vector3();
	const look = new THREE.Vector3();
	let initialized = false;
	function render(state, steer, time, mode) {
		rider.position.set(state.x, state.y, state.z);
		rider.rotation.set(
			0,
			(state.trickRotation || 0) + steer * -0.4,
			steer * -0.18,
		);
		body.rotation.z = steer * -0.2;
		body.position.y = state.airborne ? 0.02 : 0.25;
		if (mode === "intro") {
			desired.set(-18 + Math.sin(time * 0.08) * 2, 10, 24);
			look.set(-8, 2, -40);
		} else {
			desired.set(state.x * 0.75 + steer * 1.3, state.y + 5.2, state.z + 10.5);
			look.set(state.x + steer * 2, state.y + 0.5, state.z - 12);
		}
		camera.position.lerp(desired, initialized ? 0.08 : 1);
		initialized = true;
		camera.lookAt(look);
		const targetFov = mode === "intro" ? 58 : 60 + state.speed * 0.48;
		camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.035);
		camera.updateProjectionMatrix();
		sun.position.set(state.x - 70, state.y + 110, state.z + 35);
		sun.target.position.copy(rider.position);
		mountains.position.z = state.z * 0.9;
		mountains.position.y = state.y;
		for (let i = 0; i < 450; i++) {
			const age = (time * (state.speed > 1 ? 0.9 : 0.13) + random(i) * 3) % 1;
			particlePositions[i * 3] =
				state.x + (random(i + 42) - 0.5) * (i < 180 ? 2.8 : 55);
			particlePositions[i * 3 + 1] =
				state.y + (i < 180 ? age * 1.2 : random(i + 98) * 18);
			particlePositions[i * 3 + 2] =
				state.z + (i < 180 ? age * 8 : (random(i + 21) - 0.5) * 60);
		}
		particles.attributes.position.needsUpdate = true;
		if (mode === "ride" && !state.airborne) {
			trailPositions.set(
				[state.x, terrainHeight(state.x, state.z, courseId) + 0.045, state.z],
				trailIndex * 3,
			);
			trailIndex = (trailIndex + 1) % 1800;
			trailCount = Math.min(1800, trailCount + 1);
			trailGeometry.setDrawRange(0, trailCount);
			trailGeometry.attributes.position.needsUpdate = true;
		}
		renderer.render(scene, camera);
	}
	const resize = () => {
		camera.aspect = innerWidth / innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(innerWidth, innerHeight);
	};
	addEventListener("resize", resize);
	return {
		renderer,
		render,
		obstacles,
		dispose: () => {
			renderer.setAnimationLoop(null);
			removeEventListener("resize", resize);
			scene.traverse((item) => {
				item.geometry?.dispose();
				if (
					item.material &&
					![snow, bark, pine, orange, dark].includes(item.material)
				)
					item.material.dispose();
			});
			renderer.dispose();
		},
		reset: () => {
			initialized = false;
			trailCount = 0;
			trailIndex = 0;
			trailGeometry.setDrawRange(0, 0);
		},
	};
}

function random(seed) {
	const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return value - Math.floor(value);
}
