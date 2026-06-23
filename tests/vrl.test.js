import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as core from "@vrl/core";
import * as svg from "@vrl/render-svg";
import { createVrlDiagramComponent } from "@vrl/react";
import { renderVrlSvelteMarkup } from "@vrl/svelte";

const VALID_SOURCE = `route "Rio Azul"
metadata country="Costa Rica" region="Cartago" difficulty="V4 A3 III"
start "Entrance"
walk distance=120m note="Riverbed approach"
rappel "R1" height=35m rope=70m anchor=bolts note="Waterfall line"
pool type=deep
downclimb "D1" height=4m exposure=medium
hazard type=swift_water severity=high note="Avoid after heavy rain"
exit "Left bank trail"`;

function validCompiled() {
  return core.compileRoute(VALID_SOURCE);
}

test("createDiagnostic builds structured diagnostics", () => {
  assert.deepEqual(core.createDiagnostic("syntax", "error", "Bad", { line: 1, column: 2 }), {
    kind: "syntax",
    severity: "error",
    message: "Bad",
    location: { line: 1, column: 2 },
    suggestion: ""
  });
});

test("formatDiagnostic includes suggestions", () => {
  assert.equal(
    core.formatDiagnostic(core.createDiagnostic("validation", "warning", "Check", { line: 2, column: 3 }, "Review.")),
    "WARNING validation at 2:3: Check Suggestion: Review."
  );
});

test("formatDiagnostic omits empty suggestions", () => {
  assert.equal(
    core.formatDiagnostic(core.createDiagnostic("syntax", "error", "Bad", { line: 1, column: 1 })),
    "ERROR syntax at 1:1: Bad"
  );
});

test("hasBlockingDiagnostics returns true for errors", () => {
  assert.equal(core.hasBlockingDiagnostics([core.createDiagnostic("syntax", "error", "Bad", { line: 1, column: 1 })]), true);
});

test("hasBlockingDiagnostics returns false for warnings", () => {
  assert.equal(core.hasBlockingDiagnostics([core.createDiagnostic("validation", "warning", "Check", { line: 1, column: 1 })]), false);
});

test("isMeasurementField recognizes route measurements", () => {
  assert.equal(core.isMeasurementField("height"), true);
});

test("isMeasurementField rejects ordinary fields", () => {
  assert.equal(core.isMeasurementField("anchor"), false);
});

test("parseMeasurementToken parses meters", () => {
  assert.deepEqual(core.parseMeasurementToken("35m"), { ok: true, value: { value: 35, unit: "m", meters: 35 } });
});

test("parseMeasurementToken rejects feet", () => {
  assert.deepEqual(core.parseMeasurementToken("35ft"), { ok: false, reason: "expected metric measurement such as 35m" });
});

test("normalizeAttributeValue leaves text fields unchanged", () => {
  assert.equal(core.normalizeAttributeValue("anchor", "bolts"), "bolts");
});

test("normalizeAttributeValue converts measurement fields", () => {
  assert.deepEqual(core.normalizeAttributeValue("rope", "70m"), { value: 70, unit: "m", meters: 70 });
});

test("normalizeAttributeValue leaves invalid measurement text unchanged", () => {
  assert.equal(core.normalizeAttributeValue("rope", "seventy"), "seventy");
});

test("createEmptyRoute defaults to empty source", () => {
  assert.deepEqual(core.createEmptyRoute(), { name: null, metadata: {}, elements: [], source: "" });
});

test("createRouteElement stores defaults", () => {
  assert.deepEqual(core.createRouteElement("walk", {}, { line: 1, column: 1 }), {
    type: "walk",
    id: null,
    label: null,
    attributes: {},
    sourceLocation: { line: 1, column: 1 }
  });
});

test("normalizeAttributes converts measurement attributes", () => {
  assert.deepEqual(core.normalizeAttributes({ distance: "120m", note: "Approach" }), {
    distance: { value: 120, unit: "m", meters: 120 },
    note: "Approach"
  });
});

test("normalizeElement generates identifiers", () => {
  assert.equal(core.normalizeElement(core.createRouteElement("walk", {}, { line: 1, column: 1 }), {}).id, "W1");
});

test("normalizeElement preserves explicit identifiers", () => {
  assert.equal(core.normalizeElement(core.createRouteElement("rappel", {}, { line: 1, column: 1 }, "R9"), {}).id, "R9");
});

test("normalizeElement increments existing counters", () => {
  assert.equal(core.normalizeElement(core.createRouteElement("walk", {}, { line: 1, column: 1 }), { walk: 1 }).id, "W2");
});

