import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/vrl-core";
import { compileRouteWithPorts } from "../packages/vrl-core/src/application/compile-route.js";

const NAMES = ["parse", "validate", "normalize", "validateGeometry", "layout", "exportJson"];
const SOURCE = '{"name":"Alternate syntax"}';
const NOTICE = { kind: "custom", severity: "warning", message: "Advisory", location: { line: 1, column: 1 } };
const ERROR = { ...NOTICE, severity: "error", message: "Rejected" };

/**
 * Build alternate-shape synchronous compiler ports and a local call log, then apply the scenario's requested
 * overrides.
 * @responsibility computation
 * @param {unknown} overrides - Caller-supplied values replacing the corresponding defaults; defaults to {}.
 * @returns {Object} A record containing ports, calls, ast, model, layout.
 */
function fixture(overrides = {}) {
  const calls = [];
  const ast = { name: "Alternate syntax", metadata: {}, elements: [], sourceMap: { route: null, metadata: [], elements: [] } };
  const model = { title: "Alternate syntax", count: 0 };
  const layout = { rows: ["Alternate syntax"] };
  const implementations = {
    /**
     * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
     * @returns {Object} A record containing ast, diagnostics.
     */
    parse: (source) => ({ ast: { ...ast, name: JSON.parse(source).name }, diagnostics: [] }),
    /**
     * Supply the validate test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Array} The ordered records or values assembled above.
     */
    validate: () => [],
    /**
     * Supply the normalize test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {unknown} parsed - Parser result or syntax record supplied by the preceding stage.
     * @returns {Object} A record containing the supplied fields, title.
     */
    normalize: (parsed) => ({ ...model, title: parsed.name }),
    /**
     * Supply the validateGeometry test double; return the scenario's deliberately selected value. No production
     * I/O is performed by this fixture.
     * @responsibility computation
     * @returns {Array} The ordered records or values assembled above.
     */
    validateGeometry: () => [],
    /**
     * Supply the layout test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {unknown} normalized - Normalized record returned by the preceding test port.
     * @returns {Object} A record containing rows.
     */
    layout: (normalized) => ({ rows: [normalized.title] }),
    /**
     * Supply the exportJson test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {unknown} normalized - Normalized record returned by the preceding test port.
     * @returns {string} The result returned by JSON.stringify.
     */
    exportJson: (normalized) => JSON.stringify(normalized),
    ...overrides
  };
  const ports = Object.fromEntries(NAMES.map(/**
   * Record each invoked port and its exact arguments before delegating to the selected fixture implementation.
   * @responsibility coordinator
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Array} The ordered records or values assembled above.
   */ (name) => [name, /**
    * Record each invoked port and its exact arguments before delegating to the selected fixture implementation.
    * @responsibility coordinator
    * @param {unknown} args - Ordered command-line arguments; no shell interpolation is performed by process adapters.
    * @returns {unknown} The result returned by implementations.name.
    */ (...args) => { calls.push({ name, args }); return implementations[name](...args); }]));
  return { ports, calls, ast, model, layout };
}

/**
 * Invoke the supplied operation and return either its result or the exact thrown error object for
 * assertions.
 * @responsibility coordinator
 * @param {unknown} action - Operation invoked by the test harness to observe success or capture failure.
 * @returns {Object} A record containing result. A record containing error.
 */
function capture(action) {
  try { return { result: action() }; } catch (error) { return { error }; }
}

test("alternate adapters compose through the coordinator without concrete defaults", /**
 * Verify alternate adapters compose through the coordinator without concrete defaults; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ports, ast, model, layout } = fixture();
  assert.deepEqual(compileRouteWithPorts(SOURCE, {}, ports), { ok: true, ast, diagnostics: [], model, layout, json: '{"title":"Alternate syntax","count":0}' });
});

test("ports run in order with the preceding results and the correct options", /**
 * Verify ports run in order with the preceding results and the correct options; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ports, calls } = fixture();
  const options = { limits: { maxSourceBytes: 100 }, layout: { customSpacing: 7 } };
  const result = core.createRouteCompiler(ports)(SOURCE, options);
  assert.deepEqual({ order: calls.map(/**
   * Return the selected name binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {unknown} The name value selected or validated above.
   */ ({ name }) => name), source: calls[0].args[0], limit: calls[0].args[1].limits.maxSourceBytes, frozenLimits: Object.isFrozen(calls[0].args[1].limits), sameInputs: [calls[1].args[0] === result.ast, calls[2].args[0] === result.ast, calls[3].args[0] === result.model, calls[3].args[1] === result.ast.sourceMap, calls[4].args[0] === result.model, calls[4].args[1] === options.layout, calls[5].args[0] === result.model] }, { order: NAMES, source: SOURCE, limit: 100, frozenLimits: true, sameInputs: Array(7).fill(true) });
});

