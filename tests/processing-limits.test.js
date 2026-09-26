import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/vrl-core";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";

const SOURCE = 'route "Limits"\nwalk distance=1m';
const LIMITS = { maxSourceBytes: 1048576, maxLines: 20000, maxLineBytes: 16384, maxElements: 10000, maxListEntries: 1024 };

/**
 * Project compilation success, ordered diagnostic kinds and derived outputs for processing-budget
 * assertions.
 * @responsibility computation
 * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
 * @returns {Object} A record containing ok, kinds, model, layout, json.
 */
function outcome(result) {
  return { ok: result.ok, kinds: result.diagnostics.map(/**
   * Return the selected kind binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
   * @returns {unknown} The kind value selected or validated above.
   */ ({ kind }) => kind), model: result.model, layout: result.layout, json: result.json };
}
const LIMITED = { ok: false, kinds: ["limit"], model: null, layout: null, json: null };

/**
 * Construct a minimal raw walk AST with caller-supplied attributes for parser-port budget checks.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward; defaults to {}.
 * @returns {Object} A record containing the supplied fields, name, elements.
 */
function ast(attributes = {}) {
  return { ...core.createEmptyRoute(), name: "Limits", elements: [core.createRouteElement("walk", attributes, { line: 2, column: 1 })] };
}

for (const [name, source, size] of [
  ["maxSourceBytes", SOURCE, Buffer.byteLength(SOURCE)],
  ["maxLines", SOURCE + "\n", 3],
  ["maxLineBytes", SOURCE, Buffer.byteLength("walk distance=1m")],
  ["maxElements", 'route "Limits"\nwalk\nnote text\nhazard type=snake', 3],
  ["maxListEntries", 'route "Limits"\nrappel height=3m rope=6m stages=1m+1m+1m', 3]
]) {
  for (const offset of [-1, 0, 1]) {
    test(`${name} accepts only documents within a budget of ${size + offset}`, /**
     * Verify ${name} accepts only documents within a budget of ${size + offset}; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = core.compileRoute(source, { limits: { [name]: size + offset } });
      assert.deepEqual({ ok: result.ok, limited: result.diagnostics.some(/**
       * Evaluate the selection condition kind === "limit".
       * @responsibility computation
       * @param {Object} input1 - Input record destructured into the separately documented members below.
       * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ ({ kind }) => kind === "limit") }, { ok: offset >= 0, limited: offset < 0 });
    });
    test(`standalone parser honors ${name} at budget ${size + offset}`, /**
     * Verify standalone parser honors ${name} at budget ${size + offset}; arrange the scenario and make its single
     * direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.equal(core.parseVrl(source, { limits: { [name]: size + offset } }).diagnostics.some(/**
       * Evaluate the selection condition kind === "limit".
       * @responsibility computation
       * @param {Object} input1 - Input record destructured into the separately documented members below.
       * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ ({ kind }) => kind === "limit"), offset < 0);
    });
  }
}

for (const name of Object.keys(LIMITS)) {
  for (const value of [null, "100", false, {}, []]) {
    test(`${name} rejects nonnumeric configuration ${JSON.stringify(value)}`, /**
     * Verify ${name} rejects nonnumeric configuration ${JSON.stringify(value)}; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by core.compileRoute.
       */ () => core.compileRoute(SOURCE, { limits: { [name]: value } }), TypeError);
    });
  }
  for (const value of [0, -1, 1.5, Infinity, -Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    test(`${name} rejects invalid integer configuration ${String(value)}`, /**
     * Verify ${name} rejects invalid integer configuration ${String(value)}; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise core.parseVrl so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by core.parseVrl.
       */ () => core.parseVrl(SOURCE, { limits: { [name]: value } }), RangeError);
    });
  }
  test(`${name} accepts the largest safe integer configuration`, /**
   * Verify ${name} accepts the largest safe integer configuration; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.compileRoute(SOURCE, { limits: { [name]: Number.MAX_SAFE_INTEGER } }).ok, true);
  });
  test(`${name} uses its default when undefined`, /**
   * Verify ${name} uses its default when undefined; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(core.compileRoute(SOURCE, { limits: { [name]: undefined } }), core.compileRoute(SOURCE));
  });
}

for (const limits of [null, [], "limits", 3, new Date(0), Object.create({ maxLines: 2 }), { unknown: 1 }, { constructor: 1 }]) {
  test(`reject invalid limits object ${String(limits)}`, /**
   * Verify reject invalid limits object ${String(limits)}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.compileRoute.
     */ () => core.compileRoute(SOURCE, { limits }), TypeError);
  });
}
for (const source of [null, undefined, 42, [], {}]) {
  test(`reject invalid source type ${String(source)}`, /**
   * Verify reject invalid source type ${String(source)}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.parseVrl so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.parseVrl.
     */ () => core.parseVrl(source), TypeError);
  });
}

