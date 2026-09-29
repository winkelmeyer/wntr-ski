import * as THREE from "three";
import { createPark } from "./park.js";
import { createPlayground } from "./playground.js";
import { createRamps } from "./ramps.js";
import { crystals, landmarks, terrainHeight } from "./terrain.js";

const palette = {
	snow: 0xf3f6ef,
	wood: 0xaf7660,
	dark: 0x355e60,
	roof: 0xde7859,
	gold: 0xf6bf6a,
	ice: 0x8cc6ca,
};
export function createScenery(scene) {
	const group = new THREE.Group();
	scene.add(group);
	const materials = Object.fromEntries(
		Object.entries(palette).map(([key, color]) => [
			key,
			new THREE.MeshStandardMaterial({ color, roughness: 0.82 }),
		]),
	);
	const box = new THREE.BoxGeometry(1, 1, 1);
	const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
	const sphere = new THREE.SphereGeometry(1, 12, 8);
	function mesh(geometry, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
		const item = new THREE.Mesh(geometry, materials[material] || material);
		item.position.set(x, y, z);
		item.scale.set(sx, sy, sz);
		item.castShadow = true;
		item.receiveShadow = true;
		parent.add(item);
		return item;
	}
	function label(text, parent, x, y, z, width = 9) {
		const canvas = document.createElement("canvas");
		canvas.width = 768;
		canvas.height = 160;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fffaf0";
		ctx.beginPath();
		ctx.roundRect(4, 4, 760, 152, 28);
		ctx.fill();
		ctx.font = "bold 46px Arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#355e60";
		ctx.fillText(text, 384, 82);
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		const sprite = new THREE.Sprite(
			new THREE.SpriteMaterial({ map: texture, depthWrite: false }),
		);
		sprite.scale.set(width, (width * 160) / 768, 1);
		sprite.position.set(x, y, z);
		parent.add(sprite);
		return sprite;
	}
	function at(x, z) {
		const root = new THREE.Group();
		root.position.set(x, terrainHeight(x, z), z);
		group.add(root);
		return root;
	}
	const chalet = at(-13, -9);
	mesh(box, "wood", chalet, 0, 2.1, 0, 8, 4.2, 6);
	const roof = mesh(
		new THREE.ConeGeometry(6.2, 3.8, 4),
		"roof",
		chalet,
		0,
		5.1,
		0,
		1,
		1,
		0.9,
	);
	roof.rotation.y = Math.PI / 4;
	const cap = mesh(
		new THREE.ConeGeometry(6.25, 3.2, 4),
		"snow",
		chalet,
		0,
		5.58,
		0,
		1,
		1,
		0.9,
	);
	cap.rotation.y = Math.PI / 4;
	mesh(box, "dark", chalet, 0, 1.4, 3.05, 1.4, 2.8, 0.15);
	for (const x of [-2.5, 2.5]) {
		mesh(box, "gold", chalet, x, 2.3, 3.06, 1.45, 1.5, 0.16);
		mesh(box, "wood", chalet, x, 2.3, 3.17, 0.12, 1.5, 0.1);
	}
	mesh(box, "wood", chalet, 0, 0.2, 4, 9, 0.4, 2.5);
	mesh(box, "wood", chalet, 2.7, 6.1, -1, 0.9, 2.4, 0.9);
	label("THE LITTLE LODGE", chalet, 0, 8.5, 0, 10);
	const smoke = Array.from({ length: 7 }, () =>
		mesh(sphere, "snow", chalet, 2.7, 7.5, -1, 0.4, 0.4, 0.4),
	);
	const sign = at(7, 3);
	mesh(cylinder, "wood", sign, 0, 1.5, 0, 0.14, 3, 0.14);
	label("GO GET LOST ↗", sign, 0, 3.5, 0, 7);
	for (const landmark of landmarks) {
		if (landmark.id === "lodge") continue;
		const root = at(landmark.x, landmark.z);
		label(landmark.name.toUpperCase(), root, 0, 8, 0, 12);
		for (const x of [-7, 7]) {
			mesh(cylinder, "wood", root, x, 2, 0, 0.13, 4, 0.13);
			mesh(box, "roof", root, x + 0.65, 3.6, 0, 1.3, 0.7, 0.08);
		}
	}
	createRamps({ group, mesh, label, at });
	createPark({ group, mesh, label, at });
	const lake = at(-100, -70);
	const ice = mesh(
		new THREE.CircleGeometry(15, 48),
		"ice",
		lake,
		0,
		0.12,
		0,
		1,
		1,
		1,
	);
	ice.rotation.x = -Math.PI / 2;
	const rink = mesh(
		new THREE.RingGeometry(15, 15.65, 48),
		"snow",
		lake,
		0,
		0.14,
		0,
	);
	rink.rotation.x = -Math.PI / 2;
	for (let i = 0; i < 7; i++) {
		const angle = i * 1.8;
		mesh(
			sphere,
			"snow",
			lake,
			Math.cos(angle) * 18,
			0.5,
			Math.sin(angle) * 18,
			1.5,
			0.8,
			1.2,
		);
	}
	const snowman = at(-83, -67);
	mesh(sphere, "snow", snowman, 0, 0.8, 0, 0.9, 0.9, 0.9);
	mesh(sphere, "snow", snowman, 0, 1.9, 0, 0.65, 0.65, 0.65);
	mesh(sphere, "snow", snowman, 0, 2.8, 0, 0.45, 0.45, 0.45);
	mesh(cylinder, "dark", snowman, 0, 3.3, 0, 0.4, 0.5, 0.4);
	mesh(cylinder, "dark", snowman, 0, 3.09, 0, 0.6, 0.12, 0.6);
	for (const x of [-0.14, 0.14])
		mesh(sphere, "dark", snowman, x, 2.9, 0.4, 0.055, 0.055, 0.055);
	const nose = mesh(
		new THREE.ConeGeometry(0.09, 0.45, 8),
		"roof",
		snowman,
		0,
		2.76,
		0.55,
	);
	nose.rotation.x = Math.PI / 2;
	const fire = at(13, -13);
	for (let i = 0; i < 9; i++)
		mesh(
			sphere,
			"dark",
			fire,
			Math.cos((i * Math.PI * 2) / 9) * 1.6,
			0.3,
			Math.sin((i * Math.PI * 2) / 9) * 1.6,
			0.4,
			0.3,
			0.4,
		);
	const flames = [
		mesh(new THREE.ConeGeometry(0.7, 2.2, 6), "roof", fire, 0, 1.3, 0),
		mesh(new THREE.ConeGeometry(0.4, 1.5, 6), "gold", fire, 0.2, 1.1, 0.25),
	];
	for (const z of [-3, 3]) {
		mesh(box, "wood", fire, 0, 0.8, z, 3.5, 0.3, 0.8);
		for (const x of [-1.2, 1.2])
			mesh(box, "dark", fire, x, 0.35, z, 0.3, 0.7, 0.5);
	}
	const liftStart = new THREE.Vector3(-23, terrainHeight(-23, -23) + 9, -23);
	const liftEnd = new THREE.Vector3(35, terrainHeight(35, -183) + 10, -183);
	for (let i = 0; i <= 4; i++) {
		const point = new THREE.Vector3().lerpVectors(liftStart, liftEnd, i / 4);
		const ground = terrainHeight(point.x, point.z);
		mesh(
			cylinder,
			"dark",
			group,
			point.x,
			(point.y + ground) / 2,
			point.z,
			0.3,
			point.y - ground,
			0.3,
		);
		mesh(box, "gold", group, point.x, point.y, point.z, 6, 0.45, 0.65);
	}
	for (const side of [-2.3, 2.3]) {
		const points = [
			liftStart.clone().add(new THREE.Vector3(side, 0, 0)),
			liftEnd.clone().add(new THREE.Vector3(side, 0, 0)),
		];
		group.add(
			new THREE.Line(
				new THREE.BufferGeometry().setFromPoints(points),
				new THREE.LineBasicMaterial({ color: 0x355e60 }),
			),
		);
	}
	const chairs = Array.from({ length: 16 }, () => {
		const chair = new THREE.Group();
		mesh(cylinder, "dark", chair, 0, -1, 0, 0.055, 2, 0.055);
		mesh(box, "roof", chair, 0, -2.2, 0, 2.6, 0.25, 1.1);
		mesh(box, "roof", chair, 0, -1.7, 0.5, 2.6, 1, 0.16);
		group.add(chair);
		return chair;
	});
	const gems = crystals.map((crystal) => {
		const root = at(crystal.x, crystal.z);
		const material = new THREE.MeshStandardMaterial({
			color: 0xf6bd62,
			emissive: 0xa95514,
			emissiveIntensity: 0.12,
			roughness: 0.35,
			metalness: 0.15,
		});
		const gem = mesh(
			new THREE.OctahedronGeometry(0.7),
			material,
			root,
			0,
			1.5,
			0,
		);
		const halo = mesh(
			new THREE.RingGeometry(0.9, 1.08, 24),
			"gold",
			root,
			0,
			0.1,
			0,
		);
		halo.rotation.x = -Math.PI / 2;
		return { root, gem, id: crystal.id };
	});
	const flags = [];
	for (let i = 0; i < 7; i++) {
		const root = at(-9 + i * 3, -20);
		mesh(cylinder, "wood", root, 0, 3, 0, 0.07, 6, 0.07);
		const flag = mesh(
			new THREE.ConeGeometry(0.65, 1.8, 3),
			i % 2 ? "gold" : "roof",
			root,
			0.65,
			5.4,
			0,
		);
		flag.rotation.z = Math.PI / 2;
		flags.push(flag);
	}
	const snowcat = new THREE.Group();
	group.add(snowcat);
	mesh(box, "roof", snowcat, 0, 1.1, 0, 2.8, 0.75, 3.5);
	mesh(box, "gold", snowcat, 0, 2.1, -0.2, 2.1, 1.3, 1.9);
	mesh(box, "ice", snowcat, 0, 2.2, -1.17, 1.7, 0.85, 0.05);
	for (const side of [-1, 1]) {
		mesh(box, "dark", snowcat, side * 1.45, 0.6, 0, 0.7, 0.9, 3.9);
		for (const z of [-1.2, 0, 1.2]) {
			const wheel = mesh(
				cylinder,
				"wood",
				snowcat,
				side * 1.84,
				0.6,
				z,
				0.3,
				0.08,
				0.3,
			);
			wheel.rotation.z = Math.PI / 2;
		}
	}
	mesh(box, "dark", snowcat, 0, 0.5, -2.3, 3.8, 0.8, 0.2);
	const beacon = mesh(sphere, "gold", snowcat, 0, 2.95, -0.2, 0.22, 0.22, 0.22);
	const penguins = Array.from({ length: 3 }, (_, i) => {
		const root = new THREE.Group();
		group.add(root);
		mesh(sphere, "dark", root, 0, 0.8, 0, 0.5, 0.8, 0.45);
		mesh(sphere, "snow", root, 0, 0.72, -0.28, 0.34, 0.57, 0.19);
		mesh(sphere, "gold", root, 0, 1.24, -0.43, 0.12, 0.09, 0.17);
		for (const side of [-1, 1])
			mesh(sphere, "gold", root, side * 0.25, 0.13, -0.14, 0.2, 0.12, 0.32);
		root.userData.phase = i * 2.1;
		return root;
	});
	const playground = createPlayground({ group, mesh, label, at });
	const balls = new Map();
	return {
		update(state, time, dt) {
			playground.update(state, time);
			const catAngle = time * 0.06;
			const catX = 23 + Math.cos(catAngle) * 10;
			const catZ = -27 + Math.sin(catAngle) * 13;
			snowcat.position.set(catX, terrainHeight(catX, catZ), catZ);
			snowcat.rotation.y = Math.atan2(
				Math.sin(catAngle) * 10,
				-Math.cos(catAngle) * 13,
			);
			beacon.scale.setScalar(0.22 + Math.sin(time * 6) * 0.035);
			for (const [i, flag] of flags.entries())
				flag.rotation.x = Math.sin(time * 3 + i) * 0.3;
			for (const penguin of penguins) {
				const angle = time * 0.25 + penguin.userData.phase;
				penguin.position.set(
					-100 + Math.cos(angle) * 8,
					-2.35 + Math.abs(Math.sin(time * 6)) * 0.08,
					-70 + Math.sin(angle) * 8,
				);
				penguin.rotation.y = -angle;
				penguin.rotation.z = Math.sin(time * 6 + penguin.userData.phase) * 0.1;
			}
			for (const [i, puff] of smoke.entries()) {
				const age = (time * 0.25 + i / smoke.length) % 1;
				puff.position.set(2.7 + age * 2, 7.2 + age * 4, -1);
				puff.scale.setScalar(0.3 + age * 0.7);
			}
			for (const [i, flame] of flames.entries())
				flame.scale.y = 0.8 + Math.sin(time * 9 + i) * 0.18;
			for (const [i, chair] of chairs.entries()) {
				const phase = (time * 0.016 + i / chairs.length) % 1;
				const returning = phase > 0.5;
				chair.position.lerpVectors(
					liftStart,
					liftEnd,
					returning ? 2 - phase * 2 : phase * 2,
				);
				chair.position.x += returning ? -2.3 : 2.3;
				chair.visible =
					!state.lift ||
					Math.hypot(chair.position.x - state.x, chair.position.z - state.z) >
						5;
				chair.rotation.z = Math.sin(time * 1.3 + i) * 0.035;
			}
			for (const { root, gem, id } of gems) {
				root.visible = !(state.collected?.has
					? state.collected.has(id)
					: state.collected?.includes(id));
				gem.rotation.y = time * 1.2;
				gem.position.y = 1.5 + Math.sin(time * 2 + root.position.x) * 0.2;
			}
			for (const prop of state.props || []) {
				if (!balls.has(prop.id))
					balls.set(
						prop.id,
						mesh(
							new THREE.IcosahedronGeometry(prop.radius, 2),
							"snow",
							group,
							prop.x,
							prop.y,
							prop.z,
						),
					);
				const ball = balls.get(prop.id);
				ball.position.set(prop.x, prop.y, prop.z);
				ball.rotation.x += ((prop.vz || 0) * dt) / prop.radius;
				ball.rotation.z -= ((prop.vx || 0) * dt) / prop.radius;
			}
		},
	};
}