test("warnings from each stage preserve order and adapter-owned arrays", /**
 * Verify warnings from each stage preserve order and adapter-owned arrays; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const syntax = [{ ...NOTICE, message: "parse" }];
  const semantic = [{ ...NOTICE, message: "validate" }];
  const geometry = [{ ...NOTICE, message: "geometry" }];
  const { ports, ast } = fixture();
  const compile = core.createRouteCompiler({ ...ports, /**
   * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing ast, diagnostics.
   */ parse: () => ({ ast, diagnostics: syntax }), /**
    * Supply the validate test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @returns {unknown} The semantic value selected or validated above.
    */ validate: () => semantic, /**
    * Supply the validateGeometry test double; return the scenario's deliberately selected value. No production
    * I/O is performed by this fixture.
    * @responsibility computation
    * @returns {unknown} The geometry value selected or validated above.
    */ validateGeometry: () => geometry });
  const result = compile(SOURCE);
  assert.deepEqual([result.ok, result.diagnostics.map(/**
   * Return the selected message binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string} input1.message - Human-readable diagnostic or process message.
   * @returns {unknown} The message value selected or validated above.
   */ ({ message }) => message), syntax, semantic, geometry], [true, ["parse", "validate", "geometry"], [{ ...NOTICE, message: "parse" }], [{ ...NOTICE, message: "validate" }], [{ ...NOTICE, message: "geometry" }]]);
});

for (const [stage, expectedCalls] of [["parse", ["parse", "validate"]], ["validate", ["parse", "validate"]], ["validateGeometry", ["parse", "validate", "normalize", "validateGeometry"]]]) {
  test(`blocking ${stage} diagnostics suppress all subsequent output stages`, /**
   * Verify blocking ${stage} diagnostics suppress all subsequent output stages; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const { ast } = fixture();
    const { ports, calls } = fixture({ /**
     * Return a blocking diagnostic in the exact result shape owned by the selected parser or validator stage.
     * @responsibility computation
     * @returns {unknown} The selected result, including the documented absent-value fallback.
     */ [stage]: () => stage === "parse" ? { ast, diagnostics: [ERROR] } : [ERROR] });
    const result = core.createRouteCompiler(ports)(SOURCE);
    assert.deepEqual([result.ok, result.diagnostics, result.model, result.layout, result.json, calls.map(/**
     * Return the selected name binding unchanged.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @returns {unknown} The name value selected or validated above.
     */ ({ name }) => name)], [false, [ERROR], null, null, null, expectedCalls]);
  });
}

test("blocking parser budgets suppress even semantic validation", /**
 * Verify blocking parser budgets suppress even semantic validation; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ast } = fixture();
  const { ports, calls } = fixture({ /**
   * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing ast, diagnostics.
   */ parse: () => ({ ast, diagnostics: [{ ...ERROR, kind: "limit" }] }) });
  const result = core.createRouteCompiler(ports)(SOURCE);
  assert.deepEqual([result.ok, calls.map(/**
   * Return the selected name binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {unknown} The name value selected or validated above.
   */ ({ name }) => name)], [false, ["parse"]]);
});