test("null-prototype limits are supported without mutating caller configuration", /**
 * Verify null-prototype limits are supported without mutating caller configuration; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const limits = Object.assign(Object.create(null), { maxElements: 1 });
  core.compileRoute(SOURCE, { limits });
  assert.deepEqual(limits, Object.assign(Object.create(null), { maxElements: 1 }));
});

test("parser ports receive an immutable resolved limits snapshot", /**
 * Verify parser ports receive an immutable resolved limits snapshot; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  let received;
  const compile = core.createRouteCompiler({ /**
   * Capture the exact resolved processing-limit object received by the parser port and delegate parsing with
   * those options.
   * @responsibility coordinator
   * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
   * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
   * @returns {unknown} The result returned by core.parseVrl.
   */ parse: (source, options) => { received = options.limits; return core.parseVrl(source, options); } });
  compile(SOURCE, { limits: { maxElements: 1 } });
  assert.deepEqual({ limits: received, frozen: Object.isFrozen(received) }, { limits: { ...LIMITS, maxElements: 1 }, frozen: true });
});

for (const text of ["é", "漢", "🧗", "\ud800", "\udc00", "a🧗é漢b"]) {
  const source = `route "${text}"`;
  for (const name of ["maxSourceBytes", "maxLineBytes"]) {
    for (const offset of [-1, 0, 1]) {
      test(`${name} counts UTF-8 bytes for ${JSON.stringify(text)} at offset ${offset}`, /**
       * Verify ${name} counts UTF-8 bytes for ${JSON.stringify(text)} at offset ${offset}; arrange the scenario and
       * make its single direct assertion. Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => {
        assert.equal(core.compileRoute(source, { limits: { [name]: Buffer.byteLength(source) + offset } }).ok, offset >= 0);
      });
    }
  }
}

test("source-byte overflow reports a UTF-16 column without splitting an astral character", /**
 * Verify source-byte overflow reports a UTF-16 column without splitting an astral character; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseVrl('route "🧗🧗"', { limits: { maxSourceBytes: 12 } }).diagnostics[0].location, { line: 1, column: 10 });
});

test("line-byte overflow reports the correct later-line location", /**
 * Verify line-byte overflow reports the correct later-line location; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseVrl('route X\nnote "🧗🧗"', { limits: { maxLineBytes: 11 } }).diagnostics[0].location, { line: 2, column: 9 });
});

for (const newline of ["\n", "\r\n"]) {
  test(`line limits count a trailing empty line for ${JSON.stringify(newline)}`, /**
   * Verify line limits count a trailing empty line for ${JSON.stringify(newline)}; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(core.parseVrl("route X" + newline, { limits: { maxLines: 1 } }).diagnostics[0].location, { line: 2, column: 1 });
  });
  test(`line bytes exclude the ${JSON.stringify(newline)} delimiter`, /**
   * Verify line bytes exclude the ${JSON.stringify(newline)} delimiter; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.compileRoute("route X" + newline, { limits: { maxLineBytes: 7 } }).ok, true);
  });
  test(`source bytes include the ${JSON.stringify(newline)} delimiter`, /**
   * Verify source bytes include the ${JSON.stringify(newline)} delimiter; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.parseVrl("route X" + newline, { limits: { maxSourceBytes: 7 } }).diagnostics[0].kind, "limit");
  });
}

test("a lone carriage return counts toward line bytes", /**
 * Verify a lone carriage return counts toward line bytes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseVrl("route X\r", { limits: { maxLineBytes: 7 } }).diagnostics[0].location, { line: 1, column: 8 });
});

test("empty source remains an ordinary missing-name failure", /**
 * Verify empty source remains an ordinary missing-name failure; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.compileRoute("", { limits: { maxSourceBytes: 1, maxLines: 1, maxLineBytes: 1 } }).diagnostics.map(/**
   * Return the selected kind binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
   * @returns {unknown} The kind value selected or validated above.
   */ ({ kind }) => kind), ["validation"]);
});

