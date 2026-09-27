import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute } from "@subvertic/vrl-core";

const corpus = JSON.parse(readFileSync(new URL("../docs/research/cases/davis-first-three.json", import.meta.url), "utf8"));
const invalid = [
  ["missing documentary measurements", "rappel R1 anchor=bolts anchor_count=2", ["VRL_FIELD_REQUIRED", "VRL_FIELD_REQUIRED"]],
  ["unsupported unit labels", "rappel R1 height=8ft rope=16ft", ["VRL_FIELD_MEASUREMENT_SYNTAX", "VRL_FIELD_MEASUREMENT_SYNTAX"]],
  ["unknown climb height remains unsupported", "climb C1 height=unknown", ["VRL_FIELD_MEASUREMENT_SYNTAX"]],
  ["zero cannot substitute for unknown", "rappel R1 height=0m rope=0m", ["VRL_FIELD_MEASUREMENT_RANGE", "VRL_FIELD_MEASUREMENT_RANGE"]],
  ["contradictory count declarations", "rappel R1 height=8m rope=16m anchor_count=2 anchor_count=3", ["VRL_SYNTAX_DUPLICATE_ATTRIBUTE"]],
  ["unadopted movement keyword", "swim S2 distance=5m", ["VRL_SYNTAX_UNKNOWN_STATEMENT"]]
];
for (const [name, statement, codes] of invalid) {
  test(`research conversion boundary rejects ${name} without downstream output`, /**
   * Compile a deliberately incomplete or malformed research candidate and verify both its located error
   * categories and absent downstream artifacts. Expected codes come from the documented field contract.
   * @responsibility coordinator
   * @returns {void} Completes one assertion; setup and compiler failures propagate.
   */ () => {
    const result = compileRoute(`route "Synthetic conversion probe"\n${statement}`);
    assert.deepEqual({ ok: result.ok, diagnostics: result.diagnostics.map(/**
     * Select the error identity and source line without weakening the downstream-output assertion.
     * @responsibility computation
     * @param {Object} diagnostic - Compiler diagnostic with code, severity and source location.
     * @returns {Array} Code, severity and line in stable diagnostic order.
     */ diagnostic => [diagnostic.code, diagnostic.severity, diagnostic.location.line]), model: result.model, layout: result.layout, json: result.json },
    { ok: false, diagnostics: codes.map(/**
     * Construct the independently declared expected error tuple for this two-line synthetic input.
     * @responsibility computation
     * @param {string} code - Expected contract diagnostic code for the selected fault.
     * @returns {Array} Expected code, error severity and second source line.
     */ code => [code, "error", 2]), model: null, layout: null, json: null });
  });
}

test("documentary JSON carried as notes preserves facts but supplies no technical traversal", /**
 * Carry the same complete scoped facts and inferred relationships through explicit documentary notes.
 * Compare decoded JSON with the independent corpus; also prove this container is not a rappel model.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of documentary fidelity and absent technical motion.
 */ () => {
  const records = [...corpus.facts, ...corpus.relationships];
  const lines = records.map(/**
   * Quote a JSON evidence record as literal VRL note text. The outer quoting escapes the inner JSON's
   * quotes and backslashes; the parser does not interpret its evidence claims or invent domain meaning.
   * @responsibility computation
   * @param {Object} record - Original scoped fact or inferred relationship with evidence status.
   * @returns {string} One syntactically escaped note statement.
   */ record => `note ${JSON.stringify(JSON.stringify(record))}`);
  const result = compileRoute(`route "Davis documentary container; no measured profile"\n${lines.join("\n")}`);
  const exported = JSON.parse(result.json);
  assert.deepEqual({ ok: result.ok, records: exported.elements.map(/**
   * Decode the literal documentary record after the compiler's JSON export boundary.
   * @responsibility computation
   * @param {Object} element - Exported note whose text contains one JSON evidence record.
   * @returns {Object} Uninterpreted original record, including unknowns and evidence classification.
   */ element => JSON.parse(element.extensions.text)), segments: exported.traversal.segments, rappels: exported.summary.numberOfRappels },
  { ok: true, records, segments: [], rappels: 0 });
});

test("syntactically valid invented measurements are outside compiler source-truth validation", /**
 * Demonstrate the negative finding: the compiler validates declared values, not their truth against an
 * external document. This synthetic control must not be described as a faithful Davis conversion.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of accepted declarations and their resulting physical delta.
 */ () => {
  const result = compileRoute('route "Synthetic invented-value control"\nrappel R1 height=8m rope=16m anchor=bolts anchor_count=2');
  assert.deepEqual({ ok: result.ok, diagnostics: result.diagnostics, height: result.model.elements[0].attributes.height.meters,
    rope: result.model.elements[0].attributes.rope.meters, delta: result.model.traversal.segments[0].verticalDeltaMeters },
  { ok: true, diagnostics: [], height: 8, rope: 16, delta: -8 });
});
