import * as THREE from "three";
import { ramps, terrainHeight } from "./terrain.js";

export function createRamps({ group, mesh, label, at }) {
	const pole = new THREE.CylinderGeometry(0.07, 0.07, 1, 8);
	const orange = new THREE.MeshStandardMaterial({
		color: 0xf37d47,
		roughness: 0.85,
	});
	const wood = new THREE.MeshStandardMaterial({
		color: 0xba8c67,
		roughness: 0.9,
	});
	const cream = new THREE.MeshStandardMaterial({
		color: 0xffedb4,
		roughness: 0.9,
	});
	const canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 192;
	const context = canvas.getContext("2d");
	context.fillStyle = "#fff0ba";
	context.beginPath();
	context.moveTo(64, 12);
	context.lineTo(118, 85);
	context.lineTo(82, 85);
	context.lineTo(82, 180);
	context.lineTo(46, 180);
	context.lineTo(46, 85);
	context.lineTo(10, 85);
	context.closePath();
	context.fill();
	const arrowMaterial = new THREE.MeshStandardMaterial({
		map: new THREE.CanvasTexture(canvas),
		transparent: true,
		depthWrite: false,
		roughness: 0.9,
	});
	function surface(x, z, width, depth, material, lift = 0.14) {
		const geometry = new THREE.PlaneGeometry(width, depth, 10, 24);
		geometry.rotateX(-Math.PI / 2);
		const vertices = geometry.attributes.position;
		for (let i = 0; i < vertices.count; i++) {
			const px = x + vertices.getX(i);
			const pz = z + vertices.getZ(i);
			vertices.setXYZ(i, px, terrainHeight(px, pz) + lift, pz);
		}
		geometry.computeVertexNormals();
		return mesh(geometry, material, group, 0, 0, 0);
	}
	for (const ramp of ramps) {
		surface(ramp.x, ramp.z, ramp.width, ramp.depth, wood);
		for (const side of [-1, 1]) {
			surface(
				ramp.x + side * (ramp.width / 2 - 0.22),
				ramp.z,
				0.44,
				ramp.depth,
				orange,
				0.17,
			);
			const flag = at(ramp.x + side * (ramp.width / 2 + 0.8), ramp.z - 1);
			mesh(pole, "dark", flag, 0, 2, 0, 1, 4, 1);
			const pennant = mesh(
				new THREE.ConeGeometry(0.5, 1.3, 3),
				orange,
				flag,
				side * 0.5,
				3.6,
				0,
			);
			pennant.rotation.z = (-side * Math.PI) / 2;
		}
		for (let i = 0; i < 4; i++)
			surface(
				ramp.x,
				ramp.z + ramp.depth / 2 - 1 - i * 0.65,
				ramp.width - 0.9,
				0.12,
				cream,
				0.18,
			);
		surface(ramp.x, ramp.z, 1.8, 2.7, arrowMaterial, 0.2);
		const sign = at(ramp.x, ramp.z + ramp.depth / 2 + 1);
		label(
			ramp.id === "big-air" ? "BIG AIR ↑" : "JUMP / HOLD X TO SPIN",
			sign,
			0,
			4.1,
			0,
			ramp.id === "big-air" ? 8 : 11,
		);
	}
}
