import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/vrl-core";

const ELEMENTS = ["start", "exit", "walk", "swim", "rappel", "downclimb", "climb", "pool", "hazard"];
const CONTEXTS = ["metadata", ...ELEMENTS];
/**
 * Project value, unit, meters into the record required by metric.
 * @responsibility computation
 * @param {number} meters - Numeric metric value in meters.
 * @returns {Object} A record containing value, unit, meters.
 */
const metric = (meters) => ({ value: meters, unit: "m", meters });
/**
 * Project value, unit, percent into the record required by percent.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {Object} A record containing value, unit, percent.
 */
const percent = (value) => ({ value, unit: "%", percent: value });
/**
 * Project distance, side into the record required by redirection.
 * @responsibility computation
 * @param {number} meters - Numeric metric value in meters.
 * @param {unknown} side - Declared left/right station or redirection side.
 * @returns {Object} A record containing distance, side.
 */
const redirection = (meters, side) => ({ distance: metric(meters), side });
const NUMERIC_CASES = [
  ["distance", "2.5m", metric(2.5), "banana"],
  ["height", "30m", metric(30), "banana"],
  ["rope", "60m", metric(60), "banana"],
  ["traverse", "2.5m", metric(2.5), "banana"],
  ["total_distance", "2.5m", metric(2.5), "banana"],
  ["total_descent", "2.5m", metric(2.5), "-5m"],
  ["entrance_elevation", "-2.5m", metric(-2.5), "banana"],
  ["exit_elevation", "-2.5m", metric(-2.5), "banana"],
  ["vertical_gain", "2.5m", metric(2.5), "banana"],
  ["descent", "2.5m", metric(2.5), "banana"],
  ["inclination", "0.5%", percent(0.5), "banana"],
  ["anchor_count", "5", "5", "1.5"],
  ["redirection", "5m:left", [redirection(5, "left")], ",5m:left,,"],
  ["redirections", "5m:left,25m:right", [redirection(5, "left"), redirection(25, "right")], "5m:left,,25m:right"],
  ["stages", "10m+20m", [metric(10), metric(20)], "10m++20m"]
];
const ENUM_CASES = [
  ["anchor", ["rappel"], ["bolts", "natural", "tree", "thread", "removable", "fixed", "unknown", "mixed"]],
  ["shape", ["rappel", "downclimb", "climb"], ["ladder", "direct", "slab"]],
  ["station", ["rappel", "downclimb", "climb"], ["left", "right", "center", "floor", "tree", "natural", "unknown"]],
  ["landing", ["rappel", "downclimb", "climb"], ["pool", "ledge", "dry", "chaos", "gallery", "trail", "unknown"]],
  ["exposure", ["downclimb", "climb"], ["low", "medium", "high"]],
  ["flow", ELEMENTS, ["dry", "low", "medium", "high"]],
  ["type", ["pool"], ["deep", "shallow", "swimmer", "dry", "unknown"]],
  ["severity", ["hazard"], ["low", "medium", "high", "critical"]]
];

/**
 * Build a scoped field-validation document with only the element's required default measurements and the
 * scenario's overrides.
 * @responsibility computation
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function document(scope, attributes) {
  const defaults = scope === "rappel" ? { height: "30m", rope: "60m" } : scope === "climb" || scope === "downclimb" ? { height: "30m" } : {};
  const fields = Object.entries({ ...defaults, ...attributes }).map(/**
   * Format the current entry as the text required by Object.entries({ ...defaults, ...attributes }).map,
   * preserving supplied values.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as name: selected field or entry name.
   * @param {unknown} input1[1] - Tuple member bound as value: value paired with its own key.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ ([name, value]) => `${name}=${JSON.stringify(value).replaceAll("\\t", "\t")}`).join(" ");
  return `route "Field survey"\n${scope} ${fields}`;
}

/**
 * Project typed attributes and extensions from metadata or the first element according to the selected
 * scope.
 * @responsibility computation
 * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function attributesOf(model, scope) {
  return scope === "metadata" ? { ...model.extensions, ...model.metadata } : { ...model.elements[0].extensions, ...model.elements[0].attributes };
}

/**
 * Compile a field scenario and observe the same named value in the model and serialized JSON.
 * @responsibility coordinator
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {Object} A record containing ok, model, json.
 */
