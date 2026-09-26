import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/vrl-core";
import { renderTopoSvg, formatElementDetail, isSnakeHazard } from "@subvertic/vrl-render-svg";

/**
 * Project value, unit, meters into the record required by metric.
 * @responsibility computation
 * @param {number} meters - Numeric metric value in meters.
 * @returns {Object} A record containing value, unit, meters.
 */
const metric = (meters) => ({ value: meters, unit: "m", meters });
const SOURCE = 'route "Survey"\nmetadata entrance_elevation=10m exit_elevation=6m region="Costa Rica" survey_team="A"\nstart "Entry"\nwalk distance=3m note="Approach"\nhazard type=snake severity=high note="Look carefully"\nnote "height=unknown"\nrappel drop height=5m rope=10m stages=2m+3m redirections=2m:left shape=direct survey_id="old 1"\nclimb rise height=2m inclination=50% exposure=low\nexit "End"';

/**
 * Build a minimal raw route AST with one element and caller-selected raw attributes for normalization
 * boundary tests.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward; defaults to {}.
 * @param {unknown} type - Declared element or record discriminator; defaults to "walk".
 * @returns {Object} A record containing name, metadata, elements.
 */
function ast(attributes = {}, type = "walk") {
  return { name: "Input", metadata: {}, elements: [{ type, id: null, label: null, attributes, sourceLocation: { line: 2, column: 1 } }] };
}

/**
 * Recursively freeze the caller's test input so accidental production mutation becomes observable.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The result returned by Object.freeze.
 */
function deepFreeze(value) {
  if (value !== null && typeof value === "object") Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

test("normalization keeps raw syntax and classified route metadata distinct", /**
 * Verify normalization keeps raw syntax and classified route metadata distinct; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const parsed = core.parseVrl(SOURCE).ast;
  const model = core.normalizeRoute(parsed);
  assert.deepEqual([parsed.metadata, model.metadata, model.extensions, Object.hasOwn(model, "source"), Object.hasOwn(model, "sourceMap")], [{ entrance_elevation: "10m", exit_elevation: "6m", region: "Costa Rica", survey_team: "A" }, { entrance_elevation: metric(10), exit_elevation: metric(6) }, { region: "Costa Rica", survey_team: "A" }, false, false]);
});

test("known technical values retain their types independently of extension text", /**
 * Verify known technical values retain their types independently of extension text; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const element = core.normalizeRoute(core.parseVrl(SOURCE).ast).elements[4];
  assert.deepEqual([element.id, element.attributes, element.extensions], ["drop", { height: metric(5), rope: metric(10), stages: [metric(2), metric(3)], redirections: [{ distance: metric(2), side: "left" }], shape: "direct" }, { survey_id: "old 1" }]);
});

test("normalization conserves annotation order, text, and technical ownership", /**
 * Verify normalization conserves annotation order, text, and technical ownership; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = core.normalizeRoute(core.parseVrl(SOURCE).ast);
  assert.deepEqual([model.elements.map(/**
   * Project the current entry into an ordered tuple for model.elements.map.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.type - Declared element or record discriminator.
   * @param {unknown} input1.id - Explicit or already allocated route element identifier.
   * @returns {Array} The ordered records or values assembled above.
   */ ({ type, id }) => [type, id]), model.elements[2].extensions, model.elements[3].extensions, model.traversal.annotations, model.traversal.segments.filter(/**
    * Evaluate the selection condition kind === "technical".
    * @responsibility computation
    * @param {Object} input1 - Input record destructured into the separately documented members below.
    * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
    * @returns {boolean} The result of the documented comparison or calculation.
    */ ({ kind }) => kind === "technical").map(/**
    * Project the current entry into an ordered tuple for model.traversal.segments.filter(({ kind }) => kind ===
    * "technical").map.
    * @responsibility computation
    * @param {Object} input1 - Input record destructured into the separately documented members below.
    * @param {unknown} input1.elementIndex - Zero-based source element index.
    * @param {unknown} input1.direction - Signed drawing direction or canonical up/down direction selected by the caller.
    * @param {unknown} input1.verticalDeltaMeters - Signed physical technical elevation change in meters.
    * @returns {Array} The ordered records or values assembled above.
    */ ({ elementIndex, direction, verticalDeltaMeters }) => [elementIndex, direction, verticalDeltaMeters])], [[ ["start", "S1"], ["walk", "W1"], ["hazard", "H1"], ["note", "N1"], ["rappel", "drop"], ["climb", "rise"], ["exit", "E1"] ], { type: "snake", note: "Look carefully" }, { text: "height=unknown" }, [{ elementIndex: 2, pointIndex: 1 }, { elementIndex: 3, pointIndex: 1 }], [[4, "down", -5], [5, "up", 1]]]);
});

