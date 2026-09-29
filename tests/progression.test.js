import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { loadProgress, saveProgress } from "../src/progression.js";

const originalStorage = Object.getOwnPropertyDescriptor(
	globalThis,
	"localStorage",
);
let storage;
beforeEach(() => {
	storage = new Map();
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (key) => storage.get(key) ?? null,
			setItem: (key, value) => storage.set(key, value),
		},
	});
});
afterEach(() => {
	if (originalStorage)
		Object.defineProperty(globalThis, "localStorage", originalStorage);
	else delete globalThis.localStorage;
});
test("exploration discoveries, score, and circuit record survive a reload", () => {
	const progress = {
		score: 450,
		visited: ["lodge", "lake"],
		collected: ["crystal-0"],
		bestRace: 42.3,
	};
	assert.equal(saveProgress(progress), true);
	assert.deepEqual(loadProgress(), progress);
});
test("invalid saved data cannot introduce unknown or duplicate collectibles", () => {
	storage.set(
		"wntr-ski:explore:v1",
		JSON.stringify({
			score: -50,
			visited: ["unknown", "lodge", "lodge"],
			collected: ["crystal-0", "crystal-0", "fake"],
			bestRace: -1,
		}),
	);
	assert.deepEqual(loadProgress(), {
		score: 0,
		visited: ["lodge"],
		collected: ["crystal-0"],
		bestRace: null,
	});
});
test("corrupt or blocked browser storage does not prevent playing", () => {
	storage.set("wntr-ski:explore:v1", "{broken");
	assert.equal(loadProgress().score, 0);
	delete globalThis.localStorage;
	assert.deepEqual(loadProgress().collected, []);
	assert.equal(saveProgress({}), false);
});