function compiledField(source, scope, name) {
  const result = core.compileRoute(source);
  return { ok: result.ok, model: attributesOf(result.model, scope)[name], json: attributesOf(JSON.parse(result.json), scope)[name] };
}

/**
 * Compile malformed fields and project validation failure plus absence of all derived outputs.
 * @responsibility coordinator
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
 * @returns {Object} A record containing ok, error, model, layout, json.
 */
function failure(source) {
  const result = core.compileRoute(source);
  return { ok: result.ok, error: result.diagnostics.some(/**
   * Evaluate the selection condition kind === "validation" && severity === "error".
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
   * @param {string} input1.severity - Diagnostic severity, error or warning.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ ({ kind, severity }) => kind === "validation" && severity === "error"), model: result.model, layout: result.layout, json: result.json };
}

const FAILED = { ok: false, error: true, model: null, layout: null, json: null };

for (const scope of CONTEXTS) {
  for (const [name, valid, normalized, invalid] of NUMERIC_CASES) {
    test(`${scope} validates recognized numeric field ${name}`, /**
     * Verify ${scope} validates recognized numeric field ${name}; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(core.validateRoute(core.parseVrl(document(scope, { [name]: valid })).ast), []);
    });
    test(`${scope} compiles ${name} with its stable model and JSON type`, /**
     * Verify ${scope} compiles ${name} with its stable model and JSON type; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(compiledField(document(scope, { [name]: valid }), scope, name), { ok: true, model: normalized, json: normalized });
    });
    test(`${scope} reports a validation error for invalid ${name}`, /**
     * Verify ${scope} reports a validation error for invalid ${name}; arrange the scenario and make its single
     * direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.equal(core.validateRoute(core.parseVrl(document(scope, { [name]: invalid })).ast).some(/**
       * Evaluate the selection condition severity === "error".
       * @responsibility computation
       * @param {Object} input1 - Input record destructured into the separately documented members below.
       * @param {string} input1.severity - Diagnostic severity, error or warning.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ ({ severity }) => severity === "error"), true);
    });
    test(`${scope} blocks compilation for invalid ${name}`, /**
     * Verify ${scope} blocks compilation for invalid ${name}; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(failure(document(scope, { [name]: invalid })), FAILED);
    });
  }
}

for (const [name, scopes, values] of ENUM_CASES) {
  for (const scope of scopes) {
    for (const value of values) {
      test(`${scope} validates ${name}=${value}`, /**
       * Verify ${scope} validates ${name}=${value}; arrange the scenario and make its single direct assertion.
       * Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => {
        assert.deepEqual(core.validateRoute(core.parseVrl(document(scope, { [name]: value })).ast), []);
      });
      test(`${scope} preserves accepted enum ${name}=${value}`, /**
       * Verify ${scope} preserves accepted enum ${name}=${value}; arrange the scenario and make its single direct
       * assertion. Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => {
        assert.deepEqual(compiledField(document(scope, { [name]: value }), scope, name), { ok: true, model: value, json: value });
      });
    }
    for (const value of ["banana", "", values[0].toUpperCase()]) {
      test(`${scope} diagnoses unsupported ${name}=${JSON.stringify(value)}`, /**
       * Verify ${scope} diagnoses unsupported ${name}=${JSON.stringify(value)}; arrange the scenario and make its
       * single direct assertion. Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => {
        assert.deepEqual(core.validateRoute(core.parseVrl(document(scope, { [name]: value })).ast).map(/**
         * Project kind, severity, message, location into the record required by
         * core.validateRoute(core.parseVrl(document(scope, { [name]: value })).ast).map.
         * @responsibility computation
         * @param {Object} input1 - Input record destructured into the separately documented members below.
         * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
         * @param {string} input1.severity - Diagnostic severity, error or warning.
         * @param {string} input1.message - Human-readable diagnostic or process message.
         * @param {Object} input1.location - One-based line and UTF-16 column used as the diagnostic origin.
         * @returns {Object} A record containing kind, severity, message, location.
         */ ({ kind, severity, message, location }) => ({ kind, severity, message, location })), [
          { kind: "validation", severity: "error", message: `Field "${name}" has unsupported value "${value}".`, location: { line: 2, column: document(scope, { [name]: value }).split("\n")[1].indexOf(`${name}=`) + name.length + 2 } }
        ]);
      });
      test(`${scope} blocks unsupported enum ${name}=${JSON.stringify(value)}`, /**
       * Verify ${scope} blocks unsupported enum ${name}=${JSON.stringify(value)}; arrange the scenario and make its
       * single direct assertion. Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => {
        assert.deepEqual(failure(document(scope, { [name]: value })), FAILED);
      });
    }
  }
  for (const scope of CONTEXTS.filter(/**
   * Evaluate the selection condition !scopes.includes(context).
   * @responsibility computation
   * @param {unknown} context - Per-invocation parsing or browser context; mutation is owned by the enclosing workflow.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (context) => !scopes.includes(context))) {
    test(`${name} remains extension text outside its scope on ${scope}`, /**
     * Verify ${name} remains extension text outside its scope on ${scope}; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(compiledField(document(scope, { [name]: "custom vocabulary" }), scope, name), { ok: true, model: "custom vocabulary", json: "custom vocabulary" });
    });
  }
}

for (const scope of CONTEXTS) {
  for (const name of ["survey_team", "constructor", "__proto__", "toString"]) {
    test(`${scope} preserves unknown extension ${name}`, /**
     * Verify ${scope} preserves unknown extension ${name}; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(compiledField(document(scope, { [name]: "custom data: 1x60m" }), scope, name), { ok: true, model: "custom data: 1x60m", json: "custom data: 1x60m" });
    });
  }
}

for (const [name, parse, tokens] of [
  ["stages", core.parseRappelStagesToken, ["+10m+20m", "10m+20m+", "10m++20m", "10m+ +20m", "++", " ", "10m+\t+20m"]],
  ["redirections", core.parseRedirectionsToken, [",5m:left", "5m:left,", "5m:left,,10m:right", "5m:left, ,10m:right", ",,", " ", ",5m:left,,"]]
]) {
  for (const token of tokens) {
    test(`${name} parser rejects empty list entries in ${JSON.stringify(token)}`, /**
     * Verify ${name} parser rejects empty list entries in ${JSON.stringify(token)}; arrange the scenario and make
     * its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.equal(parse(token).ok, false);
    });
    test(`${name} compiler rejects empty list entries in ${JSON.stringify(token)}`, /**
     * Verify ${name} compiler rejects empty list entries in ${JSON.stringify(token)}; arrange the scenario and
     * make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(failure(document("rappel", { [name]: token })), FAILED);
    });
  }
}

for (const [name, value, normalized] of [
  ["stages", " 10m + 20m ", [metric(10), metric(20)]],
  ["redirections", " 5m: LEFT , 25m ", [redirection(5, "left"), redirection(25, "unknown")]],
  ["redirection", "5m:left,25m:right", [redirection(5, "left"), redirection(25, "right")]]
]) {
  test(`list whitespace and existing alias cardinality remain supported for ${name}`, /**
   * Verify list whitespace and existing alias cardinality remain supported for ${name}; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(compiledField(document("rappel", { [name]: value }), "rappel", name), { ok: true, model: normalized, json: normalized });
  });
}

const SUM_WARNING = 'Field "stages" total does not match rappel height.';
for (const [height, stages, matches] of [
  ["0.3m", "0.1m+0.2m", true],
  ["0.000003m", "0.000001m+0.000002m", true],
  ["30.000000m", "010.000000m+020m", true],
  ["999999999.999999m", "999999999m+0.999999m", true],
  ["1000000000m", "999999999.999999m+0.000001m", true],
  ["1m", Array(10).fill("0.1m").join("+"), true],
  ["0.3m", "0.1m+0.200001m", false],
  ["0.3m", "0.1m+0.199999m", false],
  ["1000000000m", "999999999.999999m+0.000002m", false],
  ["1000000000m", Array(10).fill("1000000000m").join("+"), false]
]) {
  for (const scope of ["metadata", "rappel", "climb", "walk"]) {
    test(`${scope} compares decimal stages exactly: ${stages} against ${height}`, /**
     * Verify ${scope} compares decimal stages exactly: ${stages} against ${height}; arrange the scenario and make
     * its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = core.compileRoute(document(scope, { height, stages, rope: "1000000000m" }));
      assert.deepEqual({ ok: result.ok, sumWarnings: result.diagnostics.filter(/**
       * Evaluate the selection condition message === SUM_WARNING.
       * @responsibility computation
       * @param {Object} input1 - Input record destructured into the separately documented members below.
       * @param {string} input1.message - Human-readable diagnostic or process message.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ ({ message }) => message === SUM_WARNING).map(/**
        * Return the selected severity binding unchanged.
        * @responsibility computation
        * @param {Object} input1 - Input record destructured into the separately documented members below.
        * @param {string} input1.severity - Diagnostic severity, error or warning.
        * @returns {unknown} The severity value selected or validated above.
        */ ({ severity }) => severity) }, { ok: true, sumWarnings: matches ? [] : ["warning"] });
    });
  }
}

