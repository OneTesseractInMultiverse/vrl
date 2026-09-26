import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createDiagnostic, createRouteCompiler, formatDiagnostic, parseAttributeTokens, parseVrl } from "@subvertic/vrl-core";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";

const ELEMENTS = ["start", "exit", "walk distance=1m", "rappel height=30m rope=60m", "downclimb height=2m", "climb height=2m", "pool type=deep", 'hazard type=snake', 'note "Notice"'];
const INVALID_DOCUMENTS = [
  ["repeated route", 'route "First"\nroute "Second"'],
  ["equal repeated route", 'route "First"\nroute "First"'],
  ["repeated route after elements", 'route "First"\nstart\nroute "Second"\nexit'],
  ["metadata before route", 'metadata country=CR\nroute "Late"'],
  ["metadata without route", 'metadata country=CR'],
  ["duplicate technical height", 'route "A"\nrappel height=30m height=5m rope=10m'],
  ["equal duplicate height", 'route "A"\nrappel height=30m height=30m rope=60m'],
  ["quoted equal duplicate height", 'route "A"\nrappel height=30m height="30m" rope=60m'],
  ["numerically equivalent height", 'route "A"\nrappel height=30m height=30.0m rope=60m'],
  ["duplicate metadata on one line", 'route "A"\nmetadata country=CR country=ES'],
  ["duplicate metadata across lines", 'route "A"\nmetadata country=CR\nmetadata country=ES'],
  ["equal metadata across lines", 'route "A"\nmetadata country=CR\nmetadata country=CR'],
  ["empty duplicate metadata", 'route "A"\nmetadata country=""\nmetadata country=""'],
  ["empty declaration does not allow a replacement", 'route ""\nroute "Replacement"'],
  ["missing route name does not allow a replacement", 'route\nroute "Replacement"'],
  ["closing brace does not permit another route", 'route "First" {\n}\nroute "Second"'],
  ["closing brace does not reset metadata ordering", 'route "A" {\nstart\n}\nmetadata country=CR'],
  ...ELEMENTS.flatMap(/**
   * Project the current entry into an ordered tuple for ELEMENTS.flatMap.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {Array} The ordered records or values assembled above.
   */ (element) => [
    [`${element} without route`, element],
    [`route after ${element}`, `${element}\nroute "Late"`],
    [`metadata after ${element}`, `route "A"\n${element}\nmetadata country=CR`]
  ])
];

for (const [name, source] of INVALID_DOCUMENTS) {
  test(`${name} blocks compilation without derived output`, /**
   * Verify ${name} blocks compilation without derived output; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source);
    assert.deepEqual({ ok: result.ok, syntaxError: result.diagnostics.some(/**
     * Evaluate the selection condition item.kind === "syntax" && item.severity === "error".
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The result of the documented comparison or calculation.
     */ (item) => item.kind === "syntax" && item.severity === "error"), output: [result.model, result.layout, result.json] }, { ok: false, syntaxError: true, output: [null, null, null] });
  });
}

const VALID_DOCUMENTS = [
  ['route alone', 'route "A"'],
  ['blank lines and comments', '\n# header\n  route "A" # name\n\n# metadata\nmetadata country=CR\n# body\nstart\nexit'],
  ['separate metadata keys', 'route "A"\nmetadata country=CR\nmetadata region=Cartago\nstart\nexit'],
  ['empty metadata line', 'route "A"\nmetadata\nmetadata country=CR\nstart'],
  ['no metadata', 'route "A"\nstart\nexit'],
  ['same key on different elements', 'route "A"\nwalk distance=1m\nwalk distance=2m'],
  ['same key in metadata and element', 'route "A"\nmetadata note="Summary"\nwalk distance=1m note="Detail"'],
  ['case-sensitive extension keys', 'route "A"\nmetadata custom=one Custom=two'],
  ['assignment-shaped route text', 'route name=one name=two'],
  ['assignment-shaped note text', 'route "A"\nnote height=30m height=5m']
];

