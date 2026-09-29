export function mountainAudio() {
	let context;
	let master;
	let wind;
	let windFilter;
	let edge;
	let edgeFilter;
	let lift;
	let liftMotor;
	let engine;
	let engineMotor;
	let engineFilter;
	let rail;
	let noiseBuffer;
	let enabled = false;
	let previousBoost = false;
	const played = new Map();

	function tone(frequency, end, duration, volume, delay = 0, type = "sine") {
		const at = context.currentTime + delay;
		const source = context.createOscillator();
		const gain = context.createGain();
		source.type = type;
		source.frequency.setValueAtTime(frequency, at);
		source.frequency.exponentialRampToValueAtTime(end, at + duration);
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(volume, at + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
		source.connect(gain).connect(master);
		source.start(at);
		source.stop(at + duration + 0.02);
		source.onended = () => {
			source.disconnect();
			gain.disconnect();
		};
	}
	function puff(duration, frequency, volume) {
		const source = context.createBufferSource();
		const filter = context.createBiquadFilter();
		const gain = context.createGain();
		const now = context.currentTime;
		source.buffer = noiseBuffer;
		filter.type = "lowpass";
		filter.frequency.value = frequency;
		gain.gain.setValueAtTime(volume, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
		source.connect(filter).connect(gain).connect(master);
		source.start();
		source.stop(now + duration);
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
	}
	function effect(kind) {
		if (!context || !enabled) return;
		const now = context.currentTime;
		if (now - (played.get(kind) ?? -Infinity) < 0.12) return;
		played.set(kind, now);
		if (kind === "smash") {
			tone(180, 38, 0.32, 0.3, 0, "triangle");
			puff(0.48, 3600, 0.45);
			for (let i = 0; i < 3; i++)
				tone(420 + i * 160, 150, 0.13, 0.08, i * 0.04, "square");
		} else if (kind === "engine") {
			tone(45, 150, 0.45, 0.16, 0, "triangle");
		} else if (kind === "grindStart") {
			puff(0.15, 5000, 0.22);
			tone(1600, 700, 0.18, 0.06);
		} else if (kind === "jump") {
			tone(260, 620, 0.22, 0.12);
			puff(0.18, 2400, 0.1);
		} else if (kind === "land") {
			tone(100, 42, 0.16, 0.2);
			puff(0.2, 1600, 0.25);
		} else if (kind === "crash") {
			tone(160, 35, 0.32, 0.2, 0, "triangle");
			puff(0.4, 1100, 0.4);
		} else if (kind === "snowball") {
			tone(180, 65, 0.13, 0.14);
			puff(0.16, 800, 0.22);
		} else if (kind === "boost") {
			tone(120, 320, 0.2, 0.05, 0, "triangle");
			puff(0.4, 4000, 0.12);
		} else {
			const notes =
				kind === "finish"
					? [523, 659, 784, 1047]
					: kind === "collect"
						? [660, 880, 1320]
						: kind === "lift"
							? [660, 523]
							: kind === "trick"
								? [440, 660, 880]
								: [440, 660];
			for (const [index, frequency] of notes.entries())
				tone(frequency, frequency, 0.3, 0.13, index * 0.09);
		}
	}
	function initialize() {
		context = new AudioContext();
		master = context.createGain();
		master.gain.value = 0.65;
		master.connect(context.destination);
		noiseBuffer = context.createBuffer(
			1,
			context.sampleRate * 3,
			context.sampleRate,
		);
		const data = noiseBuffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		const ambient = (frequency) => {
			const source = context.createBufferSource();
			source.buffer = noiseBuffer;
			source.loop = true;
			const filter = context.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = frequency;
			const gain = context.createGain();
			gain.gain.value = 0;
			source.connect(filter).connect(gain).connect(master);
			source.start();
			return { filter, gain };
		};
		const windSound = ambient(550);
		wind = windSound.gain;
		windFilter = windSound.filter;
		const edgeSound = ambient(1700);
		edge = edgeSound.gain;
		edgeFilter = edgeSound.filter;
		liftMotor = context.createOscillator();
		liftMotor.type = "triangle";
		liftMotor.frequency.value = 55;
		lift = context.createGain();
		lift.gain.value = 0;
		liftMotor.connect(lift).connect(master);
		liftMotor.start();
		engineMotor = context.createOscillator();
		engineMotor.type = "sawtooth";
		engineMotor.frequency.value = 55;
		engineFilter = context.createBiquadFilter();
		engineFilter.type = "lowpass";
		engineFilter.frequency.value = 400;
		engine = context.createGain();
		engine.gain.value = 0;
		engineMotor.connect(engineFilter).connect(engine).connect(master);
		engineMotor.start();
		const railSound = ambient(4500);
		rail = railSound.gain;
	}
	return {
		async toggle() {
			if (!context) initialize();
			await context.resume();
			enabled = !enabled;
			master.gain.setTargetAtTime(
				enabled ? 0.65 : 0,
				context.currentTime,
				0.03,
			);
			if (enabled) effect("lift");
			return enabled;
		},
		effect,
		update(state, input, mode) {
			if (!context) return;
			const now = context.currentTime;
			const riding = mode === "ride";
			const speed = Math.min(1, Math.abs(state.speed) / 29);
			master.gain.setTargetAtTime(
				enabled && mode !== "pause" ? 0.65 : 0,
				now,
				0.08,
			);
			wind.gain.setTargetAtTime(0.025 + (riding ? speed * 0.12 : 0), now, 0.2);
			windFilter.frequency.setTargetAtTime(350 + speed * 1100, now, 0.2);
			edge.gain.setTargetAtTime(
				riding && !state.airborne && !state.lift
					? speed * (0.035 + Math.abs(input.steer) * 0.075)
					: 0,
				now,
				0.08,
			);
			edgeFilter.frequency.setTargetAtTime(
				1200 + Math.abs(input.steer) * 2200,
				now,
				0.15,
			);
			engine.gain.setTargetAtTime(
				riding && state.vehicle === "snowmobile" ? 0.045 + speed * 0.05 : 0,
				now,
				0.15,
			);
			engineMotor.frequency.setTargetAtTime(
				55 + speed * 175 + Math.abs(input.throttle) * 20,
				now,
				0.12,
			);
			engineFilter.frequency.setTargetAtTime(350 + speed * 1300, now, 0.15);
			rail.gain.setTargetAtTime(
				riding && state.grind ? 0.1 * speed : 0,
				now,
				0.06,
			);
			const nearLift = Math.max(
				0,
				1 - Math.hypot(state.x + 23, state.z + 23) / 22,
			);
			lift.gain.setTargetAtTime(
				riding ? (state.lift ? 0.035 : nearLift * 0.018) : 0,
				now,
				0.3,
			);
			liftMotor.frequency.setTargetAtTime(
				55 + Math.sin(now * 5) * 2,
				now,
				0.08,
			);
			if (riding && input.boost && !previousBoost && speed > 0.05)
				effect("boost");
			previousBoost = input.boost;
		},
	};
}
