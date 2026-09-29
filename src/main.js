import "./style.css";
import {
	advanceActivities,
	interact,
	nearbyActivity,
	raceGates,
} from "./activities.js";
import { mountainAudio } from "./audio.js";
import { createInput } from "./input.js";
import { createMap } from "./map.js";
import { createState, respawn, step } from "./physics.js";
import { loadProgress, saveProgress } from "./progression.js";
import { crystals, landmarks } from "./terrain.js";
import { createWorld } from "./world.js";

const element = (id) => document.getElementById(id);
const state = Object.assign(createState(), loadProgress());
const audio = mountainAudio();
let mode = "intro";
let world;
let input;
let last = performance.now();
let sceneTime = 0;
let toastUntil = 0;
let lastMapUpdate = 0;
let destination = null;

function toast(message) {
	if (!message) return;
	element("trick").textContent = message;
	toastUntil = performance.now() + 3200;
}
function mapToggle(open = element("map-panel").hidden) {
	element("map-panel").hidden = !open;
	element("map-toggle").setAttribute("aria-expanded", String(open));
	if (open) {
		drawMap(state);
		element("close-map").focus({ preventScroll: true });
	} else element("map-toggle").focus({ preventScroll: true });
}
function setMode(next) {
	mode = next;
	input?.clear();
	last = performance.now();
	element("intro").hidden = next !== "intro";
	element("postcard").hidden = next !== "intro";
	element("hud").hidden = next === "intro";
	element("touch").hidden = next !== "ride";
	element("pause").hidden = next === "intro";
	element("paused").hidden = next !== "pause";
	document.body.classList.toggle("riding", next !== "intro");
	if (next === "pause") {
		mapToggle(false);
		element("resume").focus({ preventScroll: true });
	} else if (next === "ride")
		element("mountain").focus({ preventScroll: true });
}
function reset() {
	state.lift = null;
	state.race = null;
	respawn(state);
	world.reset();
	input.clear();
	toast("BACK AT CAMP. A NEW DIRECTION?");
}
function begin() {
	setMode("ride");
	toast("W / ↑ TO PUSH OFF · A D / ← → TO TURN");
}
function act(action) {
	if (action === "start" && mode === "intro") begin();
	if (action === "pause") {
		if (!element("map-panel").hidden) mapToggle(false);
		else if (mode !== "intro") setMode(mode === "pause" ? "ride" : "pause");
	}
	if (action === "map" && mode !== "pause") mapToggle();
	if (action === "reset" && mode === "ride") reset();
	if (action === "interact" && mode === "ride") {
		const message = interact(state);
		toast(message);
		if (message)
			audio.effect(message.includes("SNOWMOBILE") ? "engine" : "lift");
	}
}
const drawMap = createMap((place) => {
	destination = place;
	mapToggle(false);
	if (mode === "intro") setMode("ride");
	toast(`TAKE THE SCENIC ROUTE TO ${place.name.toUpperCase()}.`);
});
try {
	world = createWorld(element("mountain"));
	input = createInput({
		canvas: element("mountain"),
		world,
		active: () => mode === "ride",
		action: act,
	});
} catch {
	element("error").hidden = false;
	element("error").textContent =
		"The mountain needs WebGL. Enable graphics acceleration in your browser, then reload to explore.";
	element("start").disabled = true;
	element("map-toggle").disabled = true;
}
element("start").onclick = begin;
element("pause").onclick = () => act("pause");
element("resume").onclick = () => setMode("ride");
element("reset").onclick = reset;
element("pause-reset").onclick = () => {
	reset();
	setMode("ride");
};
element("map-toggle").onclick = () => mapToggle();
element("close-map").onclick = () => mapToggle(false);
element("clear-waypoint").onclick = () => {
	destination = null;
};
element("interact").onclick = () => act("interact");
element("sound").onclick = async () => {
	try {
		const enabled = await audio.toggle();
		element("sound").innerHTML = `SOUND <span>${enabled ? "ON" : "OFF"}</span>`;
		element("sound").setAttribute(
			"aria-label",
			`${enabled ? "Disable" : "Enable"} mountain audio`,
		);
		element("sound").setAttribute("aria-pressed", String(enabled));
	} catch {
		element("sound").textContent = "AUDIO UNAVAILABLE";
	}
};
addEventListener("blur", () => {
	if (mode === "ride") setMode("pause");
	input?.clear();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		saveProgress(state);
		if (mode === "ride") setMode("pause");
	}
});
addEventListener("pagehide", () => saveProgress(state));
addEventListener("keydown", (event) => {
	if (mode !== "pause" || event.key !== "Tab") return;
	const first = element("resume");
	const last = element("pause-reset");
	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault();
		last.focus();
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault();
		first.focus();
	}
});
element("mountain").addEventListener("webglcontextlost", (event) => {
	event.preventDefault();
	saveProgress(state);
	setMode("pause");
	element("error").hidden = false;
	element("error").textContent =
		"The graphics connection was interrupted. Your discoveries are saved. Reload to head back out.";
});

