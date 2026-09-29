import * as THREE from "three";
import { terrainHeight } from "./terrain.js";

export function createSnowmobile(scene) {
	const sled = new THREE.Group();
	const driver = new THREE.Group();
	scene.add(sled);
	sled.add(driver);
	const orange = new THREE.MeshStandardMaterial({
		color: 0xf27842,
		roughness: 0.65,
	});
	const dark = new THREE.MeshStandardMaterial({
		color: 0x28494a,
		roughness: 0.8,
	});
	const gold = new THREE.MeshStandardMaterial({
		color: 0xf4cf83,
		roughness: 0.5,
	});
	const ice = new THREE.MeshStandardMaterial({
		color: 0xadd6d2,
		transparent: true,
		opacity: 0.85,
		roughness: 0.3,
	});
	function part(geometry, material, x, y, z, parent = sled) {
		const item = new THREE.Mesh(geometry, material);
		item.position.set(x, y, z);
		item.castShadow = true;
		item.receiveShadow = true;
		parent.add(item);
		return item;
	}
	const track = part(
		new THREE.CapsuleGeometry(0.65, 1.6, 5, 12),
		dark,
		0,
		0.6,
		0.45,
	);
	track.rotation.x = Math.PI / 2;
	track.scale.set(1.25, 1, 0.68);
	for (let i = 0; i < 7; i++)
		part(
			new THREE.BoxGeometry(1.8, 0.16, 0.14),
			dark,
			0,
			0.32,
			-0.7 + i * 0.36,
		);
	const hood = part(new THREE.SphereGeometry(1, 16, 10), orange, 0, 1.2, -0.65);
	hood.scale.set(0.98, 0.7, 1.5);
	const seat = part(
		new THREE.CapsuleGeometry(0.42, 0.9, 4, 10),
		dark,
		0,
		1.35,
		0.65,
	);
	seat.rotation.x = Math.PI / 2;
	seat.scale.z = 0.42;
	const windshield = part(
		new THREE.SphereGeometry(0.85, 16, 10, 0, Math.PI),
		ice,
		0,
		1.8,
		-0.95,
	);
	windshield.scale.set(1, 0.65, 0.24);
	windshield.rotation.x = -0.35;
	for (const side of [-1, 1]) {
		const ski = part(
			new THREE.CapsuleGeometry(0.16, 2.2, 4, 10),
			gold,
			side * 1.13,
			0.2,
			-1.6,
		);
		ski.rotation.x = Math.PI / 2;
		ski.scale.z = 0.3;
		const suspension = part(
			new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
			dark,
			side * 1.03,
			0.6,
			-1.5,
		);
		suspension.rotation.z = side * 0.2;
		const lamp = part(
			new THREE.SphereGeometry(0.2, 10, 8),
			gold,
			side * 0.48,
			1.35,
			-1.93,
		);
		lamp.scale.z = 0.3;
	}
	part(new THREE.BoxGeometry(1.35, 0.11, 0.11), dark, 0, 1.88, -0.35);
	part(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), dark, 0, 1.6, -0.35);
	part(
		new THREE.CapsuleGeometry(0.34, 0.48, 5, 10),
		gold,
		0,
		2.0,
		0.45,
		driver,
	);
	part(new THREE.SphereGeometry(0.34, 12, 10), dark, 0, 2.77, 0.32, driver);
	const goggles = part(
		new THREE.SphereGeometry(0.27, 12, 8),
		orange,
		0,
		2.78,
		0.08,
		driver,
	);
	goggles.scale.set(1, 0.4, 0.4);
	for (const side of [-1, 1]) {
		const arm = part(
			new THREE.CapsuleGeometry(0.13, 0.6, 4, 8),
			gold,
			side * 0.4,
			2,
			-0.02,
			driver,
		);
		arm.rotation.x = -0.8;
		const leg = part(
			new THREE.CapsuleGeometry(0.15, 0.6, 4, 8),
			dark,
			side * 0.48,
			1.2,
			0.5,
			driver,
		);
		leg.rotation.x = -0.35;
	}
	return {
		update(state, time) {
			const vehicle = state.snowmobile;
			sled.visible = Boolean(vehicle);
			if (!vehicle) return;
			const mounted = state.vehicle === "snowmobile";
			driver.visible = mounted;
			sled.position.set(vehicle.x, vehicle.y + 0.03, vehicle.z);
			const dx = Math.sin(vehicle.heading);
			const dz = -Math.cos(vehicle.heading);
			const pitch =
				mounted && state.airborne
					? 0
					: Math.atan2(
							terrainHeight(vehicle.x + dx, vehicle.z + dz) -
								terrainHeight(vehicle.x - dx, vehicle.z - dz),
							2,
						);
			sled.rotation.set(pitch, -vehicle.heading, 0, "YXZ");
			driver.position.y = mounted
				? Math.sin(time * 22) * Math.min(Math.abs(state.speed) * 0.001, 0.03)
				: 0;
		},
	};
}