for (const [name, source] of [
  ["maxSourceBytes", 'route "Large"\n' + ("#" + "x".repeat(1020) + "\n").repeat(1040)],
  ["maxLines", 'route "Lines"' + "\n".repeat(20000)],
  ["maxLineBytes", 'route "' + "x".repeat(16384) + '"'],
  ["maxElements", 'route "Elements"\n' + "walk\n".repeat(10001)],
  ["maxListEntries", 'route "List"\nrappel height=1025m rope=1025m stages=' + Array(1025).fill("1m").join("+")]
]) {
  test(`default ${name} returns a structured bounded failure`, /**
   * Verify default ${name} returns a structured bounded failure; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(outcome(core.compileRoute(source)), LIMITED);
  });
  test(`default ${name} identifies its configured threshold`, /**
   * Verify default ${name} identifies its configured threshold; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.compileRoute(source).diagnostics[0].message, `Document exceeds ${name} limit of ${LIMITS[name]}.`);
  });
}

test("150000 walk lines fail with a limit diagnostic instead of a stack overflow", /**
 * Verify 150000 walk lines fail with a limit diagnostic instead of a stack overflow; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(outcome(core.compileRoute('route "Large"\n' + "walk distance=1m\n".repeat(150000))), LIMITED);
});

test("source preflight returns an empty recovery AST with the original source", /**
 * Verify source preflight returns an empty recovery AST with the original source; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const source = 'route "Long"';
  assert.deepEqual(core.parseVrl(source, { limits: { maxSourceBytes: 1 } }).ast, core.createEmptyRoute(source));
});

test("element overflow stops before storing or parsing subsequent elements", /**
 * Verify element overflow stops before storing or parsing subsequent elements; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.parseVrl('route X\nwalk\nwalk\nteleport', { limits: { maxElements: 1 } });
  assert.deepEqual({ elements: result.ast.elements.map(/**
   * Return the selected type binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.type - Declared element or record discriminator.
   * @returns {unknown} The type value selected or validated above.
   */ ({ type }) => type), diagnostics: result.diagnostics.map(/**
    * Project kind, location into the record required by result.diagnostics.map.
    * @responsibility computation
    * @param {Object} input1 - Input record destructured into the separately documented members below.
    * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
    * @param {Object} input1.location - One-based line and UTF-16 column used as the diagnostic origin.
    * @returns {Object} A record containing kind, location.
    */ ({ kind, location }) => ({ kind, location })) }, { elements: ["walk"], diagnostics: [{ kind: "limit", location: { line: 3, column: 1 } }] });
});