test("drawing shape does not change the domain traversal", /**
 * Verify drawing shape does not change the domain traversal; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.compileRoute(SOURCE.replace("shape=direct", "shape=ladder")).model.traversal, core.compileRoute(SOURCE).model.traversal);
});

test("validated known fields and extensions survive model-to-JSON round trips", /**
 * Verify validated known fields and extensions survive model-to-JSON round trips; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute(SOURCE);
  assert.deepEqual(JSON.parse(result.json), result.model);
});

test("summaries use validated physical values and ignore similarly named extensions", /**
 * Verify summaries use validated physical values and ignore similarly named extensions; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = core.compileRoute(SOURCE.replace('survey_team="A"', 'survey_team="A" requiredRopeMeters=9999')).model;
  assert.deepEqual(model.summary, { numberOfRappels: 1, numberOfHazards: 1, highestRappelMeters: 5, requiredRopeMeters: 10, totalDistanceMeters: 3, entranceElevationMeters: 10, exitElevationMeters: 6, totalElevationChangeMeters: 4 });
});

for (const type of ["start", "exit", "walk", "rappel", "downclimb", "climb", "pool", "hazard", "note"]) {
  test(`${type} separates extension keys without losing own-property names`, /**
   * Verify ${type} separates extension keys without losing own-property names; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const attributes = Object.fromEntries([["__proto__", "A"], ["constructor", "B"], ["toString", "C"], ["distance", "2m"]]);
    if (type === "rappel" || type === "climb") attributes.height = "3m";
    if (type === "rappel") attributes.rope = "5m";
    const element = core.normalizeElement(ast(attributes, type).elements[0], {});
    assert.deepEqual([Object.keys(element.extensions), Object.keys(element.attributes).filter(/**
     * Evaluate the selection condition ["__proto__", "constructor", "toString"].includes(name).
     * @responsibility computation
     * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @returns {boolean} The result returned by ["__proto__", "constructor", "toString"].includes.
     */ (name) => ["__proto__", "constructor", "toString"].includes(name)), element.extensions.__proto__, element.attributes.distance], [["__proto__", "constructor", "toString"], [], "A", metric(2)]);
  });
}

for (const [type, field] of [["walk", "shape"], ["hazard", "type"], ["note", "exposure"], ["pool", "anchor"]]) {
  test(`out-of-scope ${field} on ${type} is never promoted to a validated field`, /**
   * Verify out-of-scope ${field} on ${type} is never promoted to a validated field; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const element = core.normalizeElement(ast({ [field]: "custom" }, type).elements[0], {});
    assert.deepEqual([element.attributes, element.extensions], [{}, { [field]: "custom" }]);
  });
}

for (const body of [
  'metadata height=-1m', 'metadata entrance_elevation=far', 'metadata anchor_count=0',
  'walk distance=0m', 'walk distance=NaNm', 'walk distance=1000000001m', 'walk distance=0.0000001m',
  'rappel height=5m', 'rappel rope=10m', 'rappel height="" rope=10m', 'climb',
  'rappel height=5m rope=10m stages=0m+5m', 'rappel height=5m rope=10m stages=2m++3m',
  'rappel height=5m rope=10m redirections=0m:left', 'rappel height=5m rope=10m redirections=2m:moon',
  'rappel height=5m rope=10m redirection=5m:left', 'walk height=3m redirections=4m',
  'rappel height=5m rope=10m shape=custom', 'rappel height=5m rope=10m anchor=custom',
  'climb height=1m exposure=wild', 'pool type=custom', 'hazard severity=custom',
  'walk flow=custom', 'walk inclination=0%', 'walk inclination=101%', 'walk anchor_count=9007199254740992'
]) {
  test(`direct normalization rejects invalid known fields: ${body}`, /**
   * Verify direct normalization rejects invalid known fields: ${body}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.normalizeRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.normalizeRoute.
     */ () => core.normalizeRoute(core.parseVrl(`route Input\n${body}`).ast), RangeError);
  });
}