test("source preflight rejects excess input before any alternate adapter runs", /**
 * Verify source preflight rejects excess input before any alternate adapter runs; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ports, calls } = fixture();
  const result = core.createRouteCompiler(ports)(SOURCE, { limits: { maxSourceBytes: 1 } });
  assert.deepEqual([result.ok, result.diagnostics[0].code, calls], [false, "VRL_LIMIT_MAX_SOURCE_BYTES", []]);
});

for (const port of NAMES) {
  test(`${port} exceptions propagate by identity and stop later calls`, /**
   * Verify ${port} exceptions propagate by identity and stop later calls; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const failure = new Error("Adapter failed");
    const { ports, calls } = fixture({ /**
     * Prepare port. Deliberate or propagated failures remain visible to the caller.
     * @responsibility computation
     * @returns {never} Does not return normally; throws the failure being checked.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */ [port]: () => { throw failure; } });
    const outcome = capture(/**
     * Apply core.createRouteCompiler(ports) to the supplied arguments; retain the callee's return and failure
     * behavior.
     * @responsibility computation
     * @returns {unknown} The result returned by core.createRouteCompiler(ports).
     */ () => core.createRouteCompiler(ports)(SOURCE));
    assert.deepEqual([outcome.error === failure, calls.map(/**
     * Return the selected name binding unchanged.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @returns {unknown} The name value selected or validated above.
     */ ({ name }) => name)], [true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
  });
  test(`${port} rejects asynchronous results before the next port`, /**
   * Verify ${port} rejects asynchronous results before the next port; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const { ports, calls } = fixture({ /**
     * Apply Promise.resolve to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @returns {unknown} The result returned by Promise.resolve.
     */ [port]: () => Promise.resolve({}) });
    const outcome = capture(/**
     * Apply core.createRouteCompiler(ports) to the supplied arguments; retain the callee's return and failure
     * behavior.
     * @responsibility computation
     * @returns {unknown} The result returned by core.createRouteCompiler(ports).
     */ () => core.createRouteCompiler(ports)(SOURCE));
    assert.deepEqual([outcome.error instanceof TypeError, outcome.error.message.includes(port), calls.map(/**
     * Return the selected name binding unchanged.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @returns {unknown} The name value selected or validated above.
     */ ({ name }) => name)], [true, true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
  });
  test(`${port} must be a function when configuring a compiler`, /**
   * Verify ${port} must be a function when configuring a compiler; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.createRouteCompiler so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.createRouteCompiler.
     */ () => core.createRouteCompiler({ [port]: 123 }), { name: "TypeError", message: `Compiler port "${port}" must be a function.` });
  });
}

for (const [name, value] of [["null", null], ["number", 1], ["array", []], ["date", new Date(0)], ["thenable", { /**
 * Expose a thenable-shaped test object without scheduling work so synchronous record guards must reject it.
 * @responsibility computation
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ then() {} }]]) {
  test(`compiler configuration rejects ${name}`, /**
   * Verify compiler configuration rejects ${name}; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.createRouteCompiler so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.createRouteCompiler.
     */ () => core.createRouteCompiler(value), TypeError);
  });
  for (const port of ["parse", "normalize", "layout"]) {
    test(`${port} rejects a ${name} record result without running later stages`, /**
     * Verify ${port} rejects a ${name} record result without running later stages; arrange the scenario and make
     * its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const { ports, calls } = fixture({ /**
       * Return the selected value binding unchanged.
       * @responsibility computation
       * @returns {unknown} The value value selected or validated above.
       */ [port]: () => value });
      const outcome = capture(/**
       * Apply core.createRouteCompiler(ports) to the supplied arguments; retain the callee's return and failure
       * behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by core.createRouteCompiler(ports).
       */ () => core.createRouteCompiler(ports)(SOURCE));
      assert.deepEqual([outcome.error instanceof TypeError, outcome.error.message.includes(port), calls.map(/**
       * Return the selected name binding unchanged.
       * @responsibility computation
       * @param {Object} input1 - Input record destructured into the separately documented members below.
       * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
       * @returns {unknown} The name value selected or validated above.
       */ ({ name }) => name)], [true, true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
    });
  }
}

