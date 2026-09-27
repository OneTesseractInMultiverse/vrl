import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
import { documentFor } from "./helpers/svg-bounds.js";

const cases = [
  { name: "canyon-dry", technical: [["R1", "down", -12], ["D1", "down", -3]], notes: [], facts: ["Declared rope: 30m", "Anchor count: 2", "Walking distance: 25m"] },
  { name: "canyon-aquatic-notes", technical: [["R1", "down", -10]], notes: ["Jump and slide alternatives are mentioned; choice, dimensions and applicability are unmodeled."], facts: ["Measured pool depth: unknown", "Swimming described; traversal distance and measured pool depth unknown.", "Fictional water observation; date and current conditions unknown."] },
  { name: "canyon-approach-return", technical: [["R1", "down", -8]], notes: ["Approach begins; phase boundaries are descriptive only.", "Canyon entry. Escape candidate near R1; destination and connection are unresolved.", "Return begins; no alternative or escape edge is implied."], facts: ["Walking distance: 100m", "Walking distance: 50m", "Declared rope: 20m"] }
];
for (const fixture of cases) {
  test(`${fixture.name} retains JSON/text observations without inventing technical movements`, /**
   * Compile the independent canyon fixture, inspect exported JSON and decode the actual SVG description.
   * Assert the exact technical owners/deltas and documentary notes alongside every required description fact.
   * @responsibility coordinator
   * @returns {void} Completes one assertion; missing artifacts or malformed XML propagate as failures.
   */ () => {
    const source = readFileSync(new URL(`../examples/${fixture.name}.vrl`, import.meta.url), "utf8");
    const result = compileRoute(source, { layout: { width: 320 } });
    const model = JSON.parse(result.json), technical = [], notes = [];
    for (const segment of model.traversal.segments) if (segment.kind === "technical") technical.push([model.elements[segment.elementIndex].id, segment.direction, segment.verticalDeltaMeters]);
    for (const element of model.elements) if (element.type === "note") notes.push(element.extensions.text);
    const document = documentFor(renderTopoSvg(result.model, result.layout, { style: "soft-terrain", flow: "rows", monochrome: true }));
    const description = document.getElementsByTagName("desc")[0].textContent, absent = [];
    for (const fact of [...fixture.facts, ...fixture.notes]) if (!description.includes(fact)) absent.push(fact);
    assert.deepEqual({ ok: result.ok, diagnostics: result.diagnostics, technical, notes, absent }, { ok: true, diagnostics: [], technical: fixture.technical, notes: fixture.notes, absent: [] });
  });
}
for (const keyword of ["jump", "slide", "traverse", "approach", "return", "escape"]) {
  test(`canyon scope does not silently accept the deferred ${keyword} keyword`, /**
   * Reject a proposed unsupported statement before constructing a model or serialized output.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the explicit syntax failure and short-circuit boundary.
   */ () => {
    const result = compileRoute(`route "Synthetic unsupported scope"\n${keyword} X1`);
    assert.deepEqual([result.ok, result.diagnostics.length, result.diagnostics[0].code, result.model, result.json], [false, 1, "VRL_SYNTAX_UNKNOWN_STATEMENT", null, null]);
  });
}