test("list overflow stops before storing the offending statement", /**
 * Verify list overflow stops before storing the offending statement; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route X\nwalk stages=1m+1m+1m\nwalk', { limits: { maxListEntries: 2 } }).ast.elements.length, 0);
});

for (const field of ["stages", "redirection", "redirections"]) {
  const separator = field === "stages" ? "+" : ",";
  for (const scope of ["metadata", "walk"]) {
    test(`${scope} bounds ${field} before semantic list parsing`, /**
     * Verify ${scope} bounds ${field} before semantic list parsing; arrange the scenario and make its single
     * direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(outcome(core.compileRoute(`route X\n${scope} ${field}="1m${separator}2m${separator}3m"`, { limits: { maxListEntries: 2 } })), LIMITED);
    });
  }
}

for (const statement of ['route "stages=1m+2m+3m"', 'route X\nnote stages=1m+2m+3m', 'route X\nwalk custom="1m+2m+3m"', 'route X\nwalk stages=""']) {
  test(`list budgets distinguish lists from text: ${statement}`, /**
   * Verify list budgets distinguish lists from text: ${statement}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.parseVrl(statement, { limits: { maxListEntries: 1 } }).diagnostics.length, 0);
  });
}

test("empty list positions count toward the budget before grammar validation", /**
 * Verify empty list positions count toward the budget before grammar validation; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute('route X\nwalk stages=1m+++2m', { limits: { maxListEntries: 3 } }).diagnostics[0].kind, "limit");
});

test("within-budget malformed lists still produce validation errors", /**
 * Verify within-budget malformed lists still produce validation errors; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute('route X\nwalk stages=1m++2m', { limits: { maxListEntries: 3 } }).diagnostics[0].kind, "validation");
});

test("increasing a list budget admits the same well-formed source", /**
 * Verify increasing a list budget admits the same well-formed source; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute('route X\nrappel height=3m rope=6m stages=1m+1m+1m', { limits: { maxListEntries: 3 } }).ok, true);
});

test("the default list maximum is accepted", /**
 * Verify the default list maximum is accepted; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute('route X\nrappel height=1024m rope=1024m stages=' + Array(1024).fill("1m").join("+")).model.elements[0].attributes.stages.length, 1024);
});

for (const [limits, source, expectedCalls] of [
  [{ maxSourceBytes: 1 }, SOURCE, []],
  [{ maxLines: 1 }, SOURCE, []],
  [{ maxLineBytes: 1 }, SOURCE, []],
  [{ maxElements: 1 }, SOURCE + "\nwalk", ["parse"]],
  [{ maxListEntries: 1 }, 'route X\nwalk redirections=1m,2m', ["parse"]]
]) {
  test(`limits ${JSON.stringify(limits)} stop expensive compiler ports`, /**
   * Verify limits ${JSON.stringify(limits)} stop expensive compiler ports; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compile = core.createRouteCompiler({ /**
     * Supply the parse test double and record its invocation in caller-owned fixture state; delegate to the
     * selected implementation after recording the supplied inputs. No production I/O is performed by this
     * fixture.
     * @responsibility coordinator
     * @param {unknown} args - Ordered command-line arguments; no shell interpolation is performed by process adapters.
     * @returns {unknown} The result returned by core.parseVrl.
     */ parse: (...args) => { calls.push("parse"); return core.parseVrl(...args); }, /**
      * Supply the validate test double and record its invocation in caller-owned fixture state; return the
      * scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {unknown} The result returned by calls.push.
      */ validate: () => calls.push("validate"), /**
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
    compile(source, { limits });
    assert.deepEqual(calls, expectedCalls);
  });
}

for (const [name, parsedAst] of [
  ["maxElements", { ...ast(), elements: [ast().elements[0], ast().elements[0]] }],
  ["maxListEntries", ast({ stages: "1m+2m" })],
  ["maxListEntries", { ...ast(), metadata: { redirections: "1m,2m" } }]
]) {
  test(`parser-port output cannot bypass ${name}: ${JSON.stringify(parsedAst.metadata)}`, /**
   * Verify parser-port output cannot bypass ${name}: ${JSON.stringify(parsedAst.metadata)}; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compile = core.createRouteCompiler({ /**
     * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing ast, diagnostics.
     */ parse: () => ({ ast: parsedAst, diagnostics: [] }), /**
      * Supply the validate test double and record its invocation in caller-owned fixture state; return the
      * scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {unknown} The result returned by calls.push.
      */ validate: () => calls.push("validate") });
    const result = compile("", { limits: { [name]: 1 } });
    assert.deepEqual({ result: outcome(result), calls }, { result: LIMITED, calls: [] });
  });
}

