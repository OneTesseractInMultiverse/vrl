export const DEFAULT_SEED = 0x56524c22;

/**
 * Validate a decimal or hex unsigned 32-bit replay seed and reject unsafe, negative or malformed input.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above; defaults to String(DEFAULT_SEED).
 * @returns {unknown} The result returned by Number.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function parseSeed(value = String(DEFAULT_SEED)) {
  if (!/^(?:0x[\da-f]+|\d+)$/i.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 0xffffffff) {
    throw new TypeError("VRL_TEST_SEED must be an unsigned 32-bit integer (decimal or hex).");
  }
  return Number(value);
}

/**
 * Create a deterministic unsigned 32-bit generator closure whose private state advances independently of time
 * and platform. Fixed 32-bit recurrence: independent of time, platform, and production code.
 * @responsibility computation
 * @param {number} seed - Unsigned 32-bit replay seed.
 * @returns {Function} A reusable closure retaining this invocation's configuration or private state.
 */

export function seededRandom(seed) {
  let state = seed >>> 0;
  /**
   * Advance the private unsigned 32-bit linear recurrence and reduce it modulo the caller's positive bound;
   * identical call sequences are reproducible.
   * @responsibility computation
   * @param {number} maximum - Exclusive random bound or inclusive validation limit defined by this operation.
   * @returns {number} The result of the documented comparison or calculation.
   */
  return (maximum) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % maximum;
  };
}

/**
 * Build deterministic valid route cases and independently declared expected events for a replay seed.
 * @responsibility computation
 * @param {number} seed - Unsigned 32-bit replay seed.
 * @param {number} count - Number of generated records or declared anchors; visual caps do not alter declared quantities; defaults to 24.
 * @returns {unknown} The result returned by Array.from.
 */
export function routeCases(seed, count = 24) {
  const next = seededRandom(seed);
  return Array.from({ length: count }, /**
   * Apply routeCase to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by routeCase.
   */ (_, index) => routeCase(seed, index, next));
}

/**
 * Construct one varied route with independently computed endpoint elevations, technical facts and
 * hostile-but-valid text.
 * @responsibility computation
 * @param {number} seed - Unsigned 32-bit replay seed.
 * @param {number} index - Zero-based position in the current ordered collection.
 * @param {unknown} next - Deterministic random generator or explicit update record, as required by this helper.
 * @returns {Object} A record containing seed, index, title, source, plainSource, entrance, exit, events, notes, options.
 */
function routeCase(seed, index, next) {
  const entrance = next(2000) - 1000;
  const events = Array.from({ length: 1 + index % 7 }, /**
   * Apply technicalEvent to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} eventIndex - Zero-based technical-event position.
   * @returns {unknown} The result returned by technicalEvent.
   */ (_, eventIndex) => technicalEvent(index, eventIndex, next));
  const exit = entrance + events.reduce(/**
   * Compute sum + event.delta.
   * @responsibility computation
   * @param {number} sum - Accumulated numeric sum before processing the current entry.
   * @param {unknown} event - SvelteKit request event or independently specified technical event.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (sum, event) => sum + event.delta, 0);
  const title = `Canyon ${index} & <ledge> &amp; "survey" 🧗 ${"W".repeat(next(70))}`;
  const header = [`route ${JSON.stringify(title)}`, `metadata entrance_elevation=${entrance}m exit_elevation=${exit}m`];
  const before = `Entry ${index} & <notice>`;
  const after = `Exit ${index} \\ checked`;
  const progression = events.map(eventStatement);
  // A later explicit R1 reserves the identifier before the first unnamed rappel.
  progression.push('walk R1 distance=1m');
  if (index % 2 === 0) { progression.unshift("start"); progression.push("exit"); }
  const annotated = progression.flatMap(/**
   * Project the current entry into an ordered tuple for progression.flatMap.
   * @responsibility computation
   * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
   * @param {number} i - Zero-based iteration position.
   * @returns {Array} The ordered records or values assembled above.
   */ (line, i) => [line, `note ${JSON.stringify(`Station ${index}/${i} <&>`)}`]);
  const source = [...header, `note ${JSON.stringify(before)}`, ...annotated, `hazard type=loose_rock severity=high`, `note ${JSON.stringify(after)}`].join("\n");
  return { seed, index, title, source, plainSource: [...header, ...progression].join("\n"), entrance, exit, events,
    notes: [before, ...progression.map(/**
     * Format the current entry as the text required by progression.map, preserving supplied values.
     * @responsibility computation
     * @param {unknown} _ - Required callback placeholder; intentionally unused.
     * @param {number} i - Zero-based iteration position.
     * @returns {string} Formatted text retaining the supplied values and ordering.
     */ (_, i) => `Station ${index}/${i} <&>`), after],
    options: { layout: { width: [1, 320, 900][index % 3], spineX: index % 2 === 0 ? 0 : 96,
      marginY: 0, marginBottom: 0, minNodeGap: [0, 1, 68][index % 3], pixelsPerMeter: [0.25, 5.5, 12][index % 3] } } };
}

