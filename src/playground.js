import * as THREE from "three";
import { liftBase, liftTop, raceGates } from "./activities.js";

export function createPlayground({ group, mesh, label, at }) {
	const box = new THREE.BoxGeometry(1, 1, 1);
	const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
	for (const point of [liftBase, liftTop]) {
		const station = at(point.x, point.z);
		mesh(cylinder, "wood", station, -4, 2, 0, 0.13, 4, 0.13);
		mesh(cylinder, "wood", station, 4, 2, 0, 0.13, 4, 0.13);
		label(
			point === liftBase ? "E / CHAIRLIFT ↑" : "THE OVERLOOK",
			station,
			0,
			4.7,
			0,
			11,
		);
		const boarding = mesh(
			new THREE.RingGeometry(2.8, 3.1, 32),
			"gold",
			station,
			0,
			0.11,
			0,
		);
		boarding.rotation.x = -Math.PI / 2;
	}
	const circuit = at(90, -70);
	label("E / SNOWFLAKE CIRCUIT", circuit, 0, 5.4, 0, 13);
	const gateGeometry = new THREE.TorusGeometry(5.3, 0.24, 8, 40, Math.PI);
	const activeMaterial = new THREE.MeshStandardMaterial({
		color: 0xff7042,
		emissive: 0xf46b38,
		emissiveIntensity: 0.18,
		roughness: 0.55,
	});
	const waitingMaterial = new THREE.MeshStandardMaterial({
		color: 0x83b6aa,
		transparent: true,
		opacity: 0.38,
		roughness: 0.9,
	});
	const gates = raceGates.slice(1).map((point, index) => {
		const root = at(point.x, point.z);
		const previous = raceGates[index];
		root.rotation.y = Math.atan2(point.x - previous.x, point.z - previous.z);
		const ring = mesh(gateGeometry, waitingMaterial, root, 0, 0.15, 0);
		for (const side of [-1, 1])
			mesh(cylinder, "roof", root, side * 5.3, 0.13, 0, 0.55, 0.26, 0.55);
		const number = label(`${index + 1}`, root, 0, 6.7, 0, 1.8);
		root.visible = false;
		return { root, ring, number };
	});
	const playerChair = new THREE.Group();
	group.add(playerChair);
	mesh(cylinder, "dark", playerChair, 0, 1.1, 0.5, 0.055, 2.2, 0.055);
	mesh(box, "roof", playerChair, 0, 0.06, 0, 2.6, 0.2, 1.1);
	mesh(box, "roof", playerChair, 0, 0.6, 0.5, 2.6, 1, 0.16);
	mesh(box, "gold", playerChair, 0, 0.5, -0.5, 2.5, 0.09, 0.09);
	return {
		update(state, time) {
			playerChair.visible = Boolean(state.lift);
			if (state.lift) {
				playerChair.position.set(state.x, state.y, state.z);
				playerChair.rotation.y = -state.heading;
			}
			for (const [index, gate] of gates.entries()) {
				const next = state.race?.next;
				gate.root.visible = Boolean(state.race?.active && index + 1 >= next);
				const active = index + 1 === next;
				gate.ring.material = active ? activeMaterial : waitingMaterial;
				gate.number.visible = active;
				gate.ring.scale.setScalar(active ? 1 + Math.sin(time * 3) * 0.025 : 1);
			}
		},
	};
}