test("malformed parser-port values retain their programming errors", /**
 * Verify malformed parser-port values retain their programming errors; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compile = core.createRouteCompiler({ /**
   * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing ast, diagnostics.
   */ parse: () => ({ ast: ast({ stages: 123 }), diagnostics: [] }) });
  assert.throws(/**
   * Exercise compile so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by compile.
   */ () => compile(""), TypeError);
});

test("custom parser warnings remain nonblocking regardless of diagnostic kind", /**
 * Verify custom parser warnings remain nonblocking regardless of diagnostic kind; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compile = core.createRouteCompiler({ /**
   * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing ast, diagnostics.
   */ parse: () => ({ ast: ast(), diagnostics: [core.createDiagnostic("limit", "warning", "Caller advisory", { line: 1, column: 1 })] }) });
  const result = compile("");
  assert.deepEqual([result.ok, result.diagnostics[0].severity], [true, "warning"]);
});

test("list budgets apply independently to both aliases", /**
 * Verify list budgets apply independently to both aliases; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute('route X\nrappel height=5m rope=10m redirection=1m redirections=2m', { limits: { maxListEntries: 1 } }).ok, true);
});

test("one compilation's limits cannot affect the next compilation", /**
 * Verify one compilation's limits cannot affect the next compilation; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  core.compileRoute(SOURCE, { limits: { maxSourceBytes: 1 } });
  assert.equal(core.compileRoute(SOURCE).ok, true);
});

for (const port of ["parse", "validate", "normalize", "validateGeometry", "layout", "exportJson"]) {
  test(`an unrelated ${port} exception propagates unchanged`, /**
   * Verify an unrelated ${port} exception propagates unchanged; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const error = new RangeError("Internal failure");
    const compile = core.createRouteCompiler({ /**
     * Prepare port. Deliberate or propagated failures remain visible to the caller.
     * @responsibility computation
     * @returns {never} Does not return normally; throws the failure being checked.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */ [port]: () => { throw error; } });
    assert.throws(/**
     * Exercise compile so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by compile.
     */ () => compile(SOURCE), /**
     * Exercise the failing operation so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @param {unknown} actual - Observed value being compared with independently specified expectations.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (actual) => actual === error);
  });
}

for (const createState of [createVrlReactDiagramState, createVrlSvelteDiagramState]) {
  test(`${createState.name} displays a limit failure without a diagram`, /**
   * Verify ${createState.name} displays a limit failure without a diagram; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = createState(SOURCE, { limits: { maxSourceBytes: 1 } });
    assert.deepEqual([result.ok, result.svg, result.diagnostics[0].kind], [false, "", "limit"]);
  });
  test(`${createState.name} still throws on invalid configuration`, /**
   * Verify ${createState.name} still throws on invalid configuration; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise createState so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by createState.
     */ () => createState(SOURCE, { limits: { maxSourceBytes: 0 } }), RangeError);
  });
}

test("limit diagnostics have a readable correction", /**
 * Verify limit diagnostics have a readable correction; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.formatDiagnostic(core.parseVrl(SOURCE, { limits: { maxLines: 1 } }).diagnostics[0]), "ERROR limit at 2:1: Document exceeds maxLines limit of 1. Suggestion: Reduce the document or explicitly increase options.limits.maxLines for a trusted workload.");
});

test("repeated bounded compilations are deterministic", /**
 * Verify repeated bounded compilations are deterministic; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.compileRoute(SOURCE, { limits: { maxLines: 1 } }), core.compileRoute(SOURCE, { limits: { maxLines: 1 } }));
});

test("large geometry diagnostic batches retain order without argument expansion", /**
 * Verify large geometry diagnostic batches retain order without argument expansion; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const diagnostics = Array.from({ length: 150000 }, /**
   * Apply core.createDiagnostic to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by core.createDiagnostic.
   */ (_, index) => core.createDiagnostic("geometry", "warning", String(index), { line: 1, column: 1 }));
  const result = core.createRouteCompiler({ /**
   * Supply the validateGeometry test double; return the scenario's deliberately selected value. No production
   * I/O is performed by this fixture.
   * @responsibility computation
   * @returns {unknown} The diagnostics value selected or validated above.
   */ validateGeometry: () => diagnostics })(SOURCE);
  assert.deepEqual([result.ok, result.diagnostics.length, result.diagnostics[0].message, result.diagnostics.at(-1).message], [true, 150000, "0", "149999"]);
});