/**
 * Generate one bounded technical event with explicit expected direction, vertical delta, stages and
 * redirection facts.
 * @responsibility computation
 * @param {number} caseIndex - Zero-based replay-case index.
 * @param {number} index - Zero-based position in the current ordered collection.
 * @param {unknown} next - Deterministic random generator or explicit update record, as required by this helper.
 * @returns {Object} A record containing type, id, unnamed, height, inclination, delta, stages, redirection, side, shape.
 */
function technicalEvent(caseIndex, index, next) {
  const type = index === 0 ? "rappel" : ["rappel", "climb", "downclimb"][(caseIndex + index) % 3];
  const height = 4 * (1 + next(25));
  const inclination = [25, 50, 100][next(3)];
  return { type, id: index === 0 ? "R2" : `T${caseIndex}_${index}`, unnamed: index === 0,
    height, inclination, delta: height * inclination / 100 * (type === "climb" ? 1 : -1),
    stages: [height / 4, height * 3 / 4], redirection: height / 2, side: next(2) === 0 ? "left" : "right",
    shape: ["ladder", "direct", "slab"][(caseIndex + index) % 3] };
}

/**
 * Serialize the generated event's declared facts into one VRL statement.
 * @responsibility computation
 * @param {unknown} event - SvelteKit request event or independently specified technical event.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function eventStatement(event) {
  return `${event.type}${event.unnamed ? "" : ` ${event.id}`} height=${event.height}m${event.type === "rappel" ? ` rope=${event.height * 2}m` : ""} inclination=${event.inclination}% stages=${event.stages.join("m+")}m redirection=${event.redirection}m:${event.side} shape=${event.shape}`;
}

/**
 * Construct deterministic invalid routes paired with independently specified diagnostic codes, each violating
 * a named grammar or domain rule. Mutations each violate one documented rule; expected codes are explicit test
 * facts.
 * @responsibility computation
 * @param {number} seed - Unsigned 32-bit replay seed.
 * @param {number} count - Number of generated records or declared anchors; visual caps do not alter declared quantities; defaults to 16.
 * @returns {Array} The result returned by Array.from({ length: count }, (_, index) => { const height = 1 + next(100); const prefix = `${"# generated comment\n".repeat(next(3))}route "Case ${index}"\n`; .flat.
 */

export function malformedCases(seed, count = 16) {
  const next = seededRandom(seed);
  return Array.from({ length: count }, /**
   * Generate one group of invalid sources and explicit expected diagnostic codes from deterministic height and
   * comment offsets.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
   */ (_, index) => {
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
    ].map(/**
     * Project seed, index, kind, source, code into the record required by [ ["duplicate-field", `rappel
     * height=${height}m height=${height}m rope=${height * 2}m`, "VRL_SYNTAX_DUPLICATE_ATTRIBUTE"],
     * ["unterminated", 'note "unfinished', .map.
     * @responsibility computation
     * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
     * @param {unknown} input1[0] - Tuple member bound as kind: the ordered input consumed below.
     * @param {unknown} input1[1] - Tuple member bound as body: VRL statement body or function body selected for the scenario.
     * @param {unknown} input1[2] - Tuple member bound as code: the ordered input consumed below.
     * @returns {Object} A record containing seed, index, kind, source, code.
     */ ([kind, body, code]) => ({ seed, index, kind, source: prefix + body, code }));
  }).flat();
}

/**
 * Format a stable test-case name containing replay seed and case identity.
 * @responsibility computation
 * @param {unknown} item - Current prepared record or test case.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
export function caseName(item) {
  return `seed=${item.seed} case=${item.index}${item.kind ? ` ${item.kind}` : ""}`;
}
