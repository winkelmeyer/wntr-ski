import { crystals, landmarks } from "./terrain.js";

const storageKey = "wntr-ski:explore:v1";

function normalize(value) {
	const valid = value && typeof value === "object" ? value : {};
	const ids = (items, saved) =>
		Array.isArray(saved)
			? items.filter((item) => saved.includes(item.id)).map((item) => item.id)
			: [];
	return {
		score: Number.isFinite(valid.score)
			? Math.max(0, Math.floor(valid.score))
			: 0,
		visited: ids(landmarks, valid.visited),
		collected: ids(crystals, valid.collected),
		bestRace:
			Number.isFinite(valid.bestRace) && valid.bestRace > 0
				? valid.bestRace
				: null,
	};
}

export function loadProgress() {
	try {
		return normalize(JSON.parse(localStorage.getItem(storageKey)));
	} catch {
		return normalize(null);
	}
}

export function saveProgress(state) {
	try {
		localStorage.setItem(storageKey, JSON.stringify(normalize(state)));
		return true;
	} catch {
		return false;
	}
}
