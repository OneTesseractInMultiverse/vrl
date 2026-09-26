import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SEED, parseSeed, seededRandom, routeCases, malformedCases } from "./helpers/seeded-cases.js";
import { xmlDocument, nonfinitePaths, clippedBounds } from "./helpers/invariant-observations.js";

test("the generator has a fixed replay sequence", /**
 * Verify the generator has a fixed replay sequence; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const next = seededRandom(1);
  assert.deepEqual(Array.from({ length: 5 }, /**
   * Apply next to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @returns {unknown} The result returned by next.
   */ () => next(1000)), [748, 467, 38, 565, 232]);
});
test("the same seed reproduces sources and expected facts", /**
 * Verify the same seed reproduces sources and expected facts; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(routeCases(DEFAULT_SEED), routeCases(DEFAULT_SEED));
});
test("different seeds vary the generated route measurements", /**
 * Verify different seeds vary the generated route measurements; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.notDeepEqual(routeCases(1).map(/**
   * Project item.events from the current record.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The item.events value selected or validated above.
   */ item => item.events), routeCases(2).map(/**
   * Project item.events from the current record.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The item.events value selected or validated above.
   */ item => item.events));
});
test("the bounded corpus includes all technical types and shapes", /**
 * Verify the bounded corpus includes all technical types and shapes; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const events = routeCases(DEFAULT_SEED).flatMap(/**
   * Project item.events from the current record.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The item.events value selected or validated above.
   */ item => item.events);
  assert.deepEqual([[...new Set(events.map(/**
   * Project event.type from the current record.
   * @responsibility computation
   * @param {unknown} event - SvelteKit request event or independently specified technical event.
   * @returns {unknown} The event.type value selected or validated above.
   */ event => event.type))].sort(), [...new Set(events.map(/**
   * Project event.shape from the current record.
   * @responsibility computation
   * @param {unknown} event - SvelteKit request event or independently specified technical event.
   * @returns {unknown} The event.shape value selected or validated above.
   */ event => event.shape))].sort()], [["climb", "downclimb", "rappel"], ["direct", "ladder", "slab"]]);
});
test("malformed mutations have stable kinds and diagnostic oracles", /**
 * Verify malformed mutations have stable kinds and diagnostic oracles; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(malformedCases(DEFAULT_SEED, 1).map(/**
   * Project the current entry into an ordered tuple for malformedCases(DEFAULT_SEED, 1).map.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {Array} The ordered records or values assembled above.
   */ item => [item.kind, item.code]), [
    ["duplicate-field", "VRL_SYNTAX_DUPLICATE_ATTRIBUTE"], ["unterminated", "VRL_LEX_UNTERMINATED_STRING"],
    ["missing-value", "VRL_LEX_MISSING_VALUE"], ["unknown-unit", "VRL_FIELD_MEASUREMENT_SYNTAX"],
    ["zero-height", "VRL_FIELD_MEASUREMENT_RANGE"], ["duplicate-id", "VRL_IDENTIFIER_DUPLICATE"], ["late-metadata", "VRL_SYNTAX_METADATA_ORDER"]
  ]);
});
for (const seed of ["0", "4294967295", "0xffffffff", "1"]) {
  test(`valid replay seed ${seed}`, /**
   * Verify valid replay seed ${seed}; arrange the scenario and make its single direct assertion. Assertion and
   * setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(parseSeed(seed), Number(seed));
  });
}
for (const seed of ["", "-1", "4294967296", "1.1", "NaN", "garbage"]) {
  test(`invalid replay seed ${seed} fails clearly`, /**
   * Verify invalid replay seed ${seed} fails clearly; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise parseSeed so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by parseSeed.
     */ () => parseSeed(seed), { name: "TypeError", message: "VRL_TEST_SEED must be an unsigned 32-bit integer (decimal or hex)." });
  });
}

test("the XML oracle decodes valid entities exactly once", /**
 * Verify the XML oracle decodes valid entities exactly once; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(xmlDocument('<svg xmlns="http://www.w3.org/2000/svg"><title>&amp; &amp;amp; &#13;</title></svg>').getElementsByTagName("title")[0].textContent, "& &amp; \r");
});
for (const text of ["A & B", "&unknown;", "&#xZZ;"]) {
  test(`the XML oracle rejects invalid references: ${text}`, /**
   * Verify the XML oracle rejects invalid references: ${text}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise xmlDocument so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by xmlDocument.
     */ () => xmlDocument(`<svg><title>${text}</title></svg>`), { name: "SyntaxError", message: "Unescaped XML entity reference." });
  });
}
test("the numeric oracle finds nested nonfinite values without treating shared references as new data", /**
 * Verify the numeric oracle finds nested nonfinite values without treating shared references as new data;
 * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
 * test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const shared = { x: NaN }; const data = { first: shared, second: shared, rows: [Infinity], valid: 0 }; data.self = data;
  assert.deepEqual(nonfinitePaths(data), ["$.first.x", "$.rows.0"]);
});
test("the bounds oracle distinguishes contained boundaries from clipping", /**
 * Verify the bounds oracle distinguishes contained boundaries from clipping; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const edge = { minX: -5, minY: -5, maxX: 5, maxY: 5 };
  const clipped = { ...edge, maxX: 6 };
  assert.deepEqual(clippedBounds({ viewBox: { x: -5, y: -5, width: 10, height: 10 }, contentBounds: edge, infoBox: { bounds: clipped }, bounds: edge }), [clipped]);
});
