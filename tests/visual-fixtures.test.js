import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { compileRoute } from "@subvertic/vrl-core";
import { describeRoute } from "@subvertic/vrl-render-svg";
import { visualArtifacts } from "../scripts/visual/gallery.mjs";
import { documentFor } from "./helpers/svg-bounds.js";
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(readFileSync(new URL("tests/fixtures/visual/catalog.json", root), "utf8"));
for (const [name, expected] of Object.entries(catalog.fixtures)) {
  test(`visual source ${name} matches its independently reviewed facts and fingerprint`, /**
   * Compare ordered element kinds, signed technical deltas and complete required prose against the reviewed inventory.
   * @responsibility coordinator
   * @returns {void} Completes after a single assertion verifies source identity and semantic meaning.
   */ () => {
    const source = readFileSync(new URL(expected.source, root), "utf8"), result = compileRoute(source);
    const types = [], deltas = [], missing = [], diagnostics = [];
    for (const diagnostic of result.diagnostics) diagnostics.push([diagnostic.severity,diagnostic.code]);
    const expectedDiagnostics = [];
    for (const code of expected.warnings) expectedDiagnostics.push(["warning",code]);
    for (const element of result.model.elements) types.push(element.type);
    for (const segment of result.model.traversal.segments) if (segment.kind === "technical") deltas.push(segment.verticalDeltaMeters);
    const text = describeRoute(result.model).text;
    for (const fact of expected.facts) if (!text.includes(fact)) missing.push(fact);
    assert.deepEqual({sha256:createHash("sha256").update(source).digest("hex"),types,deltas,missing,diagnostics}, {sha256:expected.sha256,types:expected.types,deltas:expected.deltas,missing:[],diagnostics:expectedDiagnostics});
  });
}
for (const [name, contents] of visualArtifacts(root)) {
  test(`visual baseline ${name} is current and parseable`, /**
   * Verify the committed export against fresh deterministic output and independently parse its standalone SVG markup.
   * @responsibility coordinator
   * @returns {void} Completes after artifact equality and the SVG root contract are checked together.
   */ () => {
    const kind = name.endsWith(".svg") ? documentFor(contents).documentElement.tagName : "html";
    assert.deepEqual([readFileSync(new URL(`docs/assets/visual/${name}`, root), "utf8"),kind],[contents,name.endsWith(".svg") ? "svg" : "html"]);
  });
}
