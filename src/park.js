import * as THREE from "three";
import { halfpipe, rails, terrainHeight } from "./terrain.js";

export function createPark({ group, mesh, label, at }) {
	const teal = new THREE.MeshStandardMaterial({
		color: 0x99cdc5,
		roughness: 0.92,
	});
	const orange = new THREE.MeshStandardMaterial({
		color: 0xf58450,
		roughness: 0.7,
	});
	const metal = new THREE.MeshStandardMaterial({
		color: 0x436767,
		roughness: 0.35,
		metalness: 0.35,
	});
	function pipeSurface(x, width, material) {
		const geometry = new THREE.PlaneGeometry(width, halfpipe.length, 32, 40);
		geometry.rotateX(-Math.PI / 2);
		const points = geometry.attributes.position;
		for (let i = 0; i < points.count; i++) {
			const px = x + points.getX(i);
			const pz = halfpipe.z + points.getZ(i);
			points.setXYZ(i, px, terrainHeight(px, pz) + 0.22, pz);
		}
		geometry.computeVertexNormals();
		mesh(geometry, material, group, 0, 0, 0);
	}
	pipeSurface(halfpipe.x, halfpipe.width, teal);
	for (const side of [-1, 1])
		pipeSurface(halfpipe.x + side * (halfpipe.width / 2 - 0.3), 0.5, orange);
	const pipeSign = at(halfpipe.x, halfpipe.z + halfpipe.length / 2 + 3);
	label("THE HALFPIPE ↔", pipeSign, 0, 5.5, 0, 12);
	for (const rail of rails) {
		const root = new THREE.Group();
		root.position.set(
			rail.x,
			terrainHeight(rail.x, rail.z) + rail.height,
			rail.z,
		);
		root.rotation.y = -rail.heading;
		group.add(root);
		const bar = mesh(
			new THREE.CapsuleGeometry(
				rail.radius,
				rail.length - rail.radius * 2,
				5,
				10,
			),
			orange,
			root,
			0,
			0,
			0,
		);
		bar.rotation.x = Math.PI / 2;
		for (const along of [-rail.length * 0.38, rail.length * 0.38]) {
			const x = rail.x + Math.sin(rail.heading) * along;
			const z = rail.z - Math.cos(rail.heading) * along;
			const ground = terrainHeight(x, z);
			const top = root.position.y;
			mesh(
				new THREE.CylinderGeometry(0.1, 0.13, top - ground, 8),
				metal,
				group,
				x,
				(top + ground) / 2,
				z,
			);
		}
		const sign = at(
			rail.x + Math.cos(rail.heading) * 4,
			rail.z + Math.sin(rail.heading) * 4,
		);
		label("JUMP ON / GRIND", sign, 0, 3.5, 0, 8);
	}
	const entrance = at(90, -47);
	for (const x of [-8, 8])
		mesh(
			new THREE.CylinderGeometry(0.15, 0.2, 6, 10),
			"wood",
			entrance,
			x,
			3,
			0,
		);
	label("POWDER PLAYGROUND", entrance, 0, 6.5, 0, 19);
	label("KICKERS · RAILS · HALFPIPE", entrance, 0, 4.8, 0, 12);
	for (let i = 0; i < 8; i++) {
		const marker = at(60 + i * 10, -43);
		mesh(
			new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6),
			"wood",
			marker,
			0,
			1.25,
			0,
		);
		const flag = mesh(
			new THREE.ConeGeometry(0.4, 1.1, 3),
			i % 2 ? orange : teal,
			marker,
			0.4,
			2.2,
			0,
		);
		flag.rotation.z = Math.PI / 2;
	}
}