test("decimal comparison does not rewrite serialized source measurements", /**
 * Verify decimal comparison does not rewrite serialized source measurements; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute(document("rappel", { height: "0.3m", stages: "0.1m+0.2m", rope: "1m" }));
  assert.deepEqual(JSON.parse(result.json).elements[0].attributes, { height: metric(0.3), rope: metric(1), stages: [metric(0.1), metric(0.2)] });
});

for (const value of ["0.000001%", "0.5%", "1%", "100%", "0.5"]) {
  test(`inclination accepts documented boundary ${value}`, /**
   * Verify inclination accepts documented boundary ${value}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(compiledField(document("rappel", { inclination: value }), "rappel", "inclination"), { ok: true, model: percent(parseFloat(value)), json: percent(parseFloat(value)) });
  });
}
for (const value of ["-0.000001%", "0%", "0.0000001%", "100.000001%", ""]) {
  test(`inclination blocks value outside the precision/range contract ${JSON.stringify(value)}`, /**
   * Verify inclination blocks value outside the precision/range contract ${JSON.stringify(value)}; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(failure(document("rappel", { inclination: value })), FAILED);
  });
}

for (const [scope, name] of [["rappel", "height"], ["rappel", "rope"], ["climb", "height"]]) {
  test(`${scope} requires ${name} when explicitly empty`, /**
   * Verify ${scope} requires ${name} when explicitly empty; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(failure(document(scope, { [name]: "" })), FAILED);
  });
}

for (const [scope, attrs] of [
  ["climb", { exposure: "banana" }], ["rappel", { shape: "" }],
  ["metadata", { total_descent: "-5m" }], ["rappel", { stages: "10m++20m" }],
  ["rappel", { redirections: ",5m:left,," }]
]) {
  test(`invalid ${scope} ${JSON.stringify(attrs)} cannot reach downstream ports`, /**
   * Verify invalid ${scope} ${JSON.stringify(attrs)} cannot reach downstream ports; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compile = core.createRouteCompiler({ /**
     * Supply the normalize test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */ normalize: () => calls.push("normalize"), /**
      * Supply the validateGeometry test double and record its invocation in caller-owned fixture state; return
      * the scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {unknown} The result returned by calls.push.
      */ validateGeometry: () => calls.push("geometry"), /**
      * Supply the layout test double and record its invocation in caller-owned fixture state; return the
      * scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {unknown} The result returned by calls.push.
      */ layout: () => calls.push("layout"), /**
      * Supply the exportJson test double and record its invocation in caller-owned fixture state; return the
      * scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {unknown} The result returned by calls.push.
      */ exportJson: () => calls.push("export") });
    compile(document(scope, attrs));
    assert.deepEqual(calls, []);
  });
}

