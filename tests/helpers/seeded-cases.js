export const DEFAULT_SEED = 0x56524c22;

export function parseSeed(value = String(DEFAULT_SEED)) {
  if (!/^(?:0x[\da-f]+|\d+)$/i.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 0xffffffff) {
    throw new TypeError("VRL_TEST_SEED must be an unsigned 32-bit integer (decimal or hex).");
  }
  return Number(value);
}

/** Fixed 32-bit recurrence: independent of time, platform, and production code. */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return (maximum) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % maximum;
  };
}

export function routeCases(seed, count = 24) {
  const next = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => routeCase(seed, index, next));
}

function routeCase(seed, index, next) {
  const entrance = next(2000) - 1000;
  const events = Array.from({ length: 1 + index % 7 }, (_, eventIndex) => technicalEvent(index, eventIndex, next));
  const exit = entrance + events.reduce((sum, event) => sum + event.delta, 0);
  const title = `Canyon ${index} & <ledge> &amp; "survey" 🧗 ${"W".repeat(next(70))}`;
  const header = [`route ${JSON.stringify(title)}`, `metadata entrance_elevation=${entrance}m exit_elevation=${exit}m`];
  const before = `Entry ${index} & <notice>`;
  const after = `Exit ${index} \\ checked`;
  const progression = events.map(eventStatement);
  // A later explicit R1 reserves the identifier before the first unnamed rappel.
  progression.push('walk R1 distance=1m');
  if (index % 2 === 0) { progression.unshift("start"); progression.push("exit"); }
  const annotated = progression.flatMap((line, i) => [line, `note ${JSON.stringify(`Station ${index}/${i} <&>`)}`]);
  const source = [...header, `note ${JSON.stringify(before)}`, ...annotated, `hazard type=loose_rock severity=high`, `note ${JSON.stringify(after)}`].join("\n");
  return { seed, index, title, source, plainSource: [...header, ...progression].join("\n"), entrance, exit, events,
    notes: [before, ...progression.map((_, i) => `Station ${index}/${i} <&>`), after],
    options: { layout: { width: [1, 320, 900][index % 3], spineX: index % 2 === 0 ? 0 : 96,
      marginY: 0, marginBottom: 0, minNodeGap: [0, 1, 68][index % 3], pixelsPerMeter: [0.25, 5.5, 12][index % 3] } } };
}

function technicalEvent(caseIndex, index, next) {
  const type = index === 0 ? "rappel" : ["rappel", "climb", "downclimb"][(caseIndex + index) % 3];
  const height = 4 * (1 + next(25));
  const inclination = [25, 50, 100][next(3)];
  return { type, id: index === 0 ? "R2" : `T${caseIndex}_${index}`, unnamed: index === 0,
    height, inclination, delta: height * inclination / 100 * (type === "climb" ? 1 : -1),
    stages: [height / 4, height * 3 / 4], redirection: height / 2, side: next(2) === 0 ? "left" : "right",
    shape: ["ladder", "direct", "slab"][(caseIndex + index) % 3] };
}

function eventStatement(event) {
  return `${event.type}${event.unnamed ? "" : ` ${event.id}`} height=${event.height}m${event.type === "rappel" ? ` rope=${event.height * 2}m` : ""} inclination=${event.inclination}% stages=${event.stages.join("m+")}m redirection=${event.redirection}m:${event.side} shape=${event.shape}`;
}

/** Mutations each violate one documented rule; expected codes are explicit test facts. */
export function malformedCases(seed, count = 16) {
  const next = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const height = 1 + next(100);
    const prefix = `${"# generated comment\n".repeat(next(3))}route "Case ${index}"\n`;
    return [
      ["duplicate-field", `rappel height=${height}m height=${height}m rope=${height * 2}m`, "VRL_SYNTAX_DUPLICATE_ATTRIBUTE"],
      ["unterminated", 'note "unfinished', "VRL_LEX_UNTERMINATED_STRING"],
      ["missing-value", "walk distance=", "VRL_LEX_MISSING_VALUE"],
      ["unknown-unit", `walk distance=${height}ft`, "VRL_FIELD_MEASUREMENT_SYNTAX"],
      ["zero-height", `rappel height=0m rope=${height}m`, "VRL_FIELD_MEASUREMENT_RANGE"],
      ["duplicate-id", `walk shared distance=${height}m\npool shared type=deep`, "VRL_IDENTIFIER_DUPLICATE"],
      ["late-metadata", "start\nmetadata country=CR", "VRL_SYNTAX_METADATA_ORDER"]
    ].map(([kind, body, code]) => ({ seed, index, kind, source: prefix + body, code }));
  }).flat();
}

export function caseName(item) {
  return `seed=${item.seed} case=${item.index}${item.kind ? ` ${item.kind}` : ""}`;
}
