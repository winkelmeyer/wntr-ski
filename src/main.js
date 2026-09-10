import "./style.css";
import { mountainAudio } from "./audio.js";
import { courses, crash, createState, step, terrainHeight } from "./physics.js";
import {
	boards,
	completeRun,
	loadProgress,
	saveProgress,
} from "./progression.js";
import { createWorld } from "./world.js";

const element = (id) => document.getElementById(id);
const keys = new Set();
const audio = mountainAudio();
let state = createState();
let mode = "intro";
let jump = false;
let last = performance.now();
let toastUntil = 0;
let progress = loadProgress();
let selectedCourse = "north";
let sessionMode = "freeride";
let world;
try {
	world = createWorld(element("mountain"));
} catch {
	element("error").hidden = false;
	element("error").textContent =
		"The mountain needs WebGL. Enable graphics acceleration in your browser, then reload to ride.";
	element("start").disabled = true;
}
function setMode(next) {
	mode = next;
	keys.clear();
	jump = false;
	element("intro").hidden = next !== "intro";
	element("mountain-card").hidden = next !== "intro";
	element("hud").hidden = next !== "ride" && next !== "pause";
	element("lodge").hidden = next !== "lodge";
	element("result").hidden = next !== "result";
	element("paused").hidden = next !== "pause";
	element("touch").hidden = next !== "ride";
	document.body.classList.toggle("riding", next !== "intro");
	const focusTarget = {
		intro: "start",
		pause: "resume",
		result: "again",
		ride: "pause",
		lodge: "ride",
	}[next];
	element(focusTarget).focus({ preventScroll: true });
}
function start() {
	state = createState(selectedCourse);
	world?.dispose();
	const board =
		boards.find((item) => item.id === progress.selectedBoard) || boards[0];
	world = createWorld(element("mountain"), selectedCourse, board.color);
	world.renderer.setAnimationLoop(tick);
	element("run-label").textContent =
		`${courses.find((course) => course.id === selectedCourse).name.toUpperCase()} / ${sessionMode === "time" ? "TIME ATTACK" : "FREERIDE"}`;
	element("trick").textContent = "";
	setMode("ride");
}
function pause() {
	if (mode === "ride") setMode("pause");
	else if (mode === "pause") setMode("ride");
}
function toast(text, now) {
	element("trick").textContent = text;
	toastUntil = now + 1700;
}
element("start").onclick = () => {
	renderLodge();
	setMode("lodge");
};
element("ride").onclick = start;
element("close-lodge").onclick = () => setMode("intro");
element("again").onclick = start;
element("restart").onclick = start;
element("pause").onclick = pause;
element("resume").onclick = pause;
element("home").onclick = () => {
	renderLodge();
	setMode("lodge");
};
element("sound").onclick = async () => {
	try {
		const enabled = await audio.toggle();
		element("sound").innerHTML =
			`SOUND ${enabled ? "ON" : "OFF"} <span>◌</span>`;
		element("sound").setAttribute(
			"aria-label",
			`${enabled ? "Disable" : "Enable"} mountain audio`,
		);
	} catch {
		element("sound").textContent = "AUDIO UNAVAILABLE";
	}
};
addEventListener("keydown", (event) => {
	if (
		["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
			event.code,
		) &&
		mode === "ride"
	)
		event.preventDefault();
	if (event.code === "Escape" && !event.repeat) pause();
	if (mode !== "ride") return;
	keys.add(event.code);
	if (event.code === "Space" && !event.repeat) jump = true;
});
addEventListener("keyup", (event) => keys.delete(event.code));
addEventListener("blur", () => {
	if (mode === "ride") setMode("pause");
	keys.clear();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden && mode === "ride") setMode("pause");
});
for (const button of document.querySelectorAll("[data-control]")) {
	const control = {
		left: "ArrowLeft",
		right: "ArrowRight",
		brake: "ArrowDown",
		jump: "Space",
		trick: "KeyX",
	}[button.dataset.control];
	button.addEventListener("pointerdown", (event) => {
		event.preventDefault();
		button.setPointerCapture(event.pointerId);
		keys.add(control);
		if (control === "Space") jump = true;
	});
	for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
		button.addEventListener(event, () => keys.delete(control));
}
function tick(now) {
	const dt = Math.min((now - last) / 1000, 0.05);
	last = now;
	const steer =
		Number(keys.has("ArrowRight") || keys.has("KeyD")) -
		Number(keys.has("ArrowLeft") || keys.has("KeyA"));
	if (mode === "ride") {
		step(
			state,
			{
				steer,
				brake: keys.has("ArrowDown") || keys.has("KeyS"),
				tuck: keys.has("ArrowUp") || keys.has("KeyW"),
				jump,
				trick: keys.has("KeyX"),
			},
			sessionMode === "time"
				? Math.min(dt, Math.max(0, state.timeLimit - state.elapsed))
				: dt,
		);
		jump = false;
		for (const obstacle of world.obstacles) {
			if (
				Math.abs(state.z - obstacle.z) < 1.3 &&
				Math.abs(state.x - obstacle.x) < obstacle.radius &&
				state.y < 3 + terrainHeight(obstacle.x, obstacle.z, state.courseId)
			) {
				if (crash(state)) toast("POWDER CHECK. KEEP GOING.", now);
			}
		}
		if (state.event === "trick")
			toast(`STOMPED +${state.lastLandingScore} / ${state.combo}×`, now);
		if (state.event === "land")
			toast(`AIR TIME +${state.lastLandingScore}`, now);
		element("score").textContent = Math.floor(state.score)
			.toString()
			.padStart(5, "0");
		element("speed").textContent = Math.round(state.speed * 3.6);
		element("progress").style.width =
			`${(state.distance / state.courseLength) * 100}%`;
		const remaining = Math.max(0, state.timeLimit - state.elapsed);
		const clock = sessionMode === "time" ? remaining : state.elapsed;
		element("run-clock").textContent = `${Math.floor(clock / 60)
			.toString()
			.padStart(2, "0")}:${Math.floor(clock % 60)
			.toString()
			.padStart(2, "0")}`;
		if (state.finished || (sessionMode === "time" && remaining < 0.00001)) {
			const course = courses.find((item) => item.id === state.courseId);
			const run = {
				courseId: state.courseId,
				mode: sessionMode,
				score: state.score,
				elapsed: state.elapsed,
				finished: state.finished,
				medalScore: course.medalScore,
				timeLimit: state.timeLimit,
			};
			progress = completeRun(progress, run);
			saveProgress(progress);
			const record = completeRun(
				{ records: {}, medals: 0, selectedBoard: "ember" },
				run,
			).records[`${state.courseId}:${sessionMode}`];
			element("result").querySelector("h2").innerHTML = state.finished
				? "What a<br/><em>line.</em>"
				: "Last<br/><em>chair.</em>";
			element("result-text").textContent =
				`${state.score.toLocaleString()} points · ${state.crashes} powder checks · ${record?.medal ? `${record.medal.toUpperCase()} MEDAL` : state.finished ? "Run complete — spin in the air to earn a medal" : "Time’s up — tuck to build speed"}`;
			setMode("result");
		}
	}
	if (now > toastUntil) element("trick").textContent = "";
	audio.update(state.speed, mode === "ride");
	world.render(
		state,
		steer,
		now / 1000,
		["intro", "lodge"].includes(mode) ? "intro" : mode,
	);
}
if (world) world.renderer.setAnimationLoop(tick);

