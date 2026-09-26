import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/vrl-core";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";

const QUOTED_VALUES = [
  ["equals sign", '"A=B"', "A=B"],
  ["comment character", '"A # B"', "A # B"],
  ["whitespace", '"  A \t B  "', "  A \t B  "],
  ["escaped quotes", '"A \\"B\\""', 'A "B"'],
  ["escaped backslash", '"A\\\\B"', "A\\B"],
  ["literal escape spelling", '"A\\\\nB"', "A\\nB"],
  ["Unicode", '"Cañón 🧗 水"', "Cañón 🧗 水"],
  ["empty text", '""', ""],
  ["opening brace", '"{"', "{"],
  ["closing brace", '"}"', "}"]
];

const TEXT_CONTEXTS = [
  ["route name", /**
   * Compute "route " + value.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (value) => "route " + value, /**
   * Project ast.name from the current record.
   * @responsibility computation
   * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
   * @returns {unknown} The ast.name value selected or validated above.
   */ (ast) => ast.name],
  ["start label", /**
   * Compute "start " + value.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (value) => "start " + value, /**
   * Project ast.elements.0.label from the current record.
   * @responsibility computation
   * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
   * @returns {unknown} The ast.elements.0.label value selected or validated above.
   */ (ast) => ast.elements[0].label],
  ["exit label", /**
   * Compute "exit " + value.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (value) => "exit " + value, /**
   * Project ast.elements.0.label from the current record.
   * @responsibility computation
   * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
   * @returns {unknown} The ast.elements.0.label value selected or validated above.
   */ (ast) => ast.elements[0].label],
  ["technical identifier", /**
   * Compute "rappel " + value + " height=1m rope=2m".
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (value) => "rappel " + value + " height=1m rope=2m", /**
   * Project ast.elements.0.id from the current record.
   * @responsibility computation
   * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
   * @returns {unknown} The ast.elements.0.id value selected or validated above.
   */ (ast) => ast.elements[0].id],
  ["note text", /**
   * Compute "note " + value.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (value) => "note " + value, /**
   * Project ast.elements.0.attributes.text from the current record.
   * @responsibility computation
   * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
   * @returns {unknown} The ast.elements.0.attributes.text value selected or validated above.
   */ (ast) => ast.elements[0].attributes.text],
  ["element attribute", /**
   * Compute "walk distance=1m note=" + value.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (value) => "walk distance=1m note=" + value, /**
   * Project ast.elements.0.attributes.note from the current record.
   * @responsibility computation
   * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
   * @returns {unknown} The ast.elements.0.attributes.note value selected or validated above.
   */ (ast) => ast.elements[0].attributes.note],
  ["metadata attribute", /**
   * Compute "metadata description=" + value.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (value) => "metadata description=" + value, /**
   * Project ast.metadata.description from the current record.
   * @responsibility computation
   * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
   * @returns {unknown} The ast.metadata.description value selected or validated above.
   */ (ast) => ast.metadata.description]
];

for (const [context, sourceFor, textFrom] of TEXT_CONTEXTS) {
  for (const [name, encoded, expected] of QUOTED_VALUES) {
    test(context + " preserves " + name, /**
     * Verify context + " preserves " + name; arrange the scenario and make its single direct assertion. Assertion
     * and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const source = context === "route name" ? sourceFor(encoded) : 'route "Context"\n' + sourceFor(encoded);
      const result = core.parseVrl(source);
      assert.deepEqual({ text: textFrom(result.ast), diagnostics: result.diagnostics }, { text: expected, diagnostics: [] });
    });
  }
}

test("quoted equals signs remain labels before real attributes", /**
 * Verify quoted equals signs remain labels before real attributes; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseVrl('route "Context"\n  start "A=B" note="C=D"').ast.elements[0], {
    type: "start",
    id: null,
    label: "A=B",
    attributes: { note: "C=D" },
    sourceLocation: { line: 2, column: 3 }
  });
});

test("lexer exposes typed tokens and exact original spans", /**
 * Verify lexer exposes typed tokens and exact original spans; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.lexVrlLine(' \tstart "A=B" note="x # y" id=R1 # ignored'), {
    tokens: [
      { kind: "bare", value: "start", raw: "start", span: { start: { line: 1, column: 3 }, end: { line: 1, column: 8 } } },
      { kind: "quoted", value: "A=B", raw: '"A=B"', span: { start: { line: 1, column: 9 }, end: { line: 1, column: 14 } } },
      {
        kind: "attribute", key: "note", value: "x # y", valueForm: "quoted", raw: 'note="x # y"',
        keySpan: { start: { line: 1, column: 15 }, end: { line: 1, column: 19 } },
        valueSpan: { start: { line: 1, column: 20 }, end: { line: 1, column: 27 } },
        span: { start: { line: 1, column: 15 }, end: { line: 1, column: 27 } }
      },
      {
        kind: "attribute", key: "id", value: "R1", valueForm: "bare", raw: "id=R1",
        keySpan: { start: { line: 1, column: 28 }, end: { line: 1, column: 30 } },
        valueSpan: { start: { line: 1, column: 31 }, end: { line: 1, column: 33 } },
        span: { start: { line: 1, column: 28 }, end: { line: 1, column: 33 } }
      }
    ],
    diagnostics: [],
    commentStart: 33
  });
});

test("lexer offsets spans from a supplied source origin", /**
 * Verify lexer offsets spans from a supplied source origin; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.lexVrlLine('id="X"', { line: 3, column: 5 }).tokens[0], {
    kind: "attribute", key: "id", value: "X", valueForm: "quoted", raw: 'id="X"',
    keySpan: { start: { line: 3, column: 5 }, end: { line: 3, column: 7 } },
    valueSpan: { start: { line: 3, column: 8 }, end: { line: 3, column: 11 } },
    span: { start: { line: 3, column: 5 }, end: { line: 3, column: 11 } }
  });
});

test("source columns count UTF-16 units rather than displayed glyphs", /**
 * Verify source columns count UTF-16 units rather than displayed glyphs; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.lexVrlLine('note "🧗" x=1').tokens.map(/**
   * Project token.span from the current record.
   * @responsibility computation
   * @param {unknown} token - Current typed lexeme or raw token text, according to the owning parser.
   * @returns {unknown} The token.span value selected or validated above.
   */ (token) => token.span), [
    { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } },
    { start: { line: 1, column: 6 }, end: { line: 1, column: 10 } },
    { start: { line: 1, column: 11 }, end: { line: 1, column: 14 } }
  ]);
});