test("summarizeRoute handles empty routes", () => {
  assert.deepEqual(core.summarizeRoute([]), {
    numberOfRappels: 0,
    numberOfHazards: 0,
    highestRappelMeters: 0,
    requiredRopeMeters: 0,
    totalDistanceMeters: 0
  });
});

test("summarizeRoute ignores non-normalized measurements", () => {
  assert.equal(core.summarizeRoute([core.createRouteElement("rappel", { height: "bad" }, { line: 1, column: 1 })]).highestRappelMeters, 0);
});

test("summarizeRoute ignores missing walk distance", () => {
  assert.equal(core.summarizeRoute([core.createRouteElement("walk", {}, { line: 1, column: 1 })]).totalDistanceMeters, 0);
});

test("normalizeRoute computes route summary", () => {
  assert.equal(validCompiled().model.summary.requiredRopeMeters, 70);
});

test("stripComment removes comments outside quotes", () => {
  assert.equal(core.stripComment('note "Keep # marker" # remove'), 'note "Keep # marker" ');
});

test("stripComment preserves escaped quote content", () => {
  assert.equal(core.stripComment('note "Keep \\" # marker" # remove'), 'note "Keep \\" # marker" ');
});

test("tokenize keeps quoted attribute values together", () => {
  assert.deepEqual(core.tokenize('walk distance=120m note="Riverbed approach"'), ["walk", "distance=120m", 'note="Riverbed approach"']);
});

test("tokenize handles escaped quotes", () => {
  assert.deepEqual(core.tokenize('note "Use \\"R1\\""'), ["note", '"Use \\"R1\\""']);
});

test("parseAttributeTokens parses key values", () => {
  assert.deepEqual(core.parseAttributeTokens(['note="Main line"'], { line: 1, column: 1 }).attributes, { note: "Main line" });
});

test("parseAttributeTokens rejects missing separators", () => {
  assert.equal(core.parseAttributeTokens(["height"], { line: 1, column: 1 }).diagnostics.length, 1);
});

test("parseAttributeTokens rejects missing keys", () => {
  assert.equal(core.parseAttributeTokens(["=35m"], { line: 1, column: 1 }).diagnostics.length, 1);
});

test("parseAttributeTokens rejects missing values", () => {
  assert.equal(core.parseAttributeTokens(["height="], { line: 1, column: 1 }).diagnostics.length, 1);
});

test("parseVrl reads a route name", () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.name, "Rio Azul");
});

test("parseVrl merges metadata attributes", () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.metadata.region, "Cartago");
});

test("parseVrl reads start labels", () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.elements[0].label, "Entrance");
});

test("parseVrl reads explicit element identifiers", () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.elements[2].id, "R1");
});

test("parseVrl parses note text", () => {
  assert.equal(core.parseVrl('route "A"\nnote "Low water only"').ast.elements[0].attributes.text, "Low water only");
});

test("parseVrl allows trailing block braces", () => {
  assert.equal(core.parseVrl('route "A" {\n}').diagnostics.length, 0);
});

test("parseVrl reports missing route names", () => {
  assert.equal(core.parseVrl("route").diagnostics[0].message, "Route statement requires a route name.");
});

test("parseVrl reports bad metadata attributes", () => {
  assert.equal(core.parseVrl('route "A"\nmetadata country').diagnostics.length, 1);
});

test("parseVrl reports unknown statements", () => {
  assert.equal(core.parseVrl('route "A"\nteleport now').diagnostics[0].kind, "syntax");
});

test("validateRoute accepts the valid source AST", () => {
  assert.equal(core.validateRoute(core.parseVrl(VALID_SOURCE).ast).length, 0);
});

test("validateRoute rejects missing names", () => {
  assert.equal(core.validateRoute(core.createEmptyRoute()).length, 1);
});

test("validateElement rejects invalid measurement text", () => {
  assert.equal(core.validateElement(core.createRouteElement("walk", { distance: "far" }, { line: 1, column: 1 }))[0].message, 'Field "distance" must be a metric measurement.');
});

test("validateElement rejects nonpositive measurements", () => {
  assert.equal(core.validateElement(core.createRouteElement("walk", { distance: "0m" }, { line: 1, column: 1 }))[0].message, 'Field "distance" must be greater than 0m.');
});

test("validateElement requires rappel height", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { rope: "30m" }, { line: 1, column: 1 }))[0].message, 'Rappel requires "height".');
});

test("validateElement requires rappel rope", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "30m" }, { line: 1, column: 1 }))[0].message, 'Rappel requires "rope".');
});

test("validateElement rejects unsupported anchors", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "30m", rope: "60m", anchor: "plastic" }, { line: 1, column: 1 }))[0].message, 'Field "anchor" has unsupported value "plastic".');
});

