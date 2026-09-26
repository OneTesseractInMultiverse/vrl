import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createRouteCompiler, createRouteElement, formatDiagnostic, normalizeElement, normalizeRoute, parseVrl, validateElement, validateRoute } from "@subvertic/vrl-core";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";

/**
 * Wrap supplied statements in a named complete route document for identifier-policy scenarios.
 * @responsibility computation
 * @param {unknown} body - VRL statement body or function body selected for the scenario.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function route(body) {
  return `route "Identifier survey"\n${body}`;
}

/**
 * Project normalized element IDs in source order for collision and determinism comparisons.
 * @responsibility computation
 * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
 * @returns {Array} The result returned by model.elements.map.
 */
function ids(model) {
  return model.elements.map(/**
   * Project element.id from the current record.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The element.id value selected or validated above.
   */ (element) => element.id);
}

/**
 * Construct one raw element with independently selected ID, type and source line.
 * @responsibility computation
 * @param {unknown} id - Explicit or already allocated route element identifier.
 * @param {unknown} type - Declared element or record discriminator; defaults to "walk".
 * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner; defaults to 2.
 * @returns {unknown} The result returned by createRouteElement.
 */
function element(id, type = "walk", line = 2) {
  return createRouteElement(type, {}, { line, column: 1 }, id);
}

const ALLOCATIONS = [
  ["original explicit R2 collision", "rappel R2 height=5m rope=5m\nrappel height=5m rope=5m", ["R2", "R3"]],
  ["forward reservation", "rappel height=5m rope=5m\nrappel R1 height=5m rope=5m", ["R2", "R1"]],
  ["consecutive forward reservations", "rappel height=5m rope=5m\nrappel R1 height=5m rope=5m\nrappel R2 height=5m rope=5m\nrappel height=5m rope=5m", ["R3", "R1", "R2", "R6"]],
  ["cross-type reservation", "walk R1\nrappel height=5m rope=5m", ["R1", "R2"]],
  ["cross-type forward reservation", "rappel height=5m rope=5m\nwalk R1", ["R2", "R1"]],
  ["explicit IDs still consume a sequence step", "walk survey-station\nwalk", ["survey-station", "W2"]],
  ["large suffixes do not set counters", "walk W9007199254740991999999999\nwalk", ["W9007199254740991999999999", "W2"]],
  ["different prefixes do not share counters", "walk\npool\nwalk\npool", ["W1", "P1", "W2", "P2"]],
  ["case-sensitive names", "walk W1\nwalk w1\nwalk", ["W1", "w1", "W3"]],
  ["case-sensitive reservation", "pool w1\nwalk", ["w1", "W1"]],
  ["leading zeros remain literal", "pool W01\nwalk", ["W01", "W1"]],
  ["interior and surrounding whitespace preserved", 'walk " A "\nwalk "A"\nwalk "A B"', [" A ", "A", "A B"]],
  ["Unicode has no implicit normalization", 'walk "Cañón 🧗"\nwalk "é"\nwalk "é"', ["Cañón 🧗", "é", "é"]],
  ["labels are not identifiers", 'start "W1"\nwalk\nexit "W1"', ["S1", "W1", "E1"]],
  ["note text is not an identifier", 'note "W1"\nwalk\nnote "W1"', ["N1", "W1", "N2"]],
  ["id attribute remains extension data", "walk id=survey-name\nwalk", ["W1", "W2"]],
  ["all default prefixes", "start\nwalk\nrappel height=5m rope=5m\ndownclimb height=2m\nclimb height=2m\npool\nhazard\nnote Notice\nexit", ["S1", "W1", "R1", "D1", "C1", "P1", "H1", "N1", "E1"]],
  ["start ID reserved by another type", "start\nwalk S1", ["S2", "S1"]],
  ["exit ID reserved by another type", "walk E1\nexit", ["E1", "E2"]],
  ["note ID reserved by another type", "note Notice\nwalk N1", ["N2", "N1"]],
  ["hazard ID reserved by progression", "hazard\nwalk H1", ["H2", "H1"]],
  ["prototype-like identifiers", "walk __proto__\npool constructor\nhazard toString\nwalk", ["__proto__", "constructor", "toString", "W2"]],
  ["empty route", "", []]
];