for (const [name, parsed] of [
  ["missing AST", { diagnostics: [] }],
  ["missing metadata", { ast: { elements: [] }, diagnostics: [] }],
  ["non-array elements", { ast: { metadata: {}, elements: {} }, diagnostics: [] }],
  ["sparse elements", { ast: { metadata: {}, elements: Array(1) }, diagnostics: [] }],
  ["missing attributes", { ast: { metadata: {}, elements: [{}] }, diagnostics: [] }],
  ["missing diagnostics", { ast: { metadata: {}, elements: [] } }]
]) {
  test(`parse rejects ${name} before validation`, /**
   * Verify parse rejects ${name} before validation; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const { ports, calls } = fixture({ /**
     * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The parsed value selected or validated above.
     */ parse: () => parsed });
    const outcome = capture(/**
     * Apply core.createRouteCompiler(ports) to the supplied arguments; retain the callee's return and failure
     * behavior.
     * @responsibility computation
     * @returns {unknown} The result returned by core.createRouteCompiler(ports).
     */ () => core.createRouteCompiler(ports)(SOURCE));
    assert.deepEqual([outcome.error instanceof TypeError, calls.map(/**
     * Return the selected name binding unchanged.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @returns {unknown} The name value selected or validated above.
     */ ({ name }) => name)], [true, ["parse"]]);
  });
}

for (const [name, diagnostics] of [
  ["record", {}], ["null", null], ["thenable array", Object.assign([], { /**
   * Expose a thenable-shaped test object without scheduling work so synchronous record guards must reject it.
   * @responsibility computation
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ then() {} })],
  ["sparse array", Array(1)], ["null item", [null]],
  ["missing kind", [{ ...NOTICE, kind: undefined }]],
  ["missing message", [{ ...NOTICE, message: undefined }]],
  ["unknown severity", [{ ...NOTICE, severity: "fatal" }]],
  ...[undefined, null, 1, {}, { line: 0, column: 1 }, { line: 1.5, column: 1 }, { line: 1, column: 0 }, { line: 1, column: 1.5 }].map(/**
   * Project the current entry into an ordered tuple for [undefined, null, 1, {}, { line: 0, column: 1 }, { line:
   * 1.5, column: 1 }, { line: 1, column: 0 }, { line: 1, column: 1.5 }].map.
   * @responsibility computation
   * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
   * @returns {Array} The ordered records or values assembled above.
   */ (location) => [JSON.stringify(location), [{ ...NOTICE, location }]])
]) {
  for (const port of ["parse", "validate", "validateGeometry"]) {
    test(`${port} rejects malformed diagnostics: ${name}`, /**
     * Verify ${port} rejects malformed diagnostics: ${name}; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const { ast } = fixture();
      const { ports, calls } = fixture({ /**
       * Return malformed diagnostics in the selected port's result shape so the boundary must reject them.
       * @responsibility computation
       * @returns {unknown} The selected result, including the documented absent-value fallback.
       */ [port]: () => port === "parse" ? { ast, diagnostics } : diagnostics });
      const outcome = capture(/**
       * Apply core.createRouteCompiler(ports) to the supplied arguments; retain the callee's return and failure
       * behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by core.createRouteCompiler(ports).
       */ () => core.createRouteCompiler(ports)(SOURCE));
      assert.deepEqual([outcome.error instanceof TypeError, outcome.error.message.includes(port), calls.map(/**
       * Return the selected name binding unchanged.
       * @responsibility computation
       * @param {Object} input1 - Input record destructured into the separately documented members below.
       * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
       * @returns {unknown} The name value selected or validated above.
       */ ({ name }) => name)], [true, true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
    });
  }
}

for (const value of [undefined, null, 123, {}, []]) {
  test(`exportJson rejects non-string ${JSON.stringify(value)}`, /**
   * Verify exportJson rejects non-string ${JSON.stringify(value)}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const { ports } = fixture({ /**
     * Supply the exportJson test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The value value selected or validated above.
     */ exportJson: () => value });
    assert.throws(/**
     * Exercise core.createRouteCompiler(ports) so the enclosing assertion can observe its return value or thrown
     * error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.createRouteCompiler(ports).
     */ () => core.createRouteCompiler(ports)(SOURCE), { name: "TypeError", message: 'Compiler port "exportJson" must return a string synchronously.' });
  });
}