test("validateElement warns when rope is shorter than rappel height", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "30m", anchor: "bolts" }, { line: 1, column: 1 }))[0].severity, "warning");
});

test("validateElement skips rope comparison when measurement is invalid", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "bad", rope: "30m", anchor: "bolts" }, { line: 1, column: 1 })).length, 1);
});

test("validateElement accepts valid downclimb exposure", () => {
  assert.equal(core.validateElement(core.createRouteElement("downclimb", { height: "4m", exposure: "medium" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects invalid downclimb exposure", () => {
  assert.equal(core.validateElement(core.createRouteElement("downclimb", { exposure: "wild" }, { line: 1, column: 1 }))[0].message, 'Field "exposure" has unsupported value "wild".');
});

test("validateElement accepts valid pool type", () => {
  assert.equal(core.validateElement(core.createRouteElement("pool", { type: "deep" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects invalid pool type", () => {
  assert.equal(core.validateElement(core.createRouteElement("pool", { type: "boiling" }, { line: 1, column: 1 }))[0].message, 'Field "type" has unsupported value "boiling".');
});

test("validateElement accepts valid hazard severity", () => {
  assert.equal(core.validateElement(core.createRouteElement("hazard", { severity: "critical" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects invalid hazard severity", () => {
  assert.equal(core.validateElement(core.createRouteElement("hazard", { severity: "extreme" }, { line: 1, column: 1 }))[0].message, 'Field "severity" has unsupported value "extreme".');
});

test("computeVerticalLayout creates one node per element", () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model).nodes.length, 7);
});

test("computeVerticalLayout handles empty models", () => {
  assert.equal(core.computeVerticalLayout({ elements: [] }).height, 96);
});

test("computeVerticalLayout respects width options", () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model, { width: 720 }).width, 720);
});

test("elementVisualWeight uses known weights", () => {
  assert.equal(core.elementVisualWeight({ type: "rappel" }), 1.25);
});

test("elementVisualWeight defaults unknown elements", () => {
  assert.equal(core.elementVisualWeight({ type: "unknown" }), 1);
});

test("resolveTheme returns dark tokens", () => {
  assert.equal(svg.resolveTheme("dark").background, "#14171a");
});

test("resolveTheme applies overrides", () => {
  assert.equal(svg.resolveTheme("light", { background: "#eeeeee" }).background, "#eeeeee");
});

test("renderTopoSvg includes an accessible title", () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /<title>Rio Azul topo<\/title>/);
});

test("renderTopoSvg passes Spanish symbology options", () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout, { symbology: "spanish" }), />P<\/text>/);
});

test("renderNode renders hazard symbols", () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[5], svg.resolveTheme()), /vrl-symbol-hazard/);
});

test("renderNode renders standard federation symbols", () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[0], svg.resolveTheme()), />IN<\/text>/);
});

test("formatElementTitle falls back to element type", () => {
  assert.equal(svg.formatElementTitle({ type: "custom", id: null, label: null }), "custom");
});

test("formatElementTitle includes generated identifiers", () => {
  assert.equal(svg.formatElementTitle(validCompiled().model.elements[2]), "Rappel R1");
});

test("formatElementDetail formats rappel details", () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[2]), "35m / 70m / bolts");
});

test("formatElementDetail formats walk details", () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[1]), "120m");
});

test("formatElementDetail formats downclimb details", () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[4]), "4m / medium");
});

test("formatElementDetail formats note details", () => {
  assert.equal(svg.formatElementDetail(core.normalizeRoute(core.parseVrl('route "A"\nnote "Low water"').ast).elements[0]), "Low water");
});

test("formatElementDetail handles empty note details", () => {
  assert.equal(svg.formatElementDetail({ type: "note", attributes: {} }), "");
});

test("formatElementDetail formats default note attributes", () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[5]), "Avoid after heavy rain");
});

test("formatElementDetail formats default type attributes", () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[3]), "deep");
});

test("formatElementDetail returns empty detail for unknown empty elements", () => {
  assert.equal(svg.formatElementDetail({ type: "custom", attributes: {} }), "");
});

test("formatMeasurement rejects non-measurements", () => {
  assert.equal(svg.formatMeasurement("35m"), "");
});

test("renderNode uses fallback colors for unknown elements", () => {
  assert.match(svg.renderNode({ id: "X1", element: { type: "custom", id: "X1", label: null, attributes: {} }, x: 10, y: 10 }, svg.resolveTheme()), /fill="#59656f"/);
});

test("renderSymbolMarker renders snake extension glyphs", () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 10 }, { type: "hazard", id: "H1", attributes: { type: "snake" } }, "#b42318"), /vrl-symbol-snake/);
});

