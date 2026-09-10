const storageKey = "wntr-ski:progress:v1";
const medalRanks = { bronze: 1, silver: 2, gold: 3 };

export const boards = [
	{ id: "ember", name: "Ember", color: 0xff713d, requiredMedals: 0 },
	{ id: "ice", name: "Ice", color: 0xc7f1ff, requiredMedals: 1 },
	{ id: "midnight", name: "Midnight", color: 0x242c49, requiredMedals: 3 },
];

function emptyProgress() {
	return { records: {}, medals: 0, selectedBoard: "ember" };
}

function normalizeProgress(value) {
	if (!value || typeof value !== "object") return emptyProgress();
	const records = {};
	if (value.records && typeof value.records === "object") {
		for (const [key, record] of Object.entries(value.records)) {
			if (!record || typeof record !== "object") continue;
			if (key === "__proto__" || key === "constructor") continue;
			records[key] = {
				score: Number.isFinite(record.score) ? Math.max(0, record.score) : 0,
				time:
					Number.isFinite(record.time) && record.time >= 0 ? record.time : null,
				medal: Object.hasOwn(medalRanks, record.medal) ? record.medal : null,
			};
		}
	}
	const medals = Object.values(records).filter((record) => record.medal).length;
	const board = boards.find((entry) => entry.id === value.selectedBoard);
	return {
		records,
		medals,
		selectedBoard: board && board.requiredMedals <= medals ? board.id : "ember",
	};
}

export function loadProgress() {
	try {
		return normalizeProgress(
			JSON.parse(globalThis.localStorage.getItem(storageKey)),
		);
	} catch {
		return emptyProgress();
	}
}

export function saveProgress(progress) {
	try {
		globalThis.localStorage.setItem(
			storageKey,
			JSON.stringify(normalizeProgress(progress)),
		);
		return true;
	} catch {
		return false;
	}
}

export function completeRun(
	progress,
	{ courseId, mode, score, elapsed, finished, medalScore, timeLimit },
) {
	const next = normalizeProgress(progress);
	if (
		!courseId ||
		!mode ||
		!Number.isFinite(score) ||
		!Number.isFinite(elapsed)
	) {
		throw new Error(
			"A completed run needs a course, mode, score, and elapsed time.",
		);
	}
	if (
		score < 0 ||
		elapsed < 0 ||
		!Number.isFinite(medalScore) ||
		medalScore <= 0
	) {
		throw new Error(
			"Run values must be positive, with a nonzero medal target.",
		);
	}
	const key = `${courseId}:${mode}`;
	const previous = next.records[key] ?? { score: 0, time: null, medal: null };
	const eligible = finished && (mode !== "time" || elapsed <= timeLimit);
	const ratio = score / medalScore;
	const earned = eligible
		? ratio >= 1
			? "gold"
			: ratio >= 0.65
				? "silver"
				: ratio >= 0.35
					? "bronze"
					: null
		: null;
	const medal =
		(medalRanks[earned] ?? 0) > (medalRanks[previous.medal] ?? 0)
			? earned
			: previous.medal;
	next.records[key] = {
		score: Math.max(previous.score, score),
		time: finished
			? Math.min(previous.time ?? Infinity, elapsed)
			: previous.time,
		medal,
	};
	next.medals = Object.values(next.records).filter(
		(record) => record.medal,
	).length;
	return next;
}
