export function createInput({ canvas, world, active, action }) {
	const keys = new Set();
	const touches = new Map();
	const stick = document.getElementById("stick");
	const joystick = document.getElementById("joystick");
	let jump = false;
	let axis = { steer: 0, throttle: 0 };
	let stickPointer = null;
	const cameraPointers = new Map();
	let pinchDistance = 0;
	const shortcuts = {
		Escape: "pause",
		KeyM: "map",
		KeyR: "reset",
		KeyE: "interact",
		Enter: "interact",
	};
	const movement = [
		"ArrowUp",
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
		"Space",
		"KeyW",
		"KeyA",
		"KeyS",
		"KeyD",
		"KeyX",
		"KeyB",
		"ShiftLeft",
		"ShiftRight",
	];
	addEventListener("keydown", (event) => {
		if (
			shortcuts[event.code] &&
			!event.repeat &&
			(event.code !== "Enter" || (active() && event.target === canvas))
		) {
			event.preventDefault();
			action(shortcuts[event.code]);
			return;
		}
		if (
			[
				"KeyW",
				"KeyA",
				"KeyS",
				"KeyD",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
			].includes(event.code) &&
			!active()
		)
			action("start");
		if (!active() || !movement.includes(event.code)) return;
		event.preventDefault();
		keys.add(event.code);
		if (event.code === "Space" && !event.repeat) jump = true;
	});
	addEventListener("keyup", (event) => keys.delete(event.code));
	const moveStick = (event) => {
		const rect = joystick.getBoundingClientRect();
		const dx = event.clientX - rect.left - rect.width / 2;
		const dy = event.clientY - rect.top - rect.height / 2;
		const radius = rect.width * 0.34;
		const length = Math.max(radius, Math.hypot(dx, dy));
		axis = { steer: dx / length, throttle: -dy / length };
		stick.style.transform = `translate(${axis.steer * radius}px, ${-axis.throttle * radius}px)`;
	};
	joystick.addEventListener("pointerdown", (event) => {
		if (!active() || stickPointer !== null) return;
		event.preventDefault();
		stickPointer = event.pointerId;
		joystick.setPointerCapture(event.pointerId);
		moveStick(event);
	});
	joystick.addEventListener("pointermove", (event) => {
		if (event.pointerId === stickPointer) moveStick(event);
	});
	for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
		joystick.addEventListener(type, (event) => {
			if (event.pointerId !== stickPointer) return;
			stickPointer = null;
			axis = { steer: 0, throttle: 0 };
			stick.style.transform = "";
		});
	}
	for (const button of document.querySelectorAll("[data-control]")) {
		button.addEventListener("pointerdown", (event) => {
			if (!active()) return;
			event.preventDefault();
			button.setPointerCapture(event.pointerId);
			touches.set(event.pointerId, button.dataset.control);
			if (button.dataset.control === "jump") jump = true;
		});
		for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
			button.addEventListener(type, (event) => touches.delete(event.pointerId));
		}
	}
	const distance = () => {
		const [first, second] = [...cameraPointers.values()];
		return second ? Math.hypot(first.x - second.x, first.y - second.y) : 0;
	};
	canvas.addEventListener("pointerdown", (event) => {
		if (event.button !== 0 || cameraPointers.size >= 2) return;
		cameraPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		canvas.setPointerCapture(event.pointerId);
		pinchDistance = distance();
	});
	canvas.addEventListener("pointermove", (event) => {
		const previous = cameraPointers.get(event.pointerId);
		if (!previous) return;
		cameraPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (cameraPointers.size === 2) {
			const next = distance();
			world.zoom((pinchDistance - next) * 0.04);
			pinchDistance = next;
		} else world.orbit((event.clientX - previous.x) * 0.007);
	});
	for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
		canvas.addEventListener(type, (event) => {
			cameraPointers.delete(event.pointerId);
			pinchDistance = distance();
		});
	}
	canvas.addEventListener(
		"wheel",
		(event) => {
			event.preventDefault();
			world.zoom(event.deltaY * 0.015);
		},
		{ passive: false },
	);
	return {
		read() {
			const held = (name) => [...touches.values()].includes(name);
			const value = {
				steer: Math.max(
					-1,
					Math.min(
						1,
						axis.steer +
							Number(keys.has("ArrowRight") || keys.has("KeyD")) -
							Number(keys.has("ArrowLeft") || keys.has("KeyA")),
					),
				),
				throttle: Math.max(
					-1,
					Math.min(
						1,
						axis.throttle +
							Number(keys.has("ArrowUp") || keys.has("KeyW")) -
							Number(keys.has("ArrowDown") || keys.has("KeyS")),
					),
				),
				boost: held("boost") || keys.has("ShiftLeft") || keys.has("ShiftRight"),
				brake: held("brake") || keys.has("KeyB"),
				trick: held("trick") || keys.has("KeyX"),
				jump,
			};
			jump = false;
			return value;
		},
		clear() {
			keys.clear();
			touches.clear();
			jump = false;
			axis = { steer: 0, throttle: 0 };
			stickPointer = null;
			cameraPointers.clear();
			pinchDistance = 0;
			stick.style.transform = "";
		},
	};
}