test("formatElementDetail handles partial rappel details", () => {
  assert.equal(svg.formatElementDetail({ type: "rappel", attributes: { height: { meters: 12 } } }), "12m");
});

test("formatElementDetail handles empty downclimb details", () => {
  assert.equal(svg.formatElementDetail({ type: "downclimb", attributes: {} }), "");
});

test("resolveSymbolProfile returns known profiles", () => {
  assert.equal(svg.resolveSymbolProfile("spanish").pool, "P");
});

test("resolveSymbolProfile defaults unknown profiles", () => {
  assert.equal(svg.resolveSymbolProfile("unknown").pool, "V");
});

test("symbolCode uses federation rappel code", () => {
  assert.equal(svg.symbolCode(validCompiled().model.elements[2]), "R");
});

test("symbolCode uses Spanish pool code", () => {
  assert.equal(svg.symbolCode(validCompiled().model.elements[3], "spanish"), "P");
});

test("symbolCode uses fallback element identifiers", () => {
  assert.equal(svg.symbolCode({ type: "custom", id: "X9", attributes: {} }), "X9");
});

test("symbolCode uses unknown fallback for missing identifiers", () => {
  assert.equal(svg.symbolCode({ type: "custom", id: null, attributes: {} }), "?");
});

test("symbolCode uses snake extension code", () => {
  assert.equal(svg.symbolCode({ type: "hazard", id: "H1", attributes: { type: "snake_dense_area" } }), "SN");
});

test("isSnakeHazard detects snake hazard types", () => {
  assert.equal(svg.isSnakeHazard({ type: "hazard", attributes: { type: "serpiente" } }), true);
});

test("isSnakeHazard rejects non-hazard snake attributes", () => {
  assert.equal(svg.isSnakeHazard({ type: "note", attributes: { type: "snake" } }), false);
});

test("isSnakeHazard rejects ordinary hazards", () => {
  assert.equal(svg.isSnakeHazard({ type: "hazard", attributes: { type: "swift_water" } }), false);
});

test("symbolKind identifies snake extensions", () => {
  assert.equal(svg.symbolKind({ type: "hazard", attributes: { type: "snake" } }), "snake");
});

test("symbolKind identifies ordinary hazards", () => {
  assert.equal(svg.symbolKind({ type: "hazard", attributes: { type: "swift_water" } }), "hazard");
});

test("symbolKind identifies standard symbols", () => {
  assert.equal(svg.symbolKind({ type: "rappel", attributes: {} }), "standard");
});

test("escapeXml escapes markup characters", () => {
  assert.equal(svg.escapeXml('<a b="c">&'), "&lt;a b=&quot;c&quot;&gt;&amp;");
});

test("compileRoute returns ok for valid input", () => {
  assert.equal(validCompiled().ok, true);
});

test("compileRoute returns invalid for syntax errors", () => {
  assert.equal(core.compileRoute("teleport").ok, false);
});

test("compileRoute includes JSON export", () => {
  assert.match(validCompiled().json, /"requiredRopeMeters": 70/);
});

test("createRouteCompiler accepts injected layout ports", () => {
  assert.equal(core.createRouteCompiler({ layout: () => ({ width: 1 }) })(VALID_SOURCE).layout.width, 1);
});

test("compileRouteWithDependencies accepts injected export ports", () => {
  assert.equal(core.compileRouteWithDependencies("", {}, {
    parse: () => ({ ast: { name: "A", metadata: {}, elements: [] }, diagnostics: [] }),
    validate: () => [],
    normalize: () => ({ name: "A", elements: [] }),
    layout: () => ({ height: 1 }),
    exportJson: () => "json"
  }).json, "json");
});

test("exportRouteJson serializes models", () => {
  assert.equal(core.exportRouteJson({ name: "A" }), '{\n  "name": "A"\n}');
});

test("createVrlDiagramComponent requires React", () => {
  assert.throws(() => createVrlDiagramComponent(null), TypeError);
});

test("createVrlDiagramComponent requires createElement", () => {
  assert.throws(() => createVrlDiagramComponent({}), TypeError);
});

test("React adapter renders valid SVG containers", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE }).type, "div");
});

test("React adapter renders diagnostics", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: "teleport" }).type, "pre");
});

test("Svelte helper renders valid SVG markup", () => {
  assert.match(renderVrlSvelteMarkup(VALID_SOURCE), /class="vrl-diagram"/);
});

test("Svelte helper renders diagnostics", () => {
  assert.match(renderVrlSvelteMarkup("teleport"), /vrl-diagram__diagnostics/);
});

test("example route compiles", () => {
  assert.equal(core.compileRoute(readFileSync(new URL("../examples/rio-azul.vrl", import.meta.url), "utf8")).ok, true);
});