function renderLodge() {
	element("courses").innerHTML = courses
		.map((course, index) => {
			const record = progress.records[`${course.id}:${sessionMode}`];
			return `<button class="course-card ${selectedCourse === course.id ? "selected" : ""}" data-course="${course.id}"><span class="eyebrow">0${index + 1} / ${course.difficulty}</span><h3>${course.name}</h3><p>${course.description}</p><small>${(course.length / 1000).toFixed(1)} KM / ${course.timeLimit} SEC</small><span class="record">${record ? `BEST ${record.score} · ${record.medal || "NO MEDAL YET"}` : "YOUR FIRST TRACKS AWAIT"}</span></button>`;
		})
		.join("");
	for (const button of element("courses").querySelectorAll("button"))
		button.onclick = () => {
			selectedCourse = button.dataset.course;
			renderLodge();
		};
	element("boards").innerHTML = boards
		.map(
			(board) =>
				`<button data-board="${board.id}" class="${progress.selectedBoard === board.id ? "selected" : ""}" ${progress.medals < board.requiredMedals ? "disabled" : ""}><i style="background:#${board.color.toString(16).padStart(6, "0")}"></i>${board.name}<small>${board.requiredMedals ? `${board.requiredMedals} MEDALS TO UNLOCK` : "YOUR DAILY DRIVER"}</small></button>`,
		)
		.join("");
	for (const button of element("boards").querySelectorAll("button"))
		button.onclick = () => {
			progress.selectedBoard = button.dataset.board;
			saveProgress(progress);
			renderLodge();
		};
	for (const button of document.querySelectorAll("[data-mode]")) {
		button.classList.toggle("selected", button.dataset.mode === sessionMode);
		button.onclick = () => {
			sessionMode = button.dataset.mode;
			renderLodge();
		};
	}
	element("run-description").textContent =
		sessionMode === "time"
			? "The clock is running. Hold ↑ to tuck, take clean lines, and reach the finish before time runs out."
			: "Your mountain, your pace. Hold X in the air to spin. Link landings to build your multiplier and earn medals.";
}
