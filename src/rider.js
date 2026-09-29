import * as THREE from "three";
import { terrainHeight } from "./terrain.js";

export function createRider() {
	const rider = new THREE.Group();
	rider.scale.setScalar(1.3);
	const body = new THREE.Group();
	const orange = new THREE.MeshStandardMaterial({
		color: 0xf66b3c,
		roughness: 0.8,
	});
	const dark = new THREE.MeshStandardMaterial({
		color: 0x26484e,
		roughness: 0.8,
	});
	const gold = new THREE.MeshStandardMaterial({
		color: 0xffd78d,
		roughness: 0.25,
		metalness: 0.35,
	});
	function part(geometry, material, x, y, z, parent = body) {
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(x, y, z);
		mesh.castShadow = true;
		parent.add(mesh);
		return mesh;
	}
	const board = part(
		new THREE.CapsuleGeometry(0.29, 1.7, 5, 12),
		dark,
		0,
		0.17,
		0,
		rider,
	);
	board.rotation.x = Math.PI / 2;
	board.scale.z = 0.17;
	for (const z of [-0.92, 0.92]) {
		const tip = part(
			new THREE.SphereGeometry(0.28, 12, 8),
			orange,
			0,
			0.2,
			z,
			rider,
		);
		tip.scale.set(1, 0.17, 1);
	}
	part(new THREE.CapsuleGeometry(0.36, 0.55, 6, 10), orange, 0, 1.16, 0);
	part(new THREE.SphereGeometry(0.34, 12, 10), dark, 0, 1.95, -0.05);
	const goggles = part(
		new THREE.SphereGeometry(0.3, 12, 8),
		gold,
		0,
		1.97,
		-0.24,
	);
	goggles.scale.set(0.9, 0.39, 0.45);
	for (const side of [-1, 1]) {
		const leg = part(
			new THREE.CapsuleGeometry(0.15, 0.45, 4, 8),
			dark,
			side * 0.17,
			0.52,
			side * 0.31,
		);
		leg.rotation.x = side * 0.25;
		const arm = part(
			new THREE.CapsuleGeometry(0.15, 0.53, 4, 8),
			orange,
			side * 0.52,
			1.26,
			0,
		);
		arm.rotation.z = side * 0.9;
		part(new THREE.SphereGeometry(0.17, 8, 8), dark, side * 0.82, 1.01, 0);
	}
	const pack = part(
		new THREE.CapsuleGeometry(0.23, 0.25, 4, 8),
		gold,
		0,
		1.22,
		0.33,
	);
	pack.scale.z = 0.55;
	rider.add(body);
	return {
		rider,
		update(state, steer, time) {
			rider.position.set(state.x, state.y + 0.03, state.z);
			const dx = Math.sin(state.heading) * 0.9;
			const dz = -Math.cos(state.heading) * 0.9;
			const pitch =
				state.airborne || state.lift || state.grind
					? 0
					: Math.atan2(
							terrainHeight(state.x + dx, state.z + dz) -
								terrainHeight(state.x - dx, state.z - dz),
							1.8,
						);
			rider.rotation.set(
				pitch,
				-state.heading + (state.trickRotation || 0),
				-steer * 0.13,
				"YXZ",
			);
			body.position.y = state.airborne
				? -0.12
				: Math.sin(time * 8) * Math.min(state.speed / 200, 0.035);
			body.rotation.z = -steer * 0.12;
		},
	};
}