for (const [name, source] of VALID_DOCUMENTS) {
  test(`${name} remains valid`, /**
   * Verify ${name} remains valid; arrange the scenario and make its single direct assertion. Assertion and setup
   * failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source);
    assert.deepEqual([result.ok, result.diagnostics], [true, []]);
  });
}

test("repeated metadata lines retain every distinct value in normalized JSON", /**
 * Verify repeated metadata lines retain every distinct value in normalized JSON; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "A"\nmetadata country=CR\nmetadata region="Bajos del Toro" entrance_elevation=100m\nmetadata exit_elevation=100m\nstart\nexit');
  assert.deepEqual([JSON.parse(result.json).metadata, JSON.parse(result.json).extensions], [{ entrance_elevation: { value: 100, unit: "m", meters: 100 }, exit_elevation: { value: 100, unit: "m", meters: 100 } }, { country: "CR", region: "Bajos del Toro" }]);
});

test("duplicate routes report both original source positions", /**
 * Verify duplicate routes report both original source positions; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('# comment\r\n\troute "First"\r\n  route "Second"');
  assert.deepEqual(result.diagnostics[0], {
    code: "VRL_SYNTAX_DUPLICATE_ROUTE", span: span(3, 3, 8),
    kind: "syntax", severity: "error", message: "Only one route declaration is allowed.", location: { line: 3, column: 3 },
    suggestion: "Keep one route declaration at the start of the document.",
    relatedLocations: [{ message: "First route declaration", location: { line: 2, column: 2 }, span: span(2, 2, 7) }]
  });
});

test("late route diagnostics identify the statement that preceded the declaration", /**
 * Verify late route diagnostics identify the statement that preceded the declaration; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const diagnostics = parseVrl('  metadata country=CR\n\troute "Late"').diagnostics;
  assert.deepEqual(diagnostics.map(/**
   * Project location, relatedLocations into the record required by diagnostics.map.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {Object} input1.location - One-based line and UTF-16 column used as the diagnostic origin.
   * @param {Array} input1.relatedLocations - Ordered related diagnostic source references.
   * @returns {Object} A record containing location, relatedLocations.
   */ ({ location, relatedLocations = [] }) => ({ location, relatedLocations })), [
    { location: { line: 1, column: 3 }, relatedLocations: [] },
    { location: { line: 2, column: 2 }, relatedLocations: [{ message: "First statement", location: { line: 1, column: 3 }, span: span(1, 3, 11) }] }
  ]);
});

test("late metadata diagnostics identify the first element, including annotations", /**
 * Verify late metadata diagnostics identify the first element, including annotations; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('route "A"\n  note "Boundary notice"\nexit\n\tmetadata country=CR');
  assert.deepEqual(result.diagnostics[0], {
    code: "VRL_SYNTAX_METADATA_ORDER", span: span(4, 2, 10),
    kind: "syntax", severity: "error", message: "Metadata must precede all route elements.", location: { line: 4, column: 2 },
    suggestion: "Move metadata lines between the route declaration and the first element.",
    relatedLocations: [{ message: "First route element", location: { line: 2, column: 3 }, span: span(2, 3, 7) }]
  });
});

test("duplicate keys report exact UTF-16 columns after an astral identifier", /**
 * Verify duplicate keys report exact UTF-16 columns after an astral identifier; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('route "A"\n  rappel "R🧗" height=30m height=5m rope=10m');
  assert.deepEqual(result.diagnostics[0], {
    code: "VRL_SYNTAX_DUPLICATE_ATTRIBUTE", span: span(2, 27, 33),
    kind: "syntax", severity: "error", message: 'Attribute "height" is declared more than once.', location: { line: 2, column: 27 },
    suggestion: "Keep a single value for this key; repeated keys are errors even when their values match.",
    relatedLocations: [{ message: "First declaration of this key", location: { line: 2, column: 16 }, span: span(2, 16, 22) }]
  });
});

test("cross-line metadata conflicts always point back to the first declaration", /**
 * Verify cross-line metadata conflicts always point back to the first declaration; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('route "A"\r\n\tmetadata country="Costa Rica"\r\n  metadata country=ES\r\nmetadata country=FR');
  assert.deepEqual(result.diagnostics.map(/**
   * Project the current entry into an ordered tuple for result.diagnostics.map.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {Object} input1.location - One-based line and UTF-16 column used as the diagnostic origin.
   * @param {Array} input1.relatedLocations - Ordered related diagnostic source references.
   * @returns {Array} The ordered records or values assembled above.
   */ ({ location, relatedLocations }) => [location, relatedLocations[0].location]), [
    [{ line: 3, column: 12 }, { line: 2, column: 11 }],
    [{ line: 4, column: 10 }, { line: 2, column: 11 }]
  ]);
});