const INVALID_LINES = [
  ['route "Open', 7, "Unterminated quoted text."],
  ['walk distance=1m note="Open', 23, "Unterminated quoted text."],
  ['note "tail\\', 11, "Unfinished escape sequence."],
  ['note "bad\\n"', 10, "Unsupported escape sequence."],
  ['note "bad\\q"', 10, "Unsupported escape sequence."],
  ['note "\\u0041"', 7, "Unsupported escape sequence."],
  ['note "\\#"', 7, "Unsupported escape sequence."],
  ['start "A"suffix', 10, "Expected whitespace between tokens."],
  ['start A"B"', 8, "Expected whitespace between tokens."],
  ['start "A""B"', 10, "Expected whitespace between tokens."],
  ['metadata "key"=value', 15, "Expected whitespace between tokens."],
  ['metadata note= "x"', 15, "Attribute value is missing."],
  ['metadata note=', 15, "Attribute value is missing."],
  ['metadata note=# comment', 15, "Attribute value is missing."],
  ['metadata =value', 10, "Attribute key is missing."],
  ['metadata note="x"next=1', 18, "Expected whitespace between tokens."],
  ['route"X"', 6, "Expected whitespace between tokens."],
  ['route "X"{', 10, "Expected whitespace between tokens."],
  ['route "X"\\', 10, "Expected whitespace between tokens."],
  ['route "Open # still text', 7, "Unterminated quoted text."],
  ['note "escaped closer\\"', 6, "Unterminated quoted text."]
];

for (const [line, column, message] of INVALID_LINES) {
  test("precise lexical failure: " + JSON.stringify(line), /**
   * Verify precise lexical failure: " + JSON.stringify(line); arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.parseVrl('route "Existing"\r\n\t' + line);
    assert.deepEqual(result.diagnostics.map(/**
     * Project kind, severity, message, location into the record required by result.diagnostics.map.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
     * @param {string} input1.severity - Diagnostic severity, error or warning.
     * @param {string} input1.message - Human-readable diagnostic or process message.
     * @param {Object} input1.location - One-based line and UTF-16 column used as the diagnostic origin.
     * @returns {Object} A record containing kind, severity, message, location.
     */ ({ kind, severity, message, location }) => ({ kind, severity, message, location })), [
      { kind: "syntax", severity: "error", message, location: { line: 2, column: column + 1 } }
    ]);
  });

  test("lexical failure blocks downstream compilation: " + JSON.stringify(line), /**
   * Verify lexical failure blocks downstream compilation: " + JSON.stringify(line); arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compile = core.createRouteCompiler({
      /**
       * Supply the normalize test double and record its invocation in caller-owned fixture state; return the
       * scenario's deliberately selected value. No production I/O is performed by this fixture.
       * @responsibility computation
       * @returns {unknown} The result returned by calls.push.
       */
      normalize: () => calls.push("normalize"),
      /**
       * Supply the validateGeometry test double and record its invocation in caller-owned fixture state; return
       * the scenario's deliberately selected value. No production I/O is performed by this fixture.
       * @responsibility computation
       * @returns {unknown} The result returned by calls.push.
       */
      validateGeometry: () => calls.push("geometry"),
      /**
       * Supply the layout test double and record its invocation in caller-owned fixture state; return the
       * scenario's deliberately selected value. No production I/O is performed by this fixture.
       * @responsibility computation
       * @returns {unknown} The result returned by calls.push.
       */
      layout: () => calls.push("layout"),
      /**
       * Supply the exportJson test double and record its invocation in caller-owned fixture state; return the
       * scenario's deliberately selected value. No production I/O is performed by this fixture.
       * @responsibility computation
       * @returns {unknown} The result returned by calls.push.
       */
      exportJson: () => calls.push("export")
    });
    const result = compile('route "Existing"\n' + line);
    assert.deepEqual({ ok: result.ok, model: result.model, layout: result.layout, json: result.json, calls }, {
      ok: false, model: null, layout: null, json: null, calls: []
    });
  });
}