for (const [name, body, expected] of ALLOCATIONS) {
  test(`${name}: normalized identifiers match the documented allocation`, /**
   * Verify ${name}: normalized identifiers match the documented allocation; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(ids(compileRoute(route(body)).model), expected);
  });
}

const INVALID_IDS = [
  ["same type", "walk shared\nwalk shared"],
  ["different types", "walk shared\nhazard shared"],
  ["quoted and bare spellings", 'pool shared\nwalk "shared"'],
  ["decoded fragments", 'walk "A B"\nwalk A B'],
  ["decoded escapes", 'walk "A\\\\B"\nwalk A\\B'],
  ["three occurrences", "walk same\npool same\nhazard same"],
  ["empty quoted ID", 'walk ""'],
  ["space-only ID", 'pool "   "'],
  ["tab-only ID", 'hazard "\t"'],
  ["Unicode whitespace-only ID", 'walk "\u00a0\u2003"'],
  ["duplicate prototype-looking ID", "walk __proto__\npool __proto__"],
  ["duplicate Unicode ID", 'walk "Cañón 🧗"\nhazard "Cañón 🧗"']
];

for (const [name, body] of INVALID_IDS) {
  test(`${name}: compilation reports validation failure with no derived outputs`, /**
   * Verify ${name}: compilation reports validation failure with no derived outputs; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(route(body));
    assert.deepEqual({ ok: result.ok, errors: result.diagnostics.every(/**
     * Evaluate the selection condition diagnostic.kind === "validation" && diagnostic.severity === "error".
     * @responsibility computation
     * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
     * @returns {unknown} The result of the documented comparison or calculation.
     */ (diagnostic) => diagnostic.kind === "validation" && diagnostic.severity === "error") && result.diagnostics.length > 0, output: [result.model, result.layout, result.json] }, { ok: false, errors: true, output: [null, null, null] });
  });

  test(`${name}: direct route normalization rejects invalid identifiers`, /**
   * Verify ${name}: direct route normalization rejects invalid identifiers; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const { ast } = parseVrl(route(body));
    assert.throws(/**
     * Exercise normalizeRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by normalizeRoute.
     */ () => normalizeRoute(ast), { name: "RangeError", message: /element identifier/ });
  });
}

test("duplicate diagnostics report both identifier spans", /**
 * Verify duplicate diagnostics report both identifier spans; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Survey"\r\n  walk shared\r\n\thazard shared');
  assert.deepEqual(result.diagnostics, [{
    code: "VRL_IDENTIFIER_DUPLICATE", span: span(3, 9, 15),
    kind: "validation", severity: "error", message: 'Duplicate element identifier "shared".',
    location: { line: 3, column: 9 },
    suggestion: "Choose a non-blank identifier unique within this route, or omit it for automatic numbering.",
    relatedLocations: [{ message: "First declaration of this identifier", location: { line: 2, column: 8 }, span: span(2, 8, 14) }]
  }]);
});

test("every repeated identifier points back to its first declaration", /**
 * Verify every repeated identifier points back to its first declaration; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(route("walk same\npool same\nhazard same"));
  assert.deepEqual(result.diagnostics.map(/**
   * Project the current entry into an ordered tuple for result.diagnostics.map.
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {Array} The ordered records or values assembled above.
   */ (diagnostic) => [diagnostic.location.line, diagnostic.relatedLocations[0].location.line]), [[3, 2], [4, 2]]);
});

test("readable duplicate diagnostics include both locations", /**
 * Verify readable duplicate diagnostics include both locations; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const [diagnostic] = compileRoute(route("walk shared\npool shared")).diagnostics;
  assert.equal(formatDiagnostic(diagnostic), 'ERROR validation at 3:6: Duplicate element identifier "shared". Suggestion: Choose a non-blank identifier unique within this route, or omit it for automatic numbering. Related: First declaration of this identifier at 2:6.');
});

test("blank identifiers have one error each without a false duplicate location", /**
 * Verify blank identifiers have one error each without a false duplicate location; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(route('walk ""\nwalk ""'));
  assert.deepEqual(result.diagnostics.map(/**
   * Project the current entry into an ordered tuple for result.diagnostics.map.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string} input1.message - Human-readable diagnostic or process message.
   * @param {Array} input1.relatedLocations - Ordered related diagnostic source references.
   * @returns {Array} The ordered records or values assembled above.
   */ ({ message, relatedLocations }) => [message, relatedLocations]), [["An explicit element identifier must be a non-blank string.", undefined], ["An explicit element identifier must be a non-blank string.", undefined]]);
});

test("identifier and attribute errors are reported together", /**
 * Verify identifier and attribute errors are reported together; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(route('walk shared\nrappel shared height=-1m'));
  assert.deepEqual(result.diagnostics.map(/**
   * Project diagnostic.message from the current record.
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {unknown} The diagnostic.message value selected or validated above.
   */ (diagnostic) => diagnostic.message), ['Duplicate element identifier "shared".', 'Field "height" must be greater than 0m.', 'Rappel requires "rope".']);
});

