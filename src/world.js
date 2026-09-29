import * as THREE from "three";
import { createDestructibles } from "./destructible-world.js";
import { createRider } from "./rider.js";
import { createScenery } from "./scenery.js";
import { createSnowmobile } from "./snowmobile.js";
import {
	CHUNK_SIZE,
	halfpipe,
	ramps,
	terrainHeight,
	treesForChunk,
} from "./terrain.js";

export function createWorld(canvas) {
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: "high-performance",
	});
	renderer.setPixelRatio(
		Math.min(
			devicePixelRatio,
			matchMedia("(pointer: coarse)").matches ? 1.4 : 1.75,
		),
	);
	renderer.setSize(innerWidth, innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xe9dfd2);
	scene.fog = new THREE.Fog(0xe9dfd2, 170, 290);
	const camera = new THREE.OrthographicCamera(-40, 40, 25, -25, 0.1, 600);
	scene.add(new THREE.HemisphereLight(0xe1f4f1, 0xb79b82, 2.4));
	const sun = new THREE.DirectionalLight(0xffe7c8, 3.2);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	Object.assign(sun.shadow.camera, {
		left: -65,
		right: 65,
		top: 65,
		bottom: -65,
		near: 1,
		far: 240,
	});
	sun.shadow.normalBias = 0.05;
	sun.shadow.bias = -0.0002;
	scene.add(sun, sun.target);
	const snow = new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness: 1,
		flatShading: false,
	});
	const pine = new THREE.MeshStandardMaterial({
		color: 0x487c78,
		roughness: 1,
		flatShading: true,
	});
	const snowCap = new THREE.MeshStandardMaterial({
		color: 0xf1f5ed,
		roughness: 1,
		flatShading: true,
	});
	const bark = new THREE.MeshStandardMaterial({
		color: 0x956f59,
		roughness: 1,
	});
	const foliageGeometry = new THREE.ConeGeometry(1, 1, 7);
	const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.19, 1, 6);
	const chunks = new Map();
	const transform = new THREE.Object3D();
	const color = new THREE.Color();
	function createChunk(cx, cz) {
		const root = new THREE.Group();
		const detailed = [...ramps, halfpipe].some(
			(feature) =>
				Math.abs(feature.x - (cx + 0.5) * CHUNK_SIZE) < CHUNK_SIZE / 2 + 25 &&
				Math.abs(feature.z - (cz + 0.5) * CHUNK_SIZE) < CHUNK_SIZE / 2 + 25,
		);
		const segments = detailed ? 64 : 32;
		const geometry = new THREE.PlaneGeometry(
			CHUNK_SIZE,
			CHUNK_SIZE,
			segments,
			segments,
		);
		geometry.rotateX(-Math.PI / 2);
		const positions = geometry.attributes.position;
		const colors = new Float32Array(positions.count * 3);
		for (let i = 0; i < positions.count; i++) {
			const x = positions.getX(i) + (cx + 0.5) * CHUNK_SIZE;
			const z = positions.getZ(i) + (cz + 0.5) * CHUNK_SIZE;
			const y = terrainHeight(x, z);
			positions.setXYZ(i, x, y, z);
			const tint = Math.sin(x * 0.06) * Math.cos(z * 0.04) * 0.025;
			color.setRGB(0.81 + tint, 0.9 + tint, 0.86 + tint);
			colors.set([color.r, color.g, color.b], i * 3);
		}
		geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geometry.computeVertexNormals();
		const terrain = new THREE.Mesh(geometry, snow);
		terrain.receiveShadow = true;
		root.add(terrain);
		const trees = treesForChunk(cx, cz);
		const trunks = new THREE.InstancedMesh(trunkGeometry, bark, trees.length);
		const needles = new THREE.InstancedMesh(
			foliageGeometry,
			pine,
			trees.length * 2,
		);
		const caps = new THREE.InstancedMesh(
			foliageGeometry,
			snowCap,
			trees.length * 2,
		);
		for (const [i, tree] of trees.entries()) {
			const height = tree.height || 5;
			const y = terrainHeight(tree.x, tree.z);
			transform.position.set(tree.x, y + height * 0.21, tree.z);
			transform.scale.set(height / 5, height * 0.42, height / 5);
			transform.updateMatrix();
			trunks.setMatrixAt(i, transform.matrix);
			for (let layer = 0; layer < 2; layer++) {
				const size = 1 - layer * 0.3;
				transform.position.set(
					tree.x,
					y + height * (0.46 + layer * 0.27),
					tree.z,
				);
				transform.scale.set(
					height * 0.3 * size,
					height * 0.68 * size,
					height * 0.3 * size,
				);
				transform.updateMatrix();
				needles.setMatrixAt(i * 2 + layer, transform.matrix);
				transform.position.y += height * 0.12;
				transform.scale.multiplyScalar(0.79);
				transform.updateMatrix();
				caps.setMatrixAt(i * 2 + layer, transform.matrix);
			}
		}
		for (const instance of [trunks, needles, caps]) {
			instance.castShadow = true;
			instance.receiveShadow = true;
			instance.computeBoundingSphere();
			root.add(instance);
		}
		scene.add(root);
		return { root, geometry };
	}
	function updateChunks(x, z) {
		const cx = Math.floor(x / CHUNK_SIZE);
		const cz = Math.floor(z / CHUNK_SIZE);
		const needed = new Set();
		for (let dx = -2; dx <= 2; dx++)
			for (let dz = -2; dz <= 2; dz++) {
				const key = `${cx + dx},${cz + dz}`;
				needed.add(key);
				if (!chunks.has(key)) chunks.set(key, createChunk(cx + dx, cz + dz));
			}
		for (const [key, chunk] of chunks)
			if (!needed.has(key)) {
				scene.remove(chunk.root);
				chunk.geometry.dispose();
				chunk.root.traverse((item) => {
					if (item.isInstancedMesh) item.dispose();
				});
				chunks.delete(key);
			}
	}
	const scenery = createScenery(scene);
	const destructibles = createDestructibles(scene);
	const snowmobile = createSnowmobile(scene);
	const { rider, update: updateRider } = createRider();
	scene.add(rider);
	const trailPositions = new Float32Array(3600 * 3);
	const trailGeometry = new THREE.BufferGeometry();
	trailGeometry.setAttribute(
		"position",
		new THREE.BufferAttribute(trailPositions, 3),
	);
	trailGeometry.setDrawRange(0, 0);
	const trail = new THREE.Points(
		trailGeometry,
		new THREE.PointsMaterial({
			color: 0x8eaaa8,
			size: 0.17,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
		}),
	);
	trail.frustumCulled = false;
	scene.add(trail);
	let trailIndex = 0;
	let trailCount = 0;
	let lastTrailX = Infinity;
	let lastTrailZ = Infinity;
	const target = new THREE.Vector3();
	const desiredTarget = new THREE.Vector3();
	const offset = new THREE.Vector3();
	let initialized = false;
	let angle = 0.65;
	let viewSize = 27;
	let previousMode;
	function resize() {
		const aspect = innerWidth / innerHeight;
		const halfHeight = aspect < 1 ? viewSize * 1.3 : viewSize;
		camera.left = -halfHeight * aspect;
		camera.right = halfHeight * aspect;
		camera.top = halfHeight;
		camera.bottom = -halfHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(innerWidth, innerHeight);
	}
	resize();
	addEventListener("resize", resize);
	function render(state, steer, time, mode, dt = 1 / 60) {
		if (mode !== previousMode) {
			viewSize = mode === "intro" ? 27 : 23;
			previousMode = mode;
			resize();
		}
		updateChunks(state.x, state.z);
		updateRider(state, steer, time);
		rider.visible = state.vehicle !== "snowmobile";
		snowmobile.update(state, time);
		scenery.update(state, time, dt);
		destructibles.update(state, mode === "ride" ? dt : 0);
		desiredTarget.set(state.x, terrainHeight(state.x, state.z) + 1, state.z);
		if (mode === "intro") desiredTarget.add(new THREE.Vector3(-1, 0, -5));
		target.lerp(desiredTarget, initialized ? 1 - Math.exp(-dt * 5) : 1);
		initialized = true;
		offset.set(Math.sin(angle) * 75, 64, Math.cos(angle) * 75);
		camera.position.copy(target).add(offset);
		camera.lookAt(target);
		sun.position.set(state.x - 45, state.y + 85, state.z + 35);
		sun.target.position.set(state.x, state.y, state.z);
		if (
			mode === "ride" &&
			!state.airborne &&
			!state.lift &&
			!state.grind &&
			Math.hypot(state.x - lastTrailX, state.z - lastTrailZ) > 0.2
		) {
			trailPositions.set(
				[state.x, terrainHeight(state.x, state.z) + 0.065, state.z],
				trailIndex * 3,
			);
			trailIndex = (trailIndex + 1) % 3600;
			trailCount = Math.min(3600, trailCount + 1);
			trailGeometry.setDrawRange(0, trailCount);
			trailGeometry.attributes.position.needsUpdate = true;
			lastTrailX = state.x;
			lastTrailZ = state.z;
		}
		renderer.render(scene, camera);
	}
	return {
		renderer,
		render,
		orbit(delta) {
			angle += delta;
		},
		zoom(delta) {
			viewSize = THREE.MathUtils.clamp(viewSize + delta, 16, 48);
			resize();
		},
		reset() {
			initialized = false;
			trailCount = 0;
			trailIndex = 0;
			lastTrailX = Infinity;
			lastTrailZ = Infinity;
			trailGeometry.setDrawRange(0, 0);
		},
		dispose() {
			removeEventListener("resize", resize);
			const geometries = new Set();
			const materials = new Set();
			scene.traverse((item) => {
				if (item.geometry) geometries.add(item.geometry);
				for (const material of Array.isArray(item.material)
					? item.material
					: [item.material])
					if (material) materials.add(material);
				if (item.isInstancedMesh) item.dispose();
			});
			for (const geometry of geometries) geometry.dispose();
			for (const material of materials) {
				material.map?.dispose();
				material.dispose();
			}
			renderer.dispose();
		},
	};
}