function updateHUD() {
	element("vehicle-label").textContent =
		state.vehicle === "snowmobile" ? "SNOWMOBILE" : "SNOWBOARD";
	const spinButton = document.querySelector('[data-control="trick"]');
	spinButton.disabled = state.vehicle === "snowmobile";
	spinButton.setAttribute(
		"aria-label",
		state.vehicle === "snowmobile"
			? "Park snowmobile to spin on your board"
			: "Spin in the air",
	);
	element("score").textContent = Math.floor(state.score).toLocaleString();
	element("discoveries").textContent =
		`${state.visited.length} / ${landmarks.length}`;
	element("collected").textContent =
		`${state.collected.length} / ${crystals.length}`;
	element("speed").textContent = Math.round(Math.abs(state.speed) * 3.6);
	const closest = landmarks.reduce((near, place) =>
		Math.hypot(state.x - place.x, state.z - place.z) <
		Math.hypot(state.x - near.x, state.z - near.z)
			? place
			: near,
	);
	element("location-name").textContent =
		Math.hypot(state.x - closest.x, state.z - closest.z) < 35
			? closest.name.toUpperCase()
			: "THE GREAT WIDE OPEN";
	const target = state.race?.active ? raceGates[state.race.next] : destination;
	element("waypoint").hidden = !target;
	if (target) {
		const distance = Math.hypot(state.x - target.x, state.z - target.z);
		element("waypoint-text").textContent = state.race?.active
			? `GATE ${state.race.next} / 8 · ${state.race.elapsed.toFixed(1)}s · ${Math.round(distance)} M`
			: `${target.name.toUpperCase()} · ${Math.round(distance)} M`;
		const angle =
			Math.atan2(target.x - state.x, state.z - target.z) - state.heading;
		element("waypoint-arrow").style.transform = `rotate(${angle}rad)`;
		element("clear-waypoint").hidden = Boolean(state.race?.active);
		if (!state.race?.active && distance < (target.id === "snowmobile" ? 4 : 12))
			destination = null;
	}
	const activity = nearbyActivity(state);
	element("interact").hidden = !activity || mode !== "ride";
	element("interaction-label").textContent = activity;
}
function tick(now) {
	const dt = Math.max(0, Math.min((now - last) / 1000, 0.25));
	last = now;
	const controls = input.read();
	if (mode !== "pause") sceneTime += dt;
	if (mode === "ride") {
		const discoveries = state.visited.length;
		const collected = state.collected.length;
		const score = state.score;
		const smashed = state.destroyed?.length ?? 0;
		if (!state.lift) step(state, controls, dt);
		else if (controls.jump) toast(interact(state));
		else state.event = "";
		const activityMessage = advanceActivities(state, dt);
		if (state.event === "crash")
			toast("A LITTLE POWDER CHECK. KEEP WANDERING.");
		if (state.event === "trick")
			toast(`STOMPED! +${state.lastLandingScore} · ${state.combo}×`);
		if (state.event === "land") toast(`FRESH AIR +${state.lastLandingScore}`);
		if (state.event === "grindStart") toast("ON THE RAIL. SPACE TO POP OFF.");
		if (state.event === "grindEnd")
			toast(`CLEAN GRIND · ${state.combo}× COMBO`);
		if ((state.destroyed?.length ?? 0) > smashed)
			toast(`SMASH! +${(state.destroyed.length - smashed) * 75}`);
		if (state.visited.length > discoveries)
			toast(
				`${landmarks.find((place) => place.id === state.visited.at(-1)).name.toUpperCase()} · DISCOVERED +100`,
			);
		if (state.collected.length > collected)
			toast(
				state.collected.length === crystals.length
					? "ALL SNOWFLAKES FOUND. THE MOUNTAIN IS YOURS."
					: `LITTLE THINGS, BIG JOY. ${state.collected.length} / ${crystals.length} ✳`,
			);
		toast(activityMessage);
		if (activityMessage)
			audio.effect(activityMessage.includes("COMPLETE") ? "finish" : "lift");
		if (state.collected.length > collected) audio.effect("collect");
		else if (
			[
				"trick",
				"crash",
				"discovery",
				"jump",
				"land",
				"snowball",
				"smash",
				"grindStart",
				"grindEnd",
			].includes(state.event)
		)
			audio.effect(state.event);
		if (state.score !== score || activityMessage) saveProgress(state);
	}
	updateHUD();
	if (now > toastUntil) element("trick").textContent = "";
	if (!element("map-panel").hidden && now - lastMapUpdate > 100) {
		drawMap(state);
		lastMapUpdate = now;
	}
	audio.update(state, controls, mode);
	world.render(state, controls.steer, sceneTime, mode, dt);
}
if (world) world.renderer.setAnimationLoop(tick);