test("duplicate IDs are semantic errors and remain visible in the recovery AST", /**
 * Verify duplicate IDs are semantic errors and remain visible in the recovery AST; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl(route("walk shared\npool shared"));
  assert.deepEqual([result.diagnostics, ids(result.ast)], [[], ["shared", "shared"]]);
});

for (const id of ["", " \t ", 0, 42, false, {}, []]) {
  test(`programmatic invalid ID ${JSON.stringify(id)} is rejected by element validation`, /**
   * Verify programmatic invalid ID ${JSON.stringify(id)} is rejected by element validation; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(validateElement(element(id))[0].message, "An explicit element identifier must be a non-blank string.");
  });

  test(`programmatic invalid ID ${JSON.stringify(id)} is rejected by standalone normalization`, /**
   * Verify programmatic invalid ID ${JSON.stringify(id)} is rejected by standalone normalization; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise normalizeElement so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by normalizeElement.
     */ () => normalizeElement(element(id), {}), { name: "RangeError", message: "An explicit element identifier must be a non-blank string." });
  });
}

test("absent programmatic IDs generate normally, including an omitted property", /**
 * Verify absent programmatic IDs generate normally, including an omitted property; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ast } = parseVrl(route("walk\nwalk\nwalk"));
  ast.elements[1].id = undefined;
  delete ast.elements[2].id;
  assert.deepEqual(ids(normalizeRoute(ast)), ["W1", "W2", "W3"]);
});

test("programmatic IDs on boundaries and notes use the same namespace", /**
 * Verify programmatic IDs on boundaries and notes use the same namespace; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const ast = { name: "A", metadata: {}, elements: [element("shared", "start"), element("shared", "note", 3), element("shared", "exit", 4)] };
  assert.deepEqual(validateRoute(ast).map(/**
   * Project diagnostic.location.line from the current record.
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {unknown} The diagnostic.location.line value selected or validated above.
   */ (diagnostic) => diagnostic.location.line), [3, 4]);
});

test("programmatic explicit note IDs reserve names before generation", /**
 * Verify programmatic explicit note IDs reserve names before generation; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const ast = { name: "A", metadata: {}, elements: [element(null), element("W1", "note")] };
  assert.deepEqual(ids(normalizeRoute(ast)), ["W2", "W1"]);
});

test("standalone normalization preserves the existing caller-owned counter contract", /**
 * Verify standalone normalization preserves the existing caller-owned counter contract; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const counters = { walk: 3 };
  const first = normalizeElement(element("survey"), counters);
  const second = normalizeElement(element(null), counters);
  assert.deepEqual([first.id, second.id, counters], ["survey", "W5", { walk: 5 }]);
});

test("invalid standalone IDs do not consume a caller-owned counter", /**
 * Verify invalid standalone IDs do not consume a caller-owned counter; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const counters = { walk: 3 };
  try { normalizeElement(element(""), counters); } catch { /* inspect the counter after rejection */ }
  assert.deepEqual(counters, { walk: 3 });
});

test("standalone normalization still normalizes attributes", /**
 * Verify standalone normalization still normalizes attributes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const input = createRouteElement("walk", { distance: "12m" }, { line: 2, column: 1 });
  assert.deepEqual(normalizeElement(input, {}).attributes.distance, { value: 12, unit: "m", meters: 12 });
});

test("normalization does not change the AST", /**
 * Verify normalization does not change the AST; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ast } = parseVrl(route("walk\nwalk W1"));
  const before = structuredClone(ast);
  normalizeRoute(ast);
  assert.deepEqual(ast, before);
});

test("frozen source data can be normalized without mutation", /**
 * Verify frozen source data can be normalized without mutation; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ast } = parseVrl(route("walk\npool W1"));
  for (const item of ast.elements) { Object.freeze(item.attributes); Object.freeze(item); }
  Object.freeze(ast.metadata);
  Object.freeze(ast.elements);
  Object.freeze(ast);
  assert.deepEqual(ids(normalizeRoute(ast)), ["W2", "W1"]);
});

test("identifier allocation exposes only the documented normalized fields", /**
 * Verify identifier allocation exposes only the documented normalized fields; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = compileRoute(route("walk\npool W1")).model;
  assert.deepEqual([Object.keys(model), Object.keys(model.elements[0])], [["name", "metadata", "extensions", "elements", "traversal", "summary"], ["type", "id", "label", "attributes", "extensions", "sourceLocation"]]);
});

test("recompiling identical source produces identical complete output", /**
 * Verify recompiling identical source produces identical complete output; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const source = route("walk\nrappel R2 height=5m rope=5m\nrappel height=5m rope=5m\nhazard W1");
  assert.deepEqual(compileRoute(source), compileRoute(source));
});

test("separate routes do not share identifier reservations or counters", /**
 * Verify separate routes do not share identifier reservations or counters; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  compileRoute(route("walk W1\nwalk W2\npool P1"));
  assert.deepEqual(ids(compileRoute(route("walk\npool")).model), ["W1", "P1"]);
});

test("failed routes cannot poison later allocation", /**
 * Verify failed routes cannot poison later allocation; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  compileRoute(route("walk W1\npool W1"));
  assert.deepEqual(ids(compileRoute(route("walk")).model), ["W1"]);
});

test("model, layout, and serialized JSON share the allocated identities", /**
 * Verify model, layout, and serialized JSON share the allocated identities; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(route("walk\nwalk W1\npool\nhazard P1"));
  assert.deepEqual([ids(result.model), result.layout.nodes.map(/**
   * Project node.id from the current record.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The node.id value selected or validated above.
   */ (node) => node.id), result.layout.nodes.map(/**
   * Project node.element.id from the current record.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The node.element.id value selected or validated above.
   */ (node) => node.element.id), ids(JSON.parse(result.json))], Array.from({ length: 4 }, /**
   * Project the current entry into an ordered tuple for Array.from.
   * @responsibility computation
   * @returns {Array} The ordered records or values assembled above.
   */ () => ["W2", "W1", "P2", "P1"]));
});

