import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
	boards,
	completeRun,
	loadProgress,
	saveProgress,
} from "../src/progression.js";

const originalStorage = globalThis.localStorage;
let storage;

beforeEach(() => {
	storage = new Map();
	globalThis.localStorage = {
		getItem: (key) => storage.get(key) ?? null,
		setItem: (key, value) => storage.set(key, value),
	};
});

afterEach(() => {
	if (originalStorage === undefined) delete globalThis.localStorage;
	else globalThis.localStorage = originalStorage;
});

function run(overrides = {}) {
	return {
		courseId: "ridge",
		mode: "freeride",
		score: 1000,
		elapsed: 60,
		finished: true,
		medalScore: 1000,
		timeLimit: 90,
		...overrides,
	};
}

test("new riders start on Ember with no records", () => {
	assert.deepEqual(loadProgress(), {
		records: {},
		medals: 0,
		selectedBoard: "ember",
	});
	assert.deepEqual(
		boards.map((board) => board.requiredMedals),
		[0, 1, 3],
	);
});

test("corrupt storage and unavailable storage recover safely", () => {
	storage.set("wntr-ski:progress:v1", "{invalid");
	assert.equal(loadProgress().medals, 0);
	delete globalThis.localStorage;
	assert.equal(loadProgress().selectedBoard, "ember");
	assert.equal(saveProgress(loadProgress()), false);
});

test("bronze, silver, and gold require their score threshold", () => {
	for (const [score, medal] of [
		[349, null],
		[350, "bronze"],
		[650, "silver"],
		[1000, "gold"],
	]) {
		const result = completeRun(loadProgress(), run({ score }));
		assert.equal(result.records["ridge:freeride"].medal, medal);
		assert.equal(result.medals, medal ? 1 : 0);
	}
});

test("unfinished runs and expired time trials cannot award medals", () => {
	const unfinished = completeRun(loadProgress(), run({ finished: false }));
	assert.equal(unfinished.records["ridge:freeride"].time, null);
	assert.equal(unfinished.medals, 0);
	const expired = completeRun(
		loadProgress(),
		run({ mode: "time", elapsed: 91 }),
	);
	assert.equal(expired.medals, 0);
	const onTime = completeRun(
		loadProgress(),
		run({ mode: "time", elapsed: 90 }),
	);
	assert.equal(onTime.medals, 1);
});

test("replays preserve best score, best finish, and highest medal without double-counting", () => {
	const original = loadProgress();
	const first = completeRun(original, run());
	const replay = completeRun(first, run({ score: 350, elapsed: 50 }));
	assert.deepEqual(original.records, {});
	assert.deepEqual(replay.records["ridge:freeride"], {
		score: 1000,
		time: 50,
		medal: "gold",
	});
	assert.equal(replay.medals, 1);
	assert.equal(first.records["ridge:freeride"].time, 60);
});

test("distinct course and mode medals unlock boards and persist", () => {
	let progress = completeRun(loadProgress(), run());
	progress = completeRun(progress, run({ mode: "time" }));
	progress = completeRun(progress, run({ courseId: "glacier" }));
	progress.selectedBoard = "midnight";
	assert.equal(saveProgress(progress), true);
	assert.deepEqual(loadProgress(), progress);
	assert.equal(progress.medals, 3);
});

test("a timeout preserves the career medal but earns no medal for this run", () => {
	const first = completeRun(loadProgress(), run({ mode: "time" }));
	const timeout = run({
		mode: "time",
		finished: false,
		elapsed: 90,
		score: 1500,
	});
	const career = completeRun(first, timeout);
	const current = completeRun(loadProgress(), timeout);
	assert.equal(career.records["ridge:time"].medal, "gold");
	assert.equal(career.records["ridge:time"].time, 60);
	assert.equal(career.medals, 1);
	assert.equal(current.records["ridge:time"].medal, null);
	assert.equal(current.medals, 0);
});

test("stored medal counts cannot unlock boards without qualifying records", () => {
	storage.set(
		"wntr-ski:progress:v1",
		JSON.stringify({ medals: 999, selectedBoard: "midnight", records: {} }),
	);
	assert.equal(loadProgress().selectedBoard, "ember");
	assert.equal(loadProgress().medals, 0);
});

test("invalid numeric run results fail visibly", () => {
	assert.throws(() => completeRun(loadProgress(), run({ score: NaN })));
	assert.throws(() => completeRun(loadProgress(), run({ elapsed: -1 })));
	assert.throws(() => completeRun(loadProgress(), run({ medalScore: 0 })));
});
