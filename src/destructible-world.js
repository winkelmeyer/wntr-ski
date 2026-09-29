import * as THREE from "three";
import { destructibles } from "./destruction.js";
import { terrainHeight } from "./terrain.js";

export function createDestructibles(scene) {
	const group = new THREE.Group();
	scene.add(group);
	const box = new THREE.BoxGeometry(1, 1, 1);
	const sphere = new THREE.SphereGeometry(1, 10, 8);
	const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
	const cone = new THREE.ConeGeometry(1, 1, 8);
	const materials = {
		wood: new THREE.MeshStandardMaterial({ color: 0xb97c51, roughness: 0.9 }),
		trim: new THREE.MeshStandardMaterial({ color: 0x754b39, roughness: 0.9 }),
		snow: new THREE.MeshStandardMaterial({ color: 0xfffcf2, roughness: 0.8 }),
		dark: new THREE.MeshStandardMaterial({ color: 0x315559, roughness: 0.8 }),
		orange: new THREE.MeshStandardMaterial({ color: 0xf58b49, roughness: 0.8 }),
		red: new THREE.MeshStandardMaterial({ color: 0xe97864, roughness: 0.8 }),
	};
	function add(parent, geometry, material, x, y, z, sx, sy, sz) {
		const mesh = new THREE.Mesh(geometry, materials[material]);
		mesh.position.set(x, y, z);
		mesh.scale.set(sx, sy, sz);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		parent.add(mesh);
		return mesh;
	}
	const sources = destructibles.map((prop) => {
		const source = new THREE.Group();
		source.position.set(prop.x, terrainHeight(prop.x, prop.z), prop.z);
		group.add(source);
		if (prop.type === "crate") {
			add(source, box, "wood", 0, 0.7, 0, 1.3, 1.4, 1.3);
			for (const x of [-0.5, 0.5]) {
				add(source, box, "trim", x, 0.7, 0, 0.13, 1.46, 1.36);
			}
			for (const y of [0.18, 1.2])
				add(source, box, "trim", 0, y, 0, 1.36, 0.12, 1.36);
			add(source, box, "snow", 0, 1.46, 0, 1.34, 0.12, 1.34);
		} else if (prop.type === "snowman") {
			add(source, sphere, "snow", 0, 0.7, 0, 0.8, 0.8, 0.8);
			add(source, sphere, "snow", 0, 1.6, 0, 0.58, 0.58, 0.58);
			add(source, cylinder, "red", 0, 1.3, 0, 0.53, 0.13, 0.53);
			add(source, cylinder, "dark", 0, 2.2, 0, 0.64, 0.12, 0.64);
			add(source, cylinder, "dark", 0, 2.43, 0, 0.39, 0.43, 0.39);
			for (const x of [-0.18, 0.18])
				add(source, sphere, "dark", x, 1.78, 0.5, 0.065, 0.065, 0.065);
			add(source, cone, "orange", 0, 1.6, 0.68, 0.12, 0.46, 0.12).rotation.x =
				Math.PI / 2;
			for (const x of [-0.85, 0.85])
				add(source, box, "wood", x, 1.3, 0, 0.8, 0.12, 0.12).rotation.z =
					Math.sign(x) * 0.35;
		} else {
			for (const x of [-1.1, 1.1])
				add(source, box, "wood", x, 0.8, 0, 0.22, 1.6, 0.22);
			for (const y of [0.55, 1.18])
				add(source, box, "wood", 0, y, 0, 2.8, 0.26, 0.18);
			add(source, box, "snow", 0, 1.35, 0, 2.8, 0.09, 0.22);
		}
		return source;
	});
	const debris = Array.from({ length: 96 }, () => {
		const mesh = new THREE.Mesh(box, materials.wood);
		mesh.visible = false;
		mesh.castShadow = true;
		group.add(mesh);
		return { mesh, age: 4, vx: 0, vy: 0, vz: 0, spin: 0, size: 1 };
	});
	let cursor = 0;
	function burst(prop, state) {
		for (let index = 0; index < 12; index += 1) {
			const particle = debris[cursor++ % debris.length];
			const angle = index * 2.4;
			const snow = prop.type === "snowman" && index < 9;
			particle.mesh.geometry = snow ? sphere : box;
			particle.mesh.material = snow ? materials.snow : materials.wood;
			particle.size = snow ? 0.25 + index * 0.025 : 0.2;
			particle.mesh.scale.set(
				particle.size,
				particle.size,
				snow ? particle.size : 0.65,
			);
			particle.mesh.position.set(
				prop.x,
				terrainHeight(prop.x, prop.z) + 1,
				prop.z,
			);
			particle.mesh.visible = true;
			particle.age = 0;
			particle.vx =
				Math.cos(angle) * 3 + Math.sin(state.heading) * state.speed * 0.2;
			particle.vz =
				Math.sin(angle) * 3 - Math.cos(state.heading) * state.speed * 0.2;
			particle.vy = 3 + (index % 4);
			particle.spin = (index % 2 ? 1 : -1) * 3;
		}
	}
	return {
		update(state, dt) {
			for (let index = 0; index < destructibles.length; index += 1) {
				const destroyed = state.destroyed.includes(destructibles[index].id);
				if (destroyed && sources[index].visible)
					burst(destructibles[index], state);
				sources[index].visible = !destroyed;
			}
			const delta = Math.min(Math.max(dt, 0), 0.05);
			for (const particle of debris) {
				if (!particle.mesh.visible) continue;
				particle.age += delta;
				if (particle.age >= 3) {
					particle.mesh.visible = false;
					continue;
				}
				particle.vy -= 14 * delta;
				particle.mesh.position.x += particle.vx * delta;
				particle.mesh.position.y += particle.vy * delta;
				particle.mesh.position.z += particle.vz * delta;
				const floor =
					terrainHeight(particle.mesh.position.x, particle.mesh.position.z) +
					0.15;
				if (particle.mesh.position.y < floor) {
					particle.mesh.position.y = floor;
					particle.vy = Math.abs(particle.vy) * 0.3;
					particle.vx *= 0.85;
					particle.vz *= 0.85;
				}
				particle.mesh.rotation.x += particle.spin * delta;
				particle.mesh.rotation.z += particle.spin * delta * 0.7;
				if (particle.age > 2)
					particle.mesh.scale.multiplyScalar(Math.exp(-5 * delta));
			}
		},
	};
}
