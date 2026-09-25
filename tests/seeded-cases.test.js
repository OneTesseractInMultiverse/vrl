import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SEED, parseSeed, seededRandom, routeCases, malformedCases } from "./helpers/seeded-cases.js";
import { xmlDocument, nonfinitePaths, clippedBounds } from "./helpers/invariant-observations.js";

test("the generator has a fixed replay sequence", () => {
  const next = seededRandom(1);
  assert.deepEqual(Array.from({ length: 5 }, () => next(1000)), [748, 467, 38, 565, 232]);
});
test("the same seed reproduces sources and expected facts", () => {
  assert.deepEqual(routeCases(DEFAULT_SEED), routeCases(DEFAULT_SEED));
});
test("different seeds vary the generated route measurements", () => {
  assert.notDeepEqual(routeCases(1).map(item => item.events), routeCases(2).map(item => item.events));
});
test("the bounded corpus includes all technical types and shapes", () => {
  const events = routeCases(DEFAULT_SEED).flatMap(item => item.events);
  assert.deepEqual([[...new Set(events.map(event => event.type))].sort(), [...new Set(events.map(event => event.shape))].sort()], [["climb", "downclimb", "rappel"], ["direct", "ladder", "slab"]]);
});
test("malformed mutations have stable kinds and diagnostic oracles", () => {
  assert.deepEqual(malformedCases(DEFAULT_SEED, 1).map(item => [item.kind, item.code]), [
    ["duplicate-field", "VRL_SYNTAX_DUPLICATE_ATTRIBUTE"], ["unterminated", "VRL_LEX_UNTERMINATED_STRING"],
    ["missing-value", "VRL_LEX_MISSING_VALUE"], ["unknown-unit", "VRL_FIELD_MEASUREMENT_SYNTAX"],
    ["zero-height", "VRL_FIELD_MEASUREMENT_RANGE"], ["duplicate-id", "VRL_IDENTIFIER_DUPLICATE"], ["late-metadata", "VRL_SYNTAX_METADATA_ORDER"]
  ]);
});
for (const seed of ["0", "4294967295", "0xffffffff", "1"]) {
  test(`valid replay seed ${seed}`, () => {
    assert.equal(parseSeed(seed), Number(seed));
  });
}
for (const seed of ["", "-1", "4294967296", "1.1", "NaN", "garbage"]) {
  test(`invalid replay seed ${seed} fails clearly`, () => {
    assert.throws(() => parseSeed(seed), { name: "TypeError", message: "VRL_TEST_SEED must be an unsigned 32-bit integer (decimal or hex)." });
  });
}

test("the XML oracle decodes valid entities exactly once", () => {
  assert.equal(xmlDocument('<svg xmlns="http://www.w3.org/2000/svg"><title>&amp; &amp;amp; &#13;</title></svg>').getElementsByTagName("title")[0].textContent, "& &amp; \r");
});
for (const text of ["A & B", "&unknown;", "&#xZZ;"]) {
  test(`the XML oracle rejects invalid references: ${text}`, () => {
    assert.throws(() => xmlDocument(`<svg><title>${text}</title></svg>`), { name: "SyntaxError", message: "Unescaped XML entity reference." });
  });
}
test("the numeric oracle finds nested nonfinite values without treating shared references as new data", () => {
  const shared = { x: NaN }; const data = { first: shared, second: shared, rows: [Infinity], valid: 0 }; data.self = data;
  assert.deepEqual(nonfinitePaths(data), ["$.first.x", "$.rows.0"]);
});
test("the bounds oracle distinguishes contained boundaries from clipping", () => {
  const edge = { minX: -5, minY: -5, maxX: 5, maxY: 5 };
  const clipped = { ...edge, maxX: 6 };
  assert.deepEqual(clippedBounds({ viewBox: { x: -5, y: -5, width: 10, height: 10 }, contentBounds: edge, infoBox: { bounds: clipped }, bounds: edge }), [clipped]);
});