test("null-prototype records are supported at compiler boundaries", /**
 * Verify null-prototype records are supported at compiler boundaries; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const ast = Object.assign(Object.create(null), { metadata: Object.create(null), elements: [] });
  const { ports } = fixture({ /**
   * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing ast, diagnostics.
   */ parse: () => ({ ast, diagnostics: [] }), /**
    * Supply the normalize test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @returns {unknown} The result returned by Object.create.
    */ normalize: () => Object.create(null), /**
    * Supply the layout test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @returns {unknown} The result returned by Object.create.
    */ layout: () => Object.create(null) });
  assert.equal(core.createRouteCompiler(Object.assign(Object.create(null), ports))(SOURCE).json, "{}");
});

test("compiler captures wiring without freezing or mutating caller configuration", /**
 * Verify compiler captures wiring without freezing or mutating caller configuration; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ports } = fixture();
  const before = { ...ports };
  const compile = core.createRouteCompiler(ports);
  const unchanged = NAMES.every(/**
   * Evaluate the selection condition before[name] === ports[name].
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (name) => before[name] === ports[name]);
  ports.exportJson = /**
   * Supply the fixed "replacement" value.
   * @responsibility computation
   * @returns {string} The literal "replacement" for this branch.
   */ () => "replacement";
  assert.deepEqual([unchanged, Object.isFrozen(ports), compile(SOURCE).json], [true, false, '{"title":"Alternate syntax","count":0}']);
});

test("fully injected public helper preserves alternate output composition", /**
 * Verify fully injected public helper preserves alternate output composition; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ports } = fixture();
  assert.deepEqual(core.compileRouteWithDependencies(SOURCE, undefined, ports), core.createRouteCompiler(ports)(SOURCE));
});

test("public helper requires explicit non-geometry ports", /**
 * Verify public helper requires explicit non-geometry ports; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.compileRouteWithDependencies so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.compileRouteWithDependencies.
   */ () => core.compileRouteWithDependencies("route X", {}, {}), { name: "TypeError", message: 'Compiler port "parse" must be a function.' });
});

test("public helper rejects a missing dependencies record", /**
 * Verify public helper rejects a missing dependencies record; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.compileRouteWithDependencies so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.compileRouteWithDependencies.
   */ () => core.compileRouteWithDependencies("route X"), TypeError);
});

for (const validateGeometry of [undefined, null]) {
  test(`public helper preserves its ${validateGeometry} geometry fallback`, /**
   * Verify public helper preserves its ${validateGeometry} geometry fallback; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.compileRouteWithDependencies("route X", {}, { parse: core.parseVrl, validate: core.validateRoute, normalize: core.normalizeRoute, validateGeometry, layout: core.computeVerticalLayout, exportJson: core.exportRouteJson }).ok, true);
  });
  test(`factory preserves its ${validateGeometry} geometry fallback`, /**
   * Verify factory preserves its ${validateGeometry} geometry fallback; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.createRouteCompiler({ validateGeometry })("route X\ndownclimb").diagnostics[0].code, "VRL_GEOMETRY_HEIGHT_REQUIRED");
  });
}

test("configured adapters do not change the default compiler", /**
 * Verify configured adapters do not change the default compiler; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  core.createRouteCompiler(fixture().ports)(SOURCE);
  assert.equal(core.compileRoute("route Standard").model.name, "Standard");
});

test("standalone JSON adapter retains indentation and numeric fidelity", /**
 * Verify standalone JSON adapter retains indentation and numeric fidelity; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.exportRouteJson({ name: "Cañón", value: 0.1 + 0.2, unknown: null }), '{\n  "name": "Cañón",\n  "value": 0.30000000000000004,\n  "unknown": null\n}');
});

test("JSON adapter preserves native cycle failures", /**
 * Verify JSON adapter preserves native cycle failures; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = {};
  model.self = model;
  assert.throws(/**
   * Exercise core.exportRouteJson so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.exportRouteJson.
   */ () => core.exportRouteJson(model), TypeError);
});

test("JSON adapter preserves native unsupported bigint failures", /**
 * Verify JSON adapter preserves native unsupported bigint failures; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.exportRouteJson so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.exportRouteJson.
   */ () => core.exportRouteJson({ value: 1n }), TypeError);
});