for (const attrs of [{ distance: "-1m" }, { stages: "1m++2m" }, { height: "1m", redirections: "1m:left" }]) {
  test(`standalone normalization rejects invalid fields without advancing counters: ${JSON.stringify(attrs)}`, /**
   * Verify standalone normalization rejects invalid fields without advancing counters: ${JSON.stringify(attrs)};
   * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
   * test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const counters = { walk: 4 };
    let failure;
    try { core.normalizeElement(ast(attrs).elements[0], counters); } catch (error) { failure = error; }
    assert.deepEqual([failure instanceof RangeError, counters], [true, { walk: 4 }]);
  });
}

for (const [label, input] of [
  ["null route", null], ["array route", []], ["date route", new Date(0)],
  ["null metadata", { ...ast(), metadata: null }], ["numeric metadata", { ...ast(), metadata: { region: 3 } }],
  ["object extension", ast({ extension: {} })], ["normalized metric", ast({ distance: metric(1) })],
  ["missing elements", { ...ast(), elements: undefined }], ["sparse elements", { ...ast(), elements: Array(1) }],
  ["unknown element", ast({}, "teleport")], ["non-string element type", ast({}, 1)],
  ["numeric label", { ...ast(), elements: [{ ...ast().elements[0], label: 42 }] }],
  ["missing attributes", { ...ast(), elements: [{ type: "walk" }] }],
  ...[null, {}, { line: 0, column: 1 }, { line: 1.5, column: 1 }, { line: 1, column: 0 }, { line: 1, column: Infinity }].map(/**
   * Project the current entry into an ordered tuple for [null, {}, { line: 0, column: 1 }, { line: 1.5, column:
   * 1 }, { line: 1, column: 0 }, { line: 1, column: Infinity }].map.
   * @responsibility computation
   * @param {unknown} sourceLocation - Optional one-based source position retained from parsing.
   * @returns {Array} The ordered records or values assembled above.
   */ (sourceLocation) => [`location ${JSON.stringify(sourceLocation)}`, { ...ast(), elements: [{ ...ast().elements[0], sourceLocation }] }])
]) {
  test(`normalization rejects malformed raw input: ${label}`, /**
   * Verify normalization rejects malformed raw input: ${label}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.normalizeRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.normalizeRoute.
     */ () => core.normalizeRoute(input), TypeError);
  });
}

