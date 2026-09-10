export function mountainAudio() {
	let context;
	let volume;
	let filter;
	let enabled = false;
	return {
		async toggle() {
			if (!context) {
				context = new AudioContext();
				const buffer = context.createBuffer(
					1,
					context.sampleRate * 3,
					context.sampleRate,
				);
				const data = buffer.getChannelData(0);
				let last = 0;
				for (let i = 0; i < data.length; i++) {
					last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
					data[i] = last * 3.5;
				}
				const source = context.createBufferSource();
				source.buffer = buffer;
				source.loop = true;
				filter = context.createBiquadFilter();
				filter.type = "lowpass";
				volume = context.createGain();
				volume.gain.value = 0;
				source.connect(filter).connect(volume).connect(context.destination);
				source.start();
			}
			await context.resume();
			enabled = !enabled;
			return enabled;
		},
		update(speed, riding) {
			if (!context) return;
			volume.gain.setTargetAtTime(
				enabled ? (riding ? 0.12 + speed * 0.013 : 0.1) : 0,
				context.currentTime,
				0.2,
			);
			filter.frequency.setTargetAtTime(
				350 + speed * 55,
				context.currentTime,
				0.2,
			);
		},
	};
}