test("raw attribute helper keeps its return shape and original value at a supplied origin", /**
 * Verify raw attribute helper keeps its return shape and original value at a supplied origin; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseAttributeTokens(['height=30m', 'height=5m', 'rope=10m'], { line: 7, column: 4 });
  assert.deepEqual(result, {
    attributes: { height: "30m", rope: "10m" },
    diagnostics: [{ code: "VRL_SYNTAX_DUPLICATE_ATTRIBUTE", span: span(7, 15, 21), kind: "syntax", severity: "error", message: 'Attribute "height" is declared more than once.', location: { line: 7, column: 15 },
      suggestion: "Keep a single value for this key; repeated keys are errors even when their values match.",
      relatedLocations: [{ message: "First declaration of this key", location: { line: 7, column: 4 }, span: span(7, 4, 10) }] }]
  });
});

for (const key of ["rope", "anchor", "anchor_count", "station", "landing", "flow", "shape", "inclination", "stages", "redirection", "redirections", "custom", "__proto__", "constructor", "toString"]) {
  test(`duplicate policy treats ${key} as an ordinary case-sensitive key`, /**
   * Verify duplicate policy treats ${key} as an ordinary case-sensitive key; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = parseAttributeTokens([`${key}=first`, `${key}=second`]);
    assert.deepEqual([Object.entries(result.attributes), result.diagnostics.map(/**
     * Project item.message from the current record.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The item.message value selected or validated above.
     */ (item) => item.message)], [[[key, "first"]], [`Attribute "${key}" is declared more than once.`]]);
  });
}

test("prototype-shaped metadata keys retain their first value without inherited-key collisions", /**
 * Verify prototype-shaped metadata keys retain their first value without inherited-key collisions; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('route "A"\nmetadata __proto__=first constructor=one toString=alpha\nmetadata __proto__=second constructor=two toString=beta');
  assert.deepEqual([Object.entries(result.ast.metadata), Object.getPrototypeOf(result.ast.metadata) === Object.prototype, result.diagnostics.length], [[['__proto__', 'first'], ['constructor', 'one'], ['toString', 'alpha']], true, 3]);
});

test("rejecting a repeated height cannot hide the original short-rope warning", /**
 * Verify rejecting a repeated height cannot hide the original short-rope warning; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "A"\nrappel height=30m height=5m rope=10m');
  assert.deepEqual([result.ast.elements[0].attributes.height, result.diagnostics.filter(/**
   * Evaluate the selection condition item.severity === "warning".
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (item) => item.severity === "warning").length], ["30m", 1]);
});

test("recovery preserves the first route and attributes while continuing later statements", /**
 * Verify recovery preserves the first route and attributes while continuing later statements; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('route "First"\nmetadata country=CR\nroute "Second"\nmetadata country=ES region=Cartago\nwalk distance=1m distance=2m\nnote "Kept"');
  assert.deepEqual({ name: result.ast.name, metadata: result.ast.metadata, elements: result.ast.elements.map(/**
   * Project element.attributes from the current record.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {unknown} The element.attributes value selected or validated above.
   */ (element) => element.attributes), errors: result.diagnostics.length }, { name: "First", metadata: { country: "CR", region: "Cartago" }, elements: [{ distance: "1m" }, { text: "Kept" }], errors: 3 });
});