for (const name of [undefined, null, "", 42]) {
  test(`normalization requires a nonempty string name: ${JSON.stringify(name)}`, /**
   * Verify normalization requires a nonempty string name: ${JSON.stringify(name)}; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.normalizeRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.normalizeRoute.
     */ () => core.normalizeRoute({ ...ast(), name }), RangeError);
  });
  test(`semantic validation uses the same route-name invariant: ${JSON.stringify(name)}`, /**
   * Verify semantic validation uses the same route-name invariant: ${JSON.stringify(name)}; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.validateRoute({ ...ast(), name })[0].code, "VRL_ROUTE_NAME_REQUIRED");
  });
}

test("raw records with null prototypes remain valid inputs", /**
 * Verify raw records with null prototypes remain valid inputs; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const input = Object.assign(Object.create(null), { ...ast(), metadata: Object.create(null) });
  assert.equal(core.normalizeRoute(input).elements[0].id, "W1");
});

test("optional label and source point remain optional for programmatic elements", /**
 * Verify optional label and source point remain optional for programmatic elements; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const element = { type: "walk", attributes: {} };
  assert.deepEqual(core.normalizeElement(element), { type: "walk", id: "W1", label: null, attributes: {}, extensions: {}, sourceLocation: undefined });
});

test("syntax-only extra properties cannot leak into normalized elements", /**
 * Verify syntax-only extra properties cannot leak into normalized elements; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const input = ast();
  input.elements[0].raw = "walk";
  input.elements[0].sourceMap = { offset: 1 };
  input.elements[0].sourceLocation.extra = {};
  assert.deepEqual(core.normalizeRoute(input).elements[0], { type: "walk", id: "W1", label: null, attributes: {}, extensions: {}, sourceLocation: { line: 2, column: 1 } });
});

test("normalization accepts frozen input without mutating syntax or provenance", /**
 * Verify normalization accepts frozen input without mutating syntax or provenance; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const input = core.parseVrl(SOURCE).ast;
  const before = structuredClone(input);
  core.normalizeRoute(deepFreeze(input));
  assert.deepEqual(input, before);
});

test("normalized value mutations cannot change the source or a subsequent result", /**
 * Verify normalized value mutations cannot change the source or a subsequent result; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const input = core.parseVrl(SOURCE).ast;
  const before = structuredClone(input);
  const expected = core.normalizeRoute(input);
  const result = core.normalizeRoute(input);
  result.elements[4].attributes.stages[0].meters = 900;
  result.elements[4].attributes.redirections[0].side = "right";
  result.elements[4].extensions.survey_id = "changed";
  result.elements[4].sourceLocation.line = 99;
  result.extensions.region = "changed";
  assert.deepEqual([input, core.normalizeRoute(input)], [before, expected]);
});

test("failed normalization leaves input records untouched", /**
 * Verify failed normalization leaves input records untouched; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const input = ast({ height: "3m", rope: "4m", redirections: "3m" }, "rappel");
  const before = structuredClone(input);
  try { core.normalizeRoute(input); } catch { /* Inspect caller-owned input after rejection. */ }
  assert.deepEqual(input, before);
});

test("nonblocking rope and exact stage warnings still permit normalization", /**
 * Verify nonblocking rope and exact stage warnings still permit normalization; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const source = 'route Warnings\nrappel height=4m rope=2m stages=1m+2m';
  const result = core.compileRoute(source);
  assert.deepEqual([core.normalizeRoute(result.ast), result.diagnostics.map(/**
   * Return the selected severity binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string} input1.severity - Diagnostic severity, error or warning.
   * @returns {unknown} The severity value selected or validated above.
   */ ({ severity }) => severity)], [result.model, ["warning", "warning"]]);
});

test("optional unmeasured downclimbs remain explicitly undetermined in the traversal", /**
 * Verify optional unmeasured downclimbs remain explicitly undetermined in the traversal; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeRoute(core.parseVrl('route X\ndownclimb').ast).traversal.segments[0].verticalDeltaMeters, null);
});

test("legacy loose token conversion is distinct from invariant-bearing normalization", /**
 * Verify legacy loose token conversion is distinct from invariant-bearing normalization; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.normalizeAttributes({ height: "-1m", note: "free text" }), { height: metric(-1), note: "free text" });
});

test("extension text cannot bypass normal known-field validation", /**
 * Verify extension text cannot bypass normal known-field validation; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compile = core.createRouteCompiler({ /**
   * Supply the validate test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Array} The ordered records or values assembled above.
   */ validate: () => [] });
  assert.throws(/**
   * Exercise compile so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by compile.
   */ () => compile('route X\nrappel height=-1m rope=5m'), RangeError);
});

test("rendered notes, hazard symbols, and metadata retain separated descriptions", /**
 * Verify rendered notes, hazard symbols, and metadata retain separated descriptions; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute(SOURCE);
  const svg = renderTopoSvg(result.model, result.layout);
  assert.deepEqual([formatElementDetail(result.model.elements[3]), isSnakeHazard(result.model.elements[2]), svg.includes("Costa Rica"), svg.includes("Look carefully")], ["height=unknown", true, true, true]);
});