test("field validation leaves its AST unchanged", /**
 * Verify field validation leaves its AST unchanged; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { ast } = core.parseVrl(document("rappel", { stages: "10m+20m", redirections: "5m:LEFT", survey_team: "A" }));
  const before = structuredClone(ast);
  core.validateRoute(ast);
  core.normalizeRoute(ast);
  assert.deepEqual(ast, before);
});

test("repeated compilation has deterministic diagnostics and normalized output", /**
 * Verify repeated compilation has deterministic diagnostics and normalized output; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const source = document("rappel", { stages: "10m+19.999999m", redirection: "5m:LEFT", survey_team: "A" });
  assert.deepEqual(core.compileRoute(source), core.compileRoute(source));
});

test("low-level attribute normalization still preserves invalid spellings", /**
 * Verify low-level attribute normalization still preserves invalid spellings; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.normalizeAttributes({ distance: "far", inclination: "steep", stages: "10m++20m", redirection: ",5m:left", anchor_count: "not counted", anchor: "custom" }), { distance: "far", inclination: "steep", stages: "10m++20m", redirection: ",5m:left", anchor_count: "not counted", anchor: "custom" });
});

// Source note statements consume text, not attributes. Programmatic parsers can
// provide note attributes, which obey the same field contract at the core port.
/**
 * Build a raw note AST carrying the requested attributes for direct normalization and applicability checks.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @returns {Object} A record containing the supplied fields, name, elements.
 */
function noteAst(attributes) {
  return { ...core.createEmptyRoute(), name: "Field survey", elements: [core.createRouteElement("note", attributes, { line: 2, column: 1 })] };
}

for (const [name, valid, normalized, invalid] of [...NUMERIC_CASES, ["flow", "low", "low", "banana"]]) {
  test(`programmatic note validates ${name}`, /**
   * Verify programmatic note validates ${name}; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(core.validateRoute(noteAst({ [name]: valid })), []);
  });
  test(`programmatic note rejects invalid ${name}`, /**
   * Verify programmatic note rejects invalid ${name}; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.validateRoute(noteAst({ [name]: invalid })).some(/**
     * Evaluate the selection condition severity === "error".
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {string} input1.severity - Diagnostic severity, error or warning.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ ({ severity }) => severity === "error"), true);
  });
  test(`programmatic note compiles ${name} with the same normalized type`, /**
   * Verify programmatic note compiles ${name} with the same normalized type; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const compile = core.createRouteCompiler({ /**
     * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing ast, diagnostics.
     */ parse: () => ({ ast: noteAst({ [name]: valid }), diagnostics: [] }) });
    const result = compile("");
    assert.deepEqual([result.ok, result.model.elements[0].attributes[name], JSON.parse(result.json).elements[0].attributes[name]], [true, normalized, normalized]);
  });
  test(`programmatic note blocks invalid ${name} at the compiler port`, /**
   * Verify programmatic note blocks invalid ${name} at the compiler port; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const compile = core.createRouteCompiler({ /**
     * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing ast, diagnostics.
     */ parse: () => ({ ast: noteAst({ [name]: invalid }), diagnostics: [] }) });
    const result = compile("");
    assert.deepEqual([result.ok, result.model, result.layout, result.json], [false, null, null, null]);
  });
}

test("source note text remains text even when it resembles a known field", /**
 * Verify source note text remains text even when it resembles a known field; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute('route "Field survey"\nnote exposure=banana').model.elements[0].extensions.text, "exposure=banana");
});

test("programmatic notes preserve extension attributes", /**
 * Verify programmatic notes preserve extension attributes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const attrs = { survey_team: "A", exposure: "custom vocabulary" };
  const compile = core.createRouteCompiler({ /**
   * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing ast, diagnostics.
   */ parse: () => ({ ast: noteAst(attrs), diagnostics: [] }) });
  assert.deepEqual(compile("").model.elements[0].extensions, attrs);
});