test("statements with invalid order do not enter the recovery AST", /**
 * Verify statements with invalid order do not enter the recovery AST; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('start\nroute "Late"\nmetadata country=CR\nexit');
  assert.deepEqual([result.ast.name, result.ast.metadata, result.ast.elements.map(/**
   * Project element.type from the current record.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The element.type value selected or validated above.
   */ (element) => element.type)], [null, {}, ["exit"]]);
});

test("lexically invalid lines do not reserve route declarations or metadata keys", /**
 * Verify lexically invalid lines do not reserve route declarations or metadata keys; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('route "Unfinished\nroute "Kept"\nmetadata country=CR broken="Open\nmetadata country=ES\nstart');
  assert.deepEqual([result.ast.name, result.ast.metadata, result.diagnostics.map(/**
   * Project item.message from the current record.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The item.message value selected or validated above.
   */ (item) => item.message)], ["Kept", { country: "ES" }, ["Unterminated quoted text.", "Unterminated quoted text."]]);
});

test("unrecognized statements do not change recovery order", /**
 * Verify unrecognized statements do not change recovery order; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('unknown\nroute "Kept"\nmetadata country=CR');
  assert.deepEqual([result.ast.name, result.ast.metadata, result.diagnostics.length], ["Kept", { country: "CR" }, 1]);
});

test("missing route names still reserve the declaration for duplicate reporting", /**
 * Verify missing route names still reserve the declaration for duplicate reporting; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseVrl('route\nroute "Replacement"');
  assert.deepEqual([result.ast.name, result.diagnostics.map(/**
   * Project item.location from the current record.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The item.location value selected or validated above.
   */ (item) => item.location)], [null, [{ line: 1, column: 1 }, { line: 2, column: 1 }]]);
});

test("attribute recovery diagnoses later tokens without losing earlier values", /**
 * Verify attribute recovery diagnoses later tokens without losing earlier values; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = parseAttributeTokens(['height=30m', 'unexpected', 'height=5m', 'rope=10m']);
  assert.deepEqual([result.attributes, result.diagnostics.length], [{ height: "30m", rope: "10m" }, 2]);
});

const BRACED_DOCUMENTS = [
  ['balanced cosmetic braces', 'route "A" {\nmetadata country=CR {\n}\nstart {\n}\nexit\n}'],
  ['unbalanced opening braces', '{\nroute "A" {\nmetadata country=CR {\nstart\nexit'],
  ['unbalanced closing braces', '}\nroute "A"\nmetadata country=CR\n}\nstart\nexit\n}'],
  ['braces and comments', '{ # ignored\nroute "A" { # cosmetic\nmetadata country=CR\nstart\nexit\n} # ignored']
];
for (const [name, source] of BRACED_DOCUMENTS) {
  test(`${name} retain the documented flat semantics`, /**
   * Verify ${name} retain the documented flat semantics; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source);
    assert.deepEqual([result.ok, result.model.name, result.model.extensions, result.model.elements.map(/**
     * Project element.type from the current record.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The element.type value selected or validated above.
     */ (element) => element.type)], [true, "A", { country: "CR" }, ["start", "exit"]]);
  });
}

