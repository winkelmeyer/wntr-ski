import { liftBase } from "./activities.js";
import { crystals, landmarks } from "./terrain.js";

export function createMap(onSelect) {
	const canvas = document.getElementById("map");
	const context = canvas.getContext("2d");
	const destinations = document.getElementById("destinations");
	const places = [
		...landmarks,
		{ id: "snowmobile", name: "Snowmobile", x: 10, z: 10 },
		{ id: "lift", name: "The Chairlift", ...liftBase },
	];
	for (const place of places) {
		const button = document.createElement("button");
		button.className = "destination";
		button.dataset.destination = place.id;
		const name = document.createElement("span");
		name.textContent = place.name;
		const detail = document.createElement("small");
		name.append(detail);
		const arrow = document.createElement("span");
		arrow.textContent = "↗";
		button.append(name, arrow);
		button.onclick = () => onSelect(place);
		destinations.append(button);
	}
	return (state) => {
		Object.assign(
			places.find((place) => place.id === "snowmobile"),
			state.snowmobile,
		);
		const span = Math.max(
			300,
			Math.abs(state.x) * 2.2,
			Math.abs(state.z + 85) * 2.2,
		);
		const scale = 380 / span;
		const x = (value) => 280 + value * scale;
		const z = (value) => 220 + (value + 85) * scale;
		context.clearRect(0, 0, 560, 440);
		context.fillStyle = "#e6eade";
		context.fillRect(0, 0, 560, 440);
		context.strokeStyle = "#ccd5c6";
		context.lineWidth = 1;
		for (let radius = 45; radius < 350; radius += 25) {
			context.beginPath();
			context.ellipse(
				x(40),
				z(-190),
				radius * 1.3,
				radius,
				-0.3,
				0,
				Math.PI * 2,
			);
			context.stroke();
		}
		context.fillStyle = "#a8d2d0";
		context.beginPath();
		context.ellipse(
			x(-100),
			z(-70),
			27 * scale,
			20 * scale,
			-0.4,
			0,
			Math.PI * 2,
		);
		context.fill();
		context.strokeStyle = "#8ca99a";
		context.setLineDash([5, 6]);
		context.beginPath();
		context.moveTo(x(0), z(0));
		context.lineTo(x(40), z(-190));
		context.stroke();
		context.setLineDash([]);
		for (const item of crystals) {
			if (state.collected.includes(item.id)) continue;
			context.fillStyle = "#d99b49";
			context.beginPath();
			context.arc(x(item.x), z(item.z), 3, 0, Math.PI * 2);
			context.fill();
		}
		for (const place of places) {
			context.fillStyle = "#faf7ed";
			context.beginPath();
			context.arc(x(place.x), z(place.z), 10, 0, Math.PI * 2);
			context.fill();
			context.fillStyle = "#31594e";
			context.beginPath();
			context.arc(x(place.x), z(place.z), 5, 0, Math.PI * 2);
			context.fill();
			context.font = "bold 13px sans-serif";
			context.textAlign = "center";
			context.fillText(place.name.toUpperCase(), x(place.x), z(place.z) + 27);
			const button = destinations.querySelector(
				`[data-destination="${place.id}"]`,
			);
			button.querySelector("small").textContent =
				`${place.id === "snowmobile" ? "HOP ON AND EXPLORE" : place.id === "lift" ? "RIDE TO THE OVERLOOK" : place.id === "park" && state.bestRace ? `BEST CIRCUIT ${state.bestRace.toFixed(1)}s` : state.visited.includes(place.id) ? "DISCOVERED" : "WAITING FOR YOU"} · ${Math.round(Math.hypot(state.x - place.x, state.z - place.z))} M`;
		}
		context.save();
		context.translate(x(state.x), z(state.z));
		context.rotate(state.heading);
		context.fillStyle = "#ed744d";
		context.strokeStyle = "#faf7ed";
		context.lineWidth = 3;
		context.beginPath();
		context.moveTo(0, -12);
		context.lineTo(8, 9);
		context.lineTo(0, 5);
		context.lineTo(-8, 9);
		context.closePath();
		context.fill();
		context.stroke();
		context.restore();
	};
}