test("diagnostics identify the invalid token at an explicit origin", /**
 * Verify diagnostics identify the invalid token at an explicit origin; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.lexVrlLine('"bad\\t"', { line: 9, column: 4 }).diagnostics[0], {
    code: "VRL_LEX_UNSUPPORTED_ESCAPE", kind: "syntax", severity: "error", message: "Unsupported escape sequence.",
    location: { line: 9, column: 8 }, suggestion: 'Only \\" and \\\\ are supported inside quoted text.'
  });
});

test("an unfinished escape identifies the backslash and suggests supported escapes", /**
 * Verify an unfinished escape identifies the backslash and suggests supported escapes; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.lexVrlLine('"\\').diagnostics[0], {
    code: "VRL_LEX_UNFINISHED_ESCAPE", kind: "syntax", severity: "error", message: "Unfinished escape sequence.",
    location: { line: 1, column: 2 }, suggestion: 'Use \\" or \\\\ and close the quoted text on the same line.'
  });
});

test("lexical errors discard the entire statement and recover on the next line", /**
 * Verify lexical errors discard the entire statement and recover on the next line; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.parseVrl('route "Kept"\nmetadata region=OK note="Open\nstart "Entry"\nwalk distance=1m note="bad\\q"\nexit "Finish"');
  assert.deepEqual({ name: result.ast.name, metadata: result.ast.metadata, elements: result.ast.elements.map(/**
   * Project element.type from the current record.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The element.type value selected or validated above.
   */ (element) => element.type), errors: result.diagnostics.length }, {
    name: "Kept", metadata: {}, elements: ["start", "exit"], errors: 2
  });
});

test("an opening quote cannot consume text from later physical lines", /**
 * Verify an opening quote cannot consume text from later physical lines; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.parseVrl('route "Kept"\nnote "A\nB"\nstart "Entry"');
  assert.deepEqual({ name: result.ast.name, errors: result.diagnostics.map(/**
   * Project diagnostic.location from the current record.
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {unknown} The diagnostic.location value selected or validated above.
   */ (diagnostic) => diagnostic.location), label: result.ast.elements[0].label }, {
    name: "Kept", errors: [{ line: 2, column: 6 }, { line: 3, column: 2 }], label: "Entry"
  });
});