test("large direct identifier validation does not overflow diagnostic arguments", /**
 * Verify large direct identifier validation does not overflow diagnostic arguments; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const element = core.createRouteElement("walk", {}, { line: 1, column: 1 }, "duplicate");
  assert.equal(core.validateRoute({ ...ast(), elements: Array(150000).fill(element) }).length, 149999);
});

/**
 * Build a 150,000-element caller-owned AST to exercise low-level large-layout handling independently of
 * source budgets.
 * @responsibility computation
 * @param {Object} metadata - Route-level metadata; absent endpoint measurements remain unknown; defaults to {}.
 * @returns {Object} A record containing name, metadata, elements.
 */
function largeRoute(metadata = {}) {
  return { name: "Large layout", metadata, elements: Array.from({ length: 150000 }, /**
   * Apply core.createRouteElement to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by core.createRouteElement.
   */ (_, index) => core.createRouteElement("walk", {}, { line: index + 2, column: 1 }, `W${index + 1}`)) };
}

test("weighted layout preserves extents for 150000 elements", /**
 * Verify weighted layout preserves extents for 150000 elements; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.computeVerticalLayout(largeRoute());
  const lastY = Math.round(108 + 149999 * 68 * 0.9);
  assert.deepEqual([result.nodes.length, result.nodes.at(-1).x, result.nodes.at(-1).y, result.height], [150000, 96 + 149999 * 58, lastY, lastY + 64]);
});

test("elevation layout preserves endpoint coordinates for 150000 elements", /**
 * Verify elevation layout preserves endpoint coordinates for 150000 elements; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  /**
   * Project value, unit, meters into the record required by metric.
   * @responsibility computation
   * @param {number} meters - Numeric metric value in meters.
   * @returns {Object} A record containing value, unit, meters.
   */
  const metric = (meters) => ({ value: meters, unit: "m", meters });
  const result = core.computeElevationLayout(largeRoute({ entrance_elevation: metric(0), exit_elevation: metric(-149999) }), { minNodeGap: 0, pixelsPerMeter: 1 });
  assert.deepEqual([result.nodes.length, result.nodes[0].y, result.nodes.at(-1).y, result.nodes.at(-1).elevationMeters, result.height], [150000, 108, 150107, -149999, 150171]);
});

test("minimum-gap shifting handles 150000 ascending points without argument expansion", /**
 * Verify minimum-gap shifting handles 150000 ascending points without argument expansion; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const nodes = Array.from({ length: 150000 }, /**
   * Project y, direction into the record required by Array.from.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Object} A record containing y, direction.
   */ (_, index) => ({ y: -index, direction: "up" }));
  const result = core.applyMinimumNodeGap(nodes, 2, 10);
  assert.deepEqual([result.length, result[0].y, result.at(-1).y, nodes[0].y, nodes.at(-1).y], [150000, 300008, 10, -0, -149999]);
});

test("large direct redirection validation does not overflow diagnostic arguments", /**
 * Verify large direct redirection validation does not overflow diagnostic arguments; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const element = core.createRouteElement("rappel", { height: "1m", rope: "2m", redirections: Array(150000).fill("2m").join(",") }, { line: 1, column: 1 });
  assert.equal(core.validateElement(element).length, 150000);
});