test("an inserted unnamed element may renumber later generated IDs", /**
 * Verify an inserted unnamed element may renumber later generated IDs; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const original = compileRoute(route("walk distance=2m")).model;
  const edited = compileRoute(route("walk distance=1m\nwalk distance=2m")).model;
  assert.deepEqual([original.elements[0].id, edited.elements[1].id], ["W1", "W2"]);
});

test("unchanged explicit identities survive reordering and insertion", /**
 * Verify unchanged explicit identities survive reordering and insertion; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const original = compileRoute(route("walk survey-a\nwalk survey-b")).model;
  const edited = compileRoute(route("walk survey-b\nwalk\nwalk survey-a")).model;
  assert.deepEqual([ids(original), ids(edited)], [["survey-a", "survey-b"], ["survey-b", "W2", "survey-a"]]);
});

for (const body of ['walk ""', "walk same\npool same"]) {
  test(`invalid identity ${body} stops all downstream compiler ports`, /**
   * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
   * blocking validation to prevent this call.
   * @responsibility computation
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compiler = createRouteCompiler(Object.fromEntries(["normalize", "validateGeometry", "layout", "exportJson"].map(/**
     * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
     * blocking validation to prevent this call.
     * @responsibility computation
     * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @returns {Array} The ordered records or values assembled above.
     */ (name) => [name, /**
      * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
      * blocking validation to prevent this call.
      * @responsibility computation
      * @returns {void} Completes the documented operation; no return value is consumed.
      * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
      */ () => { calls.push(name); throw new Error("Unexpected downstream call"); }])));
    compiler(route(body));
    assert.deepEqual(calls, []);
  });
}

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name} exposes identifier conflicts and produces no diagram`, /**
   * Verify ${name} exposes identifier conflicts and produces no diagram; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(route("walk shared\nhazard shared"));
    assert.deepEqual([state.ok, state.svg, state.model, state.diagnostics[0].relatedLocations, state.diagnosticsText.includes("First declaration of this identifier at 2:6")], [false, "", null, [{ message: "First declaration of this identifier", location: { line: 2, column: 6 }, span: span(2, 6, 12) }], true]);
  });
}

test("dense forward reservations produce unique IDs without mutating explicit IDs", /**
 * Verify dense forward reservations produce unique IDs without mutating explicit IDs; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const reserved = Array.from({ length: 2000 }, /**
   * Apply element to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by element.
   */ (_, index) => element(`W${index + 1}`, "pool"));
  const unnamed = Array.from({ length: 2000 }, /**
   * Apply element to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @returns {unknown} The result returned by element.
   */ () => element(null));
  const model = normalizeRoute({ name: "Dense survey", metadata: {}, elements: [...unnamed, ...reserved] });
  assert.deepEqual(ids(model), [...Array.from({ length: 2000 }, /**
   * Format the current entry as the text required by Array.from, preserving supplied values.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ (_, index) => `W${index + 2001}`), ...reserved.map(/**
   * Project item.id from the current record.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The item.id value selected or validated above.
   */ (item) => item.id)]);
});

/**
 * Construct a reviewed end-exclusive span for identifier diagnostic expectations.
 * @responsibility computation
 * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
 * @param {unknown} start - Inclusive zero-based source offset, or starting coordinate as specified by this helper.
 * @param {unknown} end - Exclusive source offset, or ending coordinate as specified by this helper.
 * @returns {Object} A record containing start, end.
 */
function span(line, start, end) {
  return { start: { line, column: start }, end: { line, column: end } };
}