test("a quoted attribute-looking token after attributes is reported at its own span", /**
 * Verify a quoted attribute-looking token after attributes is reported at its own span; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.parseVrl('route "A"\n  walk distance=1m "A=B"');
  assert.deepEqual(result.diagnostics[0], {
    code: "VRL_SYNTAX_EXPECTED_ATTRIBUTE", span: { start: { line: 2, column: 20 }, end: { line: 2, column: 25 } },
    kind: "syntax", severity: "error", message: 'Expected key=value attribute but found ""A=B""',
    location: { line: 2, column: 20 }, suggestion: 'Write attributes such as height=35m or note="Main line".'
  });
});

test("comment content is not tokenized or validated", /**
 * Verify comment content is not tokenized or validated; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseVrl('route "A"# "\\q\nstart# "unfinished\\').diagnostics, []);
});

test("bare attribute values retain equals signs after the first separator", /**
 * Verify bare attribute values retain equals signs after the first separator; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route "Context"\nmetadata expression=A=B').ast.metadata.expression, "A=B");
});

test("legacy unquoted text normalizes token separators and decodes quoted fragments", /**
 * Verify legacy unquoted text normalizes token separators and decodes quoted fragments; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route  Río\t"Azul  Norte"').ast.name, "Río Azul  Norte");
});

test("assignment-shaped free text remains literal route text", /**
 * Verify assignment-shaped free text remains literal route text; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route name="A=B"').ast.name, 'name="A=B"');
});

test("standalone braces remain tolerated outside quoted text", /**
 * Verify standalone braces remain tolerated outside quoted text; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseVrl('\n # comment\n {\nroute "A" {\n}\n').diagnostics, []);
});

test("quoted keywords are not interpreted as statements", /**
 * Verify quoted keywords are not interpreted as statements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('"route" "A"').diagnostics[0].message, 'Unknown VRL statement ""route""');
});

test("a quoted closing brace is not discarded as a block delimiter", /**
 * Verify a quoted closing brace is not discarded as a block delimiter; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('"}"').diagnostics[0].kind, "syntax");
});

test("bare backslashes do not escape comments", /**
 * Verify bare backslashes do not escape comments; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.stripComment("note path\\# comment"), "note path\\");
});

test("comment stripping retains original whitespace and escaped quote spelling", /**
 * Verify comment stripping retains original whitespace and escaped quote spelling; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.stripComment('  note "A \\"# B" \t# remove'), '  note "A \\"# B" \t');
});

test("comment stripping leaves complete comment-free lines unchanged", /**
 * Verify comment stripping leaves complete comment-free lines unchanged; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.stripComment('  note "A#B"  '), '  note "A#B"  ');
});

test("raw tokenizer preserves original escaped spelling and omits comments", /**
 * Verify raw tokenizer preserves original escaped spelling and omits comments; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.tokenize('start "A=B" note="A\\\\B" # ignored'), ["start", '"A=B"', 'note="A\\\\B"']);
});

for (const helper of [core.tokenize, core.stripComment]) {
  test(helper.name + " throws structured errors for malformed input", /**
   * Verify helper.name + " throws structured errors for malformed input; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise helper so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by helper.
     */ () => helper('route "Open'), {
      name: "SyntaxError", message: "Unterminated quoted text.",
      diagnostics: [{
        code: "VRL_LEX_UNTERMINATED_STRING", kind: "syntax", severity: "error", message: "Unterminated quoted text.",
        location: { line: 1, column: 7 }, suggestion: "Add a closing double quote on the same line."
      }]
    });
  });
}

test("raw attribute helper preserves quoted separators and decoded text", /**
 * Verify raw attribute helper preserves quoted separators and decoded text; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseAttributeTokens(['note="A=B # \\"C\\""', 'empty=""'], { line: 4, column: 3 }), {
    attributes: { note: 'A=B # "C"', empty: "" }, diagnostics: []
  });
});

test("raw attribute helper reports malformed quotes without partial attributes", /**
 * Verify raw attribute helper reports malformed quotes without partial attributes; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.parseAttributeTokens(["distance=1m", 'note="Open'], { line: 4, column: 3 });
  assert.deepEqual({ attributes: result.attributes, location: result.diagnostics[0].location }, {
    attributes: {}, location: { line: 4, column: 20 }
  });
});

test("empty route names still fail domain validation", /**
 * Verify empty route names still fail domain validation; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute('route ""').ok, false);
});

test("quoted text survives normalization and JSON export without being decoded twice", /**
 * Verify quoted text survives normalization and JSON export without being decoded twice; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "Cañón"\nstart "A=B"\nnote "A\\\\nB \\"C\\""');
  assert.equal(JSON.parse(result.json).elements[1].extensions.text, 'A\\nB "C"');
});

test("repeated parses have identical text and locations", /**
 * Verify repeated parses have identical text and locations; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const source = 'route "A=B"\nmetadata note="E\\\\F"\n\tstart "C # D"';
  assert.deepEqual(core.parseVrl(source), core.parseVrl(source));
});

for (const count of [1, 3, 5]) {
  test("odd backslash run " + count + " escapes the closing quote", /**
   * Verify odd backslash run " + count + " escapes the closing quote; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.parseVrl('route "Context"\nnote "X' + "\\".repeat(count) + '"');
    assert.equal(result.diagnostics[0].message, "Unterminated quoted text.");
  });
}

for (const count of [2, 4, 6, 10000]) {
  test("even backslash run " + count + " preserves literal backslashes", /**
   * Verify even backslash run " + count + " preserves literal backslashes; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.parseVrl('route "Context"\nnote "X' + "\\".repeat(count) + '"');
    assert.deepEqual({ text: result.ast.elements[0].attributes.text, diagnostics: result.diagnostics }, {
      text: "X" + "\\".repeat(count / 2), diagnostics: []
    });
  });
}

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState]]) {
  test(name + " returns diagnostics and no SVG for unfinished text", /**
   * Verify name + " returns diagnostics and no SVG for unfinished text; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create('route "A"\nwalk distance=1m note="Open');
    assert.deepEqual({ ok: state.ok, svg: state.svg, model: state.model, location: state.diagnostics[0].location }, {
      ok: false, svg: "", model: null, location: { line: 2, column: 23 }
    });
  });
}