for (const [source, expected] of [['route "{"', "{"], ['route "}"', "}"], ['route A{', 'A{'], ['route A}', 'A}'], ['route A }', 'A }'], ['route A { {', 'A {']]) {
  test(`brace text follows lexical token rules in ${source}`, /**
   * Verify brace text follows lexical token rules in ${source}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(compileRoute(source).model.name, expected);
  });
}

for (const source of ['route "A"{', 'route "A"\n{ {', 'route "A"\n} }', 'route "A"\n"}"', 'route "A"\nmetadata country=CR { {', 'route "A"\nsection "Nested" {', 'route "A"\nmetadata {\ncountry=CR\n}']) {
  test(`unsupported brace or block spelling fails explicitly: ${JSON.stringify(source)}`, /**
   * Verify unsupported brace or block spelling fails explicitly: ${JSON.stringify(source)}; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(compileRoute(source).ok, false);
  });
}

test("quoted braces and assignment-looking note text retain their literal meaning", /**
 * Verify quoted braces and assignment-looking note text retain their literal meaning; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "A"\nmetadata description="{ country=CR }"\nnote "}" {');
  assert.deepEqual([result.model.extensions.description, result.model.elements[0].extensions.text], ["{ country=CR }", "}"]);
});

for (const [name, source] of INVALID_DOCUMENTS.slice(0, 17)) {
  test(`${name} never reaches normalization, geometry, layout, or export ports`, /**
   * Verify ${name} never reaches normalization, geometry, layout, or export ports; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compile = createRouteCompiler({ /**
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
    compile(source);
    assert.deepEqual(calls, []);
  });
}

test("readable diagnostics expose both locations", /**
 * Verify readable diagnostics expose both locations; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const diagnostic = parseVrl('route "First"\n  route "Second"').diagnostics[0];
  assert.equal(formatDiagnostic(diagnostic), 'ERROR syntax at 2:3: Only one route declaration is allowed. Suggestion: Keep one route declaration at the start of the document. Related: First route declaration at 1:1.');
});

test("diagnostics without related locations retain the existing shape", /**
 * Verify diagnostics without related locations retain the existing shape; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(createDiagnostic("syntax", "error", "Bad", { line: 1, column: 1 }, "", []), { kind: "syntax", severity: "error", message: "Bad", location: { line: 1, column: 1 }, suggestion: "" });
});

test("readable diagnostics retain all related locations in their supplied order", /**
 * Verify readable diagnostics retain all related locations in their supplied order; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const diagnostic = createDiagnostic("syntax", "error", "Conflict", { line: 3, column: 1 }, "", [
    { message: "First", location: { line: 1, column: 2 } }, { message: "Second", location: { line: 2, column: 4 } }
  ]);
  assert.equal(formatDiagnostic(diagnostic), "ERROR syntax at 3:1: Conflict Related: First at 1:2. Related: Second at 2:4.");
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name} returns both conflict locations and no diagram`, /**
   * Verify ${name} returns both conflict locations and no diagram; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create('route "A"\nrappel height=30m height=5m rope=10m');
    assert.deepEqual([state.ok, state.svg, state.model, state.diagnostics[0].relatedLocations, state.diagnosticsText.includes("First declaration of this key at 2:8")], [false, "", null, [{ message: "First declaration of this key", location: { line: 2, column: 8 }, span: span(2, 8, 14) }], true]);
  });
}

test("successive parses cannot share document-order or duplicate-key state", /**
 * Verify successive parses cannot share document-order or duplicate-key state; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  parseVrl('route "Old"\nmetadata country=ES\nstart');
  assert.deepEqual(parseVrl('route "New"\nmetadata country=CR').diagnostics, []);
});

test("repeated conflicting parses produce identical recovery data and locations", /**
 * Verify repeated conflicting parses produce identical recovery data and locations; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const source = 'route "First"\nroute "Second"\nmetadata country=CR\nmetadata country=ES\nrappel height=30m height=5m rope=10m';
  assert.deepEqual(parseVrl(source), parseVrl(source));
});

for (const source of ["", "# no route\n{\n}\n"]) {
  test(`documents without a route name remain invalid: ${JSON.stringify(source)}`, /**
   * Verify documents without a route name remain invalid: ${JSON.stringify(source)}; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source);
    assert.deepEqual([result.ok, result.diagnostics.map(/**
     * Project item.message from the current record.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The item.message value selected or validated above.
     */ (item) => item.message), result.model], [false, ["A route name is required."], null]);
  });
}

/**
 * Construct an independently specified end-exclusive source span from one line and its start/end columns.
 * @responsibility computation
 * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
 * @param {unknown} start - Inclusive zero-based source offset, or starting coordinate as specified by this helper.
 * @param {unknown} end - Exclusive source offset, or ending coordinate as specified by this helper.
 * @returns {Object} A record containing start, end.
 */
function span(line, start, end) {
  return { start: { line, column: start }, end: { line, column: end } };
}
