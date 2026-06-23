import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as core from "@subvertic/core";
import * as svg from "@subvertic/render-svg";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/react";
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";
import { createVrlSvelteKitData, createVrlSvelteKitLoad } from "@subvertic/sveltekit";

const VALID_SOURCE = `route "Rio Azul"
metadata country="Costa Rica" region="Cartago" difficulty="V4 A3 III" entrance_elevation=1240m exit_elevation=1170m
start "Entrance"
walk distance=120m note="Riverbed approach"
rappel "R1" height=35m rope=70m traverse=50m anchor=bolts anchor_count=2 station=left landing=pool flow=medium shape=ladder inclination=80% stages=20m+15m redirections=12m:left,27m:right note="Waterfall line"
pool type=deep
downclimb "D1" height=4m exposure=medium anchor_count=1 station=right landing=ledge shape=ladder inclination=65%
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

test("isMeasurementField recognizes traverse measurements", () => {
  assert.equal(core.isMeasurementField("traverse"), true);
});

test("isMeasurementField recognizes elevation measurements", () => {
  assert.equal(core.isMeasurementField("entrance_elevation"), true);
});

test("isMeasurementField rejects ordinary fields", () => {
  assert.equal(core.isMeasurementField("anchor"), false);
});

test("isInclinationField recognizes inclination", () => {
  assert.equal(core.isInclinationField("inclination"), true);
});

test("isInclinationField rejects other fields", () => {
  assert.equal(core.isInclinationField("height"), false);
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

test("normalizeAttributeValue converts elevation fields", () => {
  assert.deepEqual(core.normalizeAttributeValue("exit_elevation", "1170m"), { value: 1170, unit: "m", meters: 1170 });
});

test("normalizeAttributeValue leaves invalid measurement text unchanged", () => {
  assert.equal(core.normalizeAttributeValue("rope", "seventy"), "seventy");
});

test("parseInclinationToken parses percent values", () => {
  assert.deepEqual(core.parseInclinationToken("75%"), { ok: true, value: { value: 75, unit: "%", percent: 75 } });
});

test("parseInclinationToken parses bare percent numbers", () => {
  assert.deepEqual(core.parseInclinationToken("75"), { ok: true, value: { value: 75, unit: "%", percent: 75 } });
});

test("parseInclinationToken rejects non-percent text", () => {
  assert.deepEqual(core.parseInclinationToken("steep"), { ok: false, reason: "expected inclination percentage such as 75%" });
});

test("normalizeInclinationValue converts inclination fields", () => {
  assert.deepEqual(core.normalizeInclinationValue("inclination", "65%"), { value: 65, unit: "%", percent: 65 });
});

test("normalizeInclinationValue leaves invalid inclination text unchanged", () => {
  assert.equal(core.normalizeInclinationValue("inclination", "steep"), "steep");
});

test("normalizeInclinationValue leaves other fields unchanged", () => {
  assert.equal(core.normalizeInclinationValue("shape", "ladder"), "ladder");
});

test("isRedirectionField recognizes plural redirections", () => {
  assert.equal(core.isRedirectionField("redirections"), true);
});

test("isRedirectionField recognizes singular redirection", () => {
  assert.equal(core.isRedirectionField("redirection"), true);
});

test("isRedirectionField rejects ordinary fields", () => {
  assert.equal(core.isRedirectionField("anchor"), false);
});

test("isRappelStagesField recognizes stages", () => {
  assert.equal(core.isRappelStagesField("stages"), true);
});

test("isRappelStagesField rejects height", () => {
  assert.equal(core.isRappelStagesField("height"), false);
});

test("parseRedirectionToken parses distance and side", () => {
  assert.deepEqual(core.parseRedirectionToken("12m:left"), { ok: true, value: { distance: { value: 12, unit: "m", meters: 12 }, side: "left" } });
});

test("parseRedirectionToken defaults missing side", () => {
  assert.deepEqual(core.parseRedirectionToken("12m"), { ok: true, value: { distance: { value: 12, unit: "m", meters: 12 }, side: "unknown" } });
});

test("parseRedirectionToken normalizes side casing", () => {
  assert.equal(core.parseRedirectionToken("12m:RIGHT").value.side, "right");
});

test("parseRedirectionToken rejects invalid distances", () => {
  assert.equal(core.parseRedirectionToken("far:left").ok, false);
});

test("parseRedirectionToken rejects extra separators", () => {
  assert.equal(core.parseRedirectionToken("12m:left:extra").ok, false);
});

test("parseRedirectionsToken parses comma-separated anchors", () => {
  assert.equal(core.parseRedirectionsToken("12m:left,27m:right").value.length, 2);
});

test("parseRedirectionsToken rejects empty lists", () => {
  assert.equal(core.parseRedirectionsToken("").ok, false);
});

test("parseRedirectionsToken rejects malformed anchors", () => {
  assert.equal(core.parseRedirectionsToken("far:left").ok, false);
});

test("parseRappelStagesToken parses plus-separated lengths", () => {
  assert.equal(core.parseRappelStagesToken("20m+15m").value.length, 2);
});

test("parseRappelStagesToken rejects single lengths", () => {
  assert.equal(core.parseRappelStagesToken("20m").ok, false);
});

test("parseRappelStagesToken rejects invalid stage lengths", () => {
  assert.equal(core.parseRappelStagesToken("20m+far").ok, false);
});

test("normalizeRappelDetailValue converts redirections", () => {
  assert.equal(core.normalizeRappelDetailValue("redirections", "12m:left").length, 1);
});

test("normalizeRappelDetailValue converts stages", () => {
  assert.equal(core.normalizeRappelDetailValue("stages", "20m+15m").length, 2);
});

test("normalizeRappelDetailValue leaves invalid stages unchanged", () => {
  assert.equal(core.normalizeRappelDetailValue("stages", "20m"), "20m");
});

test("normalizeRappelDetailValue leaves invalid redirections unchanged", () => {
  assert.equal(core.normalizeRappelDetailValue("redirections", "far:left"), "far:left");
});

test("normalizeRappelDetailValue leaves ordinary fields unchanged", () => {
  assert.equal(core.normalizeRappelDetailValue("anchor", "bolts"), "bolts");
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

test("normalizeAttributes converts redirection attributes", () => {
  assert.equal(core.normalizeAttributes({ redirections: "12m:left,27m:right" }).redirections.length, 2);
});

test("normalizeAttributes converts rappel stage attributes", () => {
  assert.equal(core.normalizeAttributes({ stages: "20m+15m" }).stages.length, 2);
});

test("normalizeElement generates identifiers", () => {
  assert.equal(core.normalizeElement(core.createRouteElement("walk", {}, { line: 1, column: 1 }), {}).id, "W1");
});

test("normalizeElement preserves explicit identifiers", () => {
  assert.equal(core.normalizeElement(core.createRouteElement("rappel", {}, { line: 1, column: 1 }, "R9"), {}).id, "R9");
});

test("normalizeElement generates climb identifiers", () => {
  assert.equal(core.normalizeElement(core.createRouteElement("climb", {}, { line: 1, column: 1 }), {}).id, "C1");
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
    totalDistanceMeters: 0,
    entranceElevationMeters: null,
    exitElevationMeters: null,
    totalElevationChangeMeters: 0
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

test("normalizeRoute computes elevation change summary", () => {
  assert.equal(validCompiled().model.summary.totalElevationChangeMeters, 70);
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

test("parseVrl reads climb elements", () => {
  assert.equal(core.parseVrl('route "A"\nclimb "C1" height=3m inclination=60%').ast.elements[0].type, "climb");
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

test("validateRoute rejects invalid entrance elevations", () => {
  assert.equal(core.validateRoute(core.parseVrl('route "A"\nmetadata entrance_elevation=high exit_elevation=100m').ast)[0].message, 'Metadata field "entrance_elevation" must be a metric elevation.');
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

test("validateElement accepts singular redirection details", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirection: "12m:left" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects malformed redirection details", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirections: "far:left" }, { line: 1, column: 1 }))[0].message, 'Field "redirections" must list metric redirection anchors.');
});

test("validateElement rejects invalid redirection sides", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirection: "12m:up" }, { line: 1, column: 1 }))[0].message, 'Field "redirection" has unsupported value "12m:up".');
});

test("validateElement rejects nonpositive redirection distances", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirections: "0m:left" }, { line: 1, column: 1 }))[0].message, 'Field "redirections" has unsupported value "0m:left".');
});

test("validateElement rejects redirections outside rappel height", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirections: "35m:left" }, { line: 1, column: 1 }))[0].message, 'Field "redirections" must be inside the rappel height.');
});

test("validateElement skips redirection height bounds when height is invalid", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "bad", rope: "70m", redirections: "12m:left" }, { line: 1, column: 1 })).length, 1);
});

test("validateElement accepts staged rappel details", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "20m+15m" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects malformed rappel stages", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "20m" }, { line: 1, column: 1 }))[0].message, 'Field "stages" must list at least two metric lengths.');
});

test("validateElement rejects nonpositive rappel stages", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "-1m+36m" }, { line: 1, column: 1 }))[0].message, 'Field "stages" has unsupported value "-1m+36m".');
});

test("validateElement warns when rappel stages differ from height", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "20m+10m" }, { line: 1, column: 1 }))[0].severity, "warning");
});

test("validateElement skips stage sum checks when height is invalid", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "bad", rope: "70m", stages: "20m+15m" }, { line: 1, column: 1 })).length, 1);
});

test("validateElement accepts valid downclimb exposure", () => {
  assert.equal(core.validateElement(core.createRouteElement("downclimb", { height: "4m", exposure: "medium" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement accepts valid climb details", () => {
  assert.equal(core.validateElement(core.createRouteElement("climb", { height: "4m", inclination: "70%" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement requires climb heights", () => {
  assert.equal(core.validateElement(core.createRouteElement("climb", { inclination: "70%" }, { line: 1, column: 1 }))[0].message, 'Climb requires "height".');
});

test("validateElement rejects invalid descent shapes", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", shape: "spiral" }, { line: 1, column: 1 }))[0].message, 'Field "shape" has unsupported value "spiral".');
});

test("validateElement rejects invalid station values", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", station: "floating" }, { line: 1, column: 1 }))[0].message, 'Field "station" has unsupported value "floating".');
});

test("validateElement rejects invalid landing values", () => {
  assert.equal(core.validateElement(core.createRouteElement("downclimb", { landing: "cloud" }, { line: 1, column: 1 }))[0].message, 'Field "landing" has unsupported value "cloud".');
});

test("validateElement rejects invalid anchor counts", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", anchor_count: "0" }, { line: 1, column: 1 }))[0].message, 'Field "anchor_count" has unsupported value "0".');
});

test("validateElement rejects invalid flow values", () => {
  assert.equal(core.validateElement(core.createRouteElement("pool", { flow: "violent" }, { line: 1, column: 1 }))[0].message, 'Field "flow" has unsupported value "violent".');
});

test("validateElement rejects invalid inclination text", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", inclination: "steep" }, { line: 1, column: 1 }))[0].message, 'Field "inclination" must be a percentage.');
});

test("validateElement rejects inclination ranges above vertical", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", inclination: "120%" }, { line: 1, column: 1 }))[0].message, 'Field "inclination" must be between 1% and 100%.');
});

test("validateElement rejects zero inclination", () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", inclination: "0%" }, { line: 1, column: 1 }))[0].message, 'Field "inclination" must be between 1% and 100%.');
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
  assert.equal(core.computeVerticalLayout({ elements: [] }).height, 172);
});

test("computeVerticalLayout respects width options", () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model, { width: 720 }).width, 720);
});

test("computeVerticalLayout includes elevation metadata", () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model).elevation.totalChangeMeters, 70);
});

test("computeVerticalLayout attaches node elevations", () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model).nodes[0].elevationMeters, 1240);
});

test("computeVerticalLayout shifts climb routes below top margin", () => {
  assert.equal(core.computeVerticalLayout(core.normalizeRoute(core.parseVrl('route "A"\nstart "S"\nclimb "C1" height=5m').ast)).nodes[0].y, 176);
});

test("computeVerticalLayout honors custom weighted layout margins", () => {
  assert.equal(core.computeVerticalLayout({ elements: [] }, { marginY: 20, marginBottom: 5 }).height, 25);
});

test("computeElevationLayout honors custom pixel scale", () => {
  assert.equal(core.computeElevationLayout(validCompiled().model, { pixelsPerMeter: 1 }).height, 242);
});

test("computeElevationLayout handles empty elevation models", () => {
  assert.equal(core.computeElevationLayout({ metadata: { entrance_elevation: { meters: 100 }, exit_elevation: { meters: 90 } }, elements: [] }).height, 172);
});

test("computeElevationLayout honors custom elevation layout margins", () => {
  assert.deepEqual(core.computeElevationLayout(validCompiled().model, { spineX: 10, marginY: 20, marginBottom: 5, pixelsPerMeter: 1 }).spine, { x: 10, y1: 20, y2: 90 });
});

test("hasElevationProfile detects complete elevation metadata", () => {
  assert.equal(core.hasElevationProfile(validCompiled().model), true);
});

test("hasElevationProfile rejects partial elevation metadata", () => {
  assert.equal(core.hasElevationProfile({ metadata: { entrance_elevation: { meters: 100 } }, elements: [] }), false);
});

test("routeElevationProfile returns total elevation change", () => {
  assert.deepEqual(core.routeElevationProfile(validCompiled().model), { entranceMeters: 1240, exitMeters: 1170, totalChangeMeters: 70 });
});

test("routeElevationProfile returns null without elevations", () => {
  assert.equal(core.routeElevationProfile({ metadata: {}, elements: [] }), null);
});

test("routeElevationProfile tolerates missing metadata", () => {
  assert.equal(core.routeElevationProfile({ elements: [] }), null);
});

test("routeElevationProfile rejects null elevation values", () => {
  assert.equal(core.routeElevationProfile({ metadata: { entrance_elevation: null, exit_elevation: { meters: 90 } }, elements: [] }), null);
});

test("elevationSegmentDeltas distributes residual descent", () => {
  assert.deepEqual(core.elevationSegmentDeltas(validCompiled().model).map((value) => Math.round(value * 100) / 100), [9.21, 12.79, 28, 10.23, 2.6, 7.16]);
});

test("elevationSegmentDeltas returns empty without elevation metadata", () => {
  assert.deepEqual(core.elevationSegmentDeltas({ metadata: {}, elements: [] }), []);
});

test("elevationSegmentDeltas returns base deltas when no segment weights exist", () => {
  assert.deepEqual(core.elevationSegmentDeltas({ metadata: { entrance_elevation: { meters: 100 }, exit_elevation: { meters: 90 } }, elements: [{ type: "start", attributes: {} }] }), []);
});

test("technicalSegmentDelta uses outgoing rappels", () => {
  assert.equal(core.technicalSegmentDelta({ type: "rappel", attributes: { height: { meters: 10 } } }, { type: "pool", attributes: {} }), 10);
});

test("technicalSegmentDelta uses outgoing downclimbs", () => {
  assert.equal(core.technicalSegmentDelta({ type: "downclimb", attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }, { type: "hazard", attributes: {} }), 2);
});

test("technicalSegmentDelta uses incoming climbs", () => {
  assert.equal(core.technicalSegmentDelta({ type: "walk", attributes: {} }, { type: "climb", attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }), -2);
});

test("technicalSegmentDelta ignores non-technical segments", () => {
  assert.equal(core.technicalSegmentDelta({ type: "walk", attributes: {} }, { type: "pool", attributes: {} }), 0);
});

test("technicalVerticalMeters defaults vertical inclination", () => {
  assert.equal(core.technicalVerticalMeters({ attributes: { height: { meters: 10 } } }), 10);
});

test("technicalVerticalMeters ignores missing heights", () => {
  assert.equal(core.technicalVerticalMeters({ attributes: {} }), 0);
});

test("technicalVerticalMeters ignores malformed inclination values", () => {
  assert.equal(core.technicalVerticalMeters({ attributes: { height: { meters: 10 }, inclination: { value: 50 } } }), 10);
});

test("residualDistributionWeights uses non-technical segment weights", () => {
  assert.deepEqual(core.residualDistributionWeights([{ type: "start" }, { type: "walk" }, { type: "pool" }], [0, 0]), [0.9, 0.85]);
});

test("residualDistributionWeights falls back to the last segment", () => {
  assert.deepEqual(core.residualDistributionWeights([{ type: "rappel" }, { type: "pool" }, { type: "downclimb" }], [10, 2]), [0, 1]);
});

test("elementVisualWeight uses known weights", () => {
  assert.equal(core.elementVisualWeight({ type: "rappel" }), 1.25);
});

test("elementVisualWeight defaults unknown elements", () => {
  assert.equal(core.elementVisualWeight({ type: "unknown" }), 1);
});

test("horizontalProgress uses rappel spacing", () => {
  assert.equal(core.horizontalProgress({ type: "rappel" }), 44);
});

test("horizontalProgress uses downclimb spacing", () => {
  assert.equal(core.horizontalProgress({ type: "downclimb" }), 42);
});

test("horizontalProgress uses climb spacing", () => {
  assert.equal(core.horizontalProgress({ type: "climb" }), 42);
});

test("horizontalProgress uses exit spacing", () => {
  assert.equal(core.horizontalProgress({ type: "exit" }), 78);
});

test("horizontalProgress defaults progression spacing", () => {
  assert.equal(core.horizontalProgress({ type: "walk" }), 58);
});

test("verticalDirection moves climbs upward", () => {
  assert.equal(core.verticalDirection({ type: "climb" }), -1);
});

test("verticalDirection moves ordinary elements downward", () => {
  assert.equal(core.verticalDirection({ type: "walk" }), 1);
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

test("renderTopoSvg uses explicit README-safe dimensions", () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /width="640" height="557"/);
});

test("renderTopoSvg includes total elevation change", () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /Desnivel: 70m \(1240m-1170m\)/);
});

test("renderTopoSvg passes Spanish symbology options", () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout, { symbology: "spanish" }), />P<\/text>/);
});

test("renderInfoBox falls back when metadata is absent", () => {
  assert.match(svg.renderInfoBox({ name: "A" }, { width: 400 }, svg.resolveTheme()), /Dificultad: sin dato/);
});

test("renderTopoSvg includes terrain profile layer", () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /vrl-terrain-profile/);
});

test("renderTopoSvg stacks dense labels", () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /vrl-label-leader/);
});

test("terrainProfilePath handles empty layouts", () => {
  assert.equal(svg.terrainProfilePath({ width: 100, height: 80, nodes: [] }), "M 0 80 L 100 80 L 100 26 L 0 46 Z");
});

test("terrainProfilePath follows route nodes", () => {
  assert.equal(svg.terrainProfilePath(validCompiled().layout), "M 0 557 L 0 152 L 38 142 L 106 122 L 164 173 L 208 243 L 266 397 L 308 453 L 366 468 L 444 507 L 640 547 L 640 557 Z");
});

test("renderTerrainProfile uses terrain color", () => {
  assert.match(svg.renderTerrainProfile(validCompiled().layout, svg.resolveTheme()), /fill="#d8d1bb"/);
});

test("renderWaterSegments marks pools", () => {
  assert.match(svg.renderWaterSegments(validCompiled().layout, svg.resolveTheme()), /vrl-water-run/);
});

test("renderRouteSegments renders arrow markers for drops", () => {
  assert.match(svg.renderRouteSegments(validCompiled().layout, svg.resolveTheme()), /marker-end="url\(#vrl-arrow\)"/);
});

test("renderRouteSegments renders ladder drops by default", () => {
  assert.match(svg.renderRouteSegments(validCompiled().layout, svg.resolveTheme()), /vrl-drop-ladder/);
});

test("renderRouteSegments defaults missing descent shape to ladder", () => {
  assert.match(
    svg.renderRouteSegments({
      nodes: [
        { x: 10, y: 10, element: { type: "rappel", attributes: {} } },
        { x: 30, y: 40, element: { type: "pool", attributes: {} } }
      ]
    }, svg.resolveTheme()),
    /vrl-drop-ladder/
  );
});

test("renderRouteSegments can render direct descent shapes", () => {
  assert.doesNotMatch(
    svg.renderRouteSegments({
      nodes: [
        { x: 10, y: 10, element: { type: "rappel", attributes: { shape: "direct" } } },
        { x: 30, y: 40, element: { type: "pool", attributes: {} } }
      ]
    }, svg.resolveTheme()),
    /vrl-drop-ladder/
  );
});

test("routeSegmentPath renders traverse bends", () => {
  assert.equal(svg.routeSegmentPath(validCompiled().layout.nodes[0], validCompiled().layout.nodes[1]), "M 96 108 L 113 134 L 154 159");
});

test("routeSegmentPath renders drop ledges", () => {
  assert.equal(svg.routeSegmentPath(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3]), "M 198 229 L 214 229 L 246 306 L 256 383");
});

test("dropLadderGeometry builds vertical descent coordinates by default", () => {
  assert.deepEqual(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], { attributes: {} }), {
    startX: 198,
    startY: 229,
    dropX: 232,
    bottomX: 232,
    endX: 256,
    endY: 383
  });
});

test("dropLadderGeometry supports leftward drops", () => {
  assert.equal(svg.dropLadderGeometry({ x: 50, y: 10 }, { x: 30, y: 50 }).dropX, 16);
});

test("dropLadderGeometry applies inclination to ladder angle", () => {
  assert.equal(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], validCompiled().model.elements[2]).bottomX, 246);
});

test("renderDropLadderSegment renders rungs", () => {
  assert.match(svg.renderDropLadderSegment(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], svg.resolveTheme()), /vrl-drop-rung/);
});

test("renderDropRungs scales rung count", () => {
  assert.match(svg.renderDropRungs({ dropX: 20, startY: 10, endY: 120 }, svg.resolveTheme()), /y1="28"/);
});

test("renderDropRungs supports upward geometry", () => {
  assert.match(svg.renderDropRungs({ dropX: 20, startY: 120, endY: 10 }, svg.resolveTheme()), /y1="102"/);
});

test("renderDropRungs handles zero-length geometry", () => {
  assert.match(svg.renderDropRungs({ dropX: 20, bottomX: 20, startY: 10, endY: 10 }, svg.resolveTheme()), /vrl-drop-rung/);
});

test("rappelStagesForElement returns normalized stages", () => {
  assert.equal(svg.rappelStagesForElement(validCompiled().model.elements[2]).length, 2);
});

test("rappelStagesForElement defaults to an empty list", () => {
  assert.deepEqual(svg.rappelStagesForElement({ attributes: {} }), []);
});

test("redirectionsForElement returns plural normalized redirections", () => {
  assert.equal(svg.redirectionsForElement(validCompiled().model.elements[2]).length, 2);
});

test("redirectionsForElement returns singular normalized redirections", () => {
  assert.equal(svg.redirectionsForElement({ attributes: { redirection: [{ distance: { meters: 12 }, side: "left" }] } }).length, 1);
});

test("redirectionsForElement defaults to an empty list", () => {
  assert.deepEqual(svg.redirectionsForElement({ attributes: {} }), []);
});

test("rappelHeightMeters reads normalized heights", () => {
  assert.equal(svg.rappelHeightMeters(validCompiled().model.elements[2]), 35);
});

test("rappelHeightMeters defaults missing heights to zero", () => {
  assert.equal(svg.rappelHeightMeters({ attributes: {} }), 0);
});

test("redirectionRatio uses rappel height", () => {
  assert.equal(svg.redirectionRatio({ distance: { meters: 12 } }, validCompiled().model.elements[2]), 12 / 35);
});

test("redirectionRatio defaults when height is absent", () => {
  assert.equal(svg.redirectionRatio({ distance: { meters: 12 } }, { attributes: {} }), 0.5);
});

test("technicalLinePoint interpolates along the technical line", () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, 0.5), { x: 15, y: 150 });
});

test("technicalLinePoint clamps low ratios", () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, -1), { x: 11, y: 105 });
});

test("technicalLinePoint clamps high ratios", () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, 2), { x: 20, y: 195 });
});

test("technicalLinePoint defaults missing bottomX to dropX", () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, startY: 100, endY: 200 }, 0.5), { x: 10, y: 150 });
});

test("renderStageBoundary renders stage boundary marks", () => {
  assert.match(svg.renderStageBoundary({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, 0.5, svg.resolveTheme()), /vrl-rappel-stage-boundary/);
});

test("renderRappelStageMarkers renders stage labels", () => {
  assert.match(svg.renderRappelStageMarkers(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], validCompiled().model.elements[2]), validCompiled().model.elements[2], svg.resolveTheme()), /vrl-rappel-stage-label/);
});

test("renderRappelStageMarkers places leftward labels after the marker", () => {
  assert.match(svg.renderRappelStageMarkers({ dropX: 20, bottomX: 10, startY: 100, endY: 200 }, { attributes: { stages: [{ meters: 20 }, { meters: 15 }] } }, svg.resolveTheme()), /text-anchor="start"/);
});

test("renderRedirectionMarkers renders redirection anchors", () => {
  assert.match(svg.renderRedirectionMarkers(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], validCompiled().model.elements[2]), validCompiled().model.elements[2], svg.resolveTheme()), /vrl-redirection-anchor/);
});

test("renderRedirectionMarkers handles geometry without bottomX", () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 20, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "left" }] } }, svg.resolveTheme()), /text-anchor="start"/);
});

test("renderRedirectionMarkers omits unknown side text", () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "unknown" }] } }, svg.resolveTheme()), /Redirection anchor 12m/);
});

test("renderRedirectionMarkers places leftward labels after the marker", () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 20, bottomX: 10, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "left" }] } }, svg.resolveTheme()), /text-anchor="end"/);
});

test("renderRedirectionMarkers abbreviates right labels", () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 20, bottomX: 10, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "right" }] } }, svg.resolveTheme()), />12m R<\/text>/);
});

test("renderSegmentLabels includes traverse labels", () => {
  assert.match(svg.renderSegmentLabels(validCompiled().layout, svg.resolveTheme()), /50m/);
});

test("segmentLabel uses traverse before walk distance", () => {
  assert.equal(svg.segmentLabel({ element: { attributes: {} } }, validCompiled().layout.nodes[2]), "50m");
});

test("segmentLabel ignores implicit walk distances", () => {
  assert.equal(svg.segmentLabel(validCompiled().layout.nodes[0], validCompiled().layout.nodes[1]), "");
});

test("segmentLabel returns empty for unlabeled segments", () => {
  assert.equal(svg.segmentLabel(validCompiled().layout.nodes[3], validCompiled().layout.nodes[4]), "");
});

test("segmentLabelPosition uses segment midpoint", () => {
  assert.deepEqual(svg.segmentLabelPosition(validCompiled().layout.nodes[1], validCompiled().layout.nodes[2]), { x: 176, y: 187 });
});

test("segmentTechnicalElement uses outgoing rappel elements", () => {
  assert.equal(svg.segmentTechnicalElement(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3]).type, "rappel");
});

test("segmentTechnicalElement uses incoming climb elements", () => {
  assert.equal(svg.segmentTechnicalElement({ element: { type: "walk" } }, { element: { type: "climb" } }).type, "climb");
});

test("segmentTechnicalElement ignores ordinary segments", () => {
  assert.equal(svg.segmentTechnicalElement(validCompiled().layout.nodes[0], validCompiled().layout.nodes[1]), null);
});

test("renderStationTicks marks drop stations", () => {
  assert.match(svg.renderStationTicks(validCompiled().layout, svg.resolveTheme()), /vrl-station-tick/);
});

test("renderStationTicks clears route lines under stations", () => {
  assert.match(svg.renderStationTicks(validCompiled().layout, svg.resolveTheme()), /vrl-station-tick-clearance/);
});

test("renderNode renders hazard symbols", () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[5], svg.resolveTheme()), /vrl-symbol-hazard/);
});

test("renderNode renders standard federation symbols", () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[0], svg.resolveTheme()), />IN<\/text>/);
});

test("renderNode strokes labels for line clearance", () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[2], svg.resolveTheme()), /paint-order="stroke"/);
});

test("renderNodes stacks close node labels", () => {
  assert.match(svg.renderNodes({ nodes: [{ x: 10, y: 20, element: { type: "walk", id: "W1", attributes: {} } }, { x: 12, y: 22, element: { type: "pool", id: "P1", attributes: {} } }] }, svg.resolveTheme()), /vrl-label-leader/);
});

test("nodeLabelPlacement honors minimum label positions", () => {
  assert.equal(svg.nodeLabelPlacement({ x: 10, y: 20, element: { type: "walk" } }, 50).titleY, 50);
});

test("renderLabelLeader skips natural labels", () => {
  assert.equal(svg.renderLabelLeader({ x: 10, y: 20 }, { labelX: 38, titleY: 11 }, svg.resolveTheme()), "");
});

test("renderLabelLeader draws shifted labels", () => {
  assert.match(svg.renderLabelLeader({ x: 10, y: 20 }, { labelX: 38, titleY: 50 }, svg.resolveTheme()), /vrl-label-leader/);
});

test("renderAnchorMarks renders anchor count marks", () => {
  assert.match(svg.renderAnchorMarks(validCompiled().layout.nodes[2], validCompiled().model.elements[2], svg.resolveTheme()), /aria-label="2 anchors"/);
});

test("renderAnchorMarks can place marks right", () => {
  assert.match(svg.renderAnchorMarks({ x: 10, y: 20 }, { attributes: { anchor_count: 1 } }, svg.resolveTheme(), "right"), /cx="24"/);
});

test("renderAnchorMarks skips missing anchor counts", () => {
  assert.equal(svg.renderAnchorMarks(validCompiled().layout.nodes[0], validCompiled().model.elements[0], svg.resolveTheme()), "");
});

test("anchorMarkCount caps visible marks", () => {
  assert.equal(svg.anchorMarkCount({ attributes: { anchor_count: "9" } }), 4);
});

test("anchorMarkCount rejects invalid counts", () => {
  assert.equal(svg.anchorMarkCount({ attributes: { anchor_count: "bad" } }), 0);
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
  assert.match(svg.renderNode({ id: "X1", element: { type: "custom", id: "X1", label: null, attributes: {} }, x: 10, y: 10 }, svg.resolveTheme()), /stroke="#111111"/);
});

test("renderSymbolMarker renders snake extension glyphs", () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 10 }, { type: "hazard", id: "H1", attributes: { type: "snake" } }, "#b42318"), /vrl-symbol-snake/);
});

test("renderSymbolMarker renders clearance halos", () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 10 }, { type: "walk", id: "W1", attributes: {} }, "#111111"), /vrl-symbol-clearance/);
});

test("renderSymbolMarker falls back to black stroke", () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 10 }, { type: "custom", id: "X1", attributes: {} }, ""), /stroke="#111111"/);
});

test("formatTopoLabel formats starts by label", () => {
  assert.equal(svg.formatTopoLabel(validCompiled().model.elements[0]), "Entrance");
});

test("formatTopoLabel falls back for unlabeled exits", () => {
  assert.equal(svg.formatTopoLabel({ type: "exit", id: "E1", label: null, attributes: {} }), "Exit E1");
});

test("formatTopoLabel formats rappel height labels", () => {
  assert.equal(svg.formatTopoLabel(validCompiled().model.elements[2]), "R1, 35m");
});

test("formatTopoDetail formats rappel rope labels", () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[2]), "70m / 2 anchors / pool / medium / 80%");
});

test("formatTopoDetail formats downclimb landing labels", () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[4]), "4m / medium / ledge / 65%");
});

test("formatTopoDetail keeps plain rappel details without expressive fields", () => {
  assert.equal(svg.formatTopoDetail({ type: "rappel", attributes: { rope: { meters: 20 } } }), "20m");
});

test("formatTopoDetail formats singular redirection counts", () => {
  assert.equal(svg.formatTopoDetail({ type: "rappel", attributes: { rope: { meters: 20 }, redirections: [{ distance: { meters: 12 }, side: "left" }] } }), "20m");
});

test("formatTopoDetail keeps plain downclimb details without landings", () => {
  assert.equal(svg.formatTopoDetail({ type: "downclimb", attributes: { height: { meters: 4 }, exposure: "medium" } }), "4m / medium");
});

test("formatTopoDetail falls back for non-descents", () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[3]), "deep");
});

test("formatTopoDetail formats climb details", () => {
  assert.equal(svg.formatTopoDetail({ type: "climb", attributes: { height: { meters: 5 }, inclination: { percent: 55 } } }), "5m / 55%");
});

test("formatTopoDetail formats node elevations", () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[0], validCompiled().layout.nodes[0]), "1240m");
});

test("formatTopoDetail omits missing node elevations", () => {
  assert.equal(svg.formatTopoDetail({ type: "start", attributes: {} }), "");
});

test("needsSegmentArrow detects rappel segments", () => {
  assert.equal(svg.needsSegmentArrow(validCompiled().model.elements[2]), true);
});

test("needsSegmentArrow detects downclimb segments", () => {
  assert.equal(svg.needsSegmentArrow(validCompiled().model.elements[4]), true);
});

test("needsSegmentArrow detects climb segments", () => {
  assert.equal(svg.needsSegmentArrow({ type: "climb" }), true);
});

test("needsSegmentArrow rejects walk segments", () => {
  assert.equal(svg.needsSegmentArrow(validCompiled().model.elements[1]), false);
});

test("inclinationPercent uses normalized inclination", () => {
  assert.equal(svg.inclinationPercent(validCompiled().model.elements[2]), 80);
});

test("inclinationPercent defaults to vertical", () => {
  assert.equal(svg.inclinationPercent({ attributes: {} }), 100);
});

test("inclinationPercent ignores malformed normalized values", () => {
  assert.equal(svg.inclinationPercent({ attributes: { inclination: { value: 70 } } }), 100);
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

test("createVrlReactDiagramState renders valid SVG", () => {
  assert.match(createVrlReactDiagramState(VALID_SOURCE).svg, /<svg/);
});

test("createVrlReactDiagramState reports invalid sources", () => {
  assert.equal(createVrlReactDiagramState("teleport").ok, false);
});

test("React adapter renders valid SVG containers", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE }).type, "div");
});

test("React adapter renders diagnostics", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: "teleport" }).type, "pre");
});

test("React adapter applies container props", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE, containerProps: { id: "route" } }).props.id, "route");
});

test("React adapter applies custom class names", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE, className: "custom-route" }).props.className, "custom-route");
});

test("React adapter applies custom roles", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE, role: "presentation" }).props.role, "presentation");
});

test("React adapter applies diagnostics props", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: "teleport", diagnosticsProps: { id: "diagnostics" } }).props.id, "diagnostics");
});

test("React adapter applies diagnostics class names", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: "teleport", diagnosticsClassName: "custom-diagnostics" }).props.className, "custom-diagnostics");
});

test("React adapter supports default source", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) }, { source: VALID_SOURCE });
  assert.equal(Component().type, "div");
});

test("React adapter supports injected diagram state", () => {
  const Component = createVrlDiagramComponent({ createElement: (type, props, child) => ({ type, props, child }) });
  const state = createVrlReactDiagramState(VALID_SOURCE);
  assert.equal(Component({ diagram: state }).props.dangerouslySetInnerHTML.__html, state.svg);
});

test("createVrlSvelteDiagramState renders valid SVG", () => {
  assert.match(createVrlSvelteDiagramState(VALID_SOURCE).svg, /<svg/);
});

test("createVrlSvelteDiagramState reports invalid sources", () => {
  assert.equal(createVrlSvelteDiagramState("teleport").ok, false);
});

test("Svelte helper renders valid SVG markup", () => {
  assert.match(renderVrlSvelteMarkup(VALID_SOURCE), /class="vrl-diagram"/);
});

test("Svelte helper renders diagnostics", () => {
  assert.match(renderVrlSvelteMarkup("teleport"), /vrl-diagram__diagnostics/);
});

test("Svelte helper applies custom class names", () => {
  assert.match(renderVrlSvelteMarkup(VALID_SOURCE, {}, { className: "custom-route" }), /class="custom-route"/);
});

test("Svelte helper applies custom roles", () => {
  assert.match(renderVrlSvelteMarkup(VALID_SOURCE, {}, { role: "presentation" }), /role="presentation"/);
});

test("Svelte helper escapes diagnostics classes", () => {
  assert.match(renderVrlSvelteMarkup("teleport", {}, { diagnosticsClassName: "bad\"class" }), /class="bad&quot;class"/);
});

test("Svelte helper supports injected diagram state", () => {
  const state = createVrlSvelteDiagramState(VALID_SOURCE);
  assert.match(renderVrlSvelteMarkup("", {}, { diagram: state }), /<svg/);
});

test("createVrlSvelteKitData renders valid data", () => {
  assert.equal(createVrlSvelteKitData(VALID_SOURCE).ok, true);
});

test("createVrlSvelteKitData reports invalid data", () => {
  assert.equal(createVrlSvelteKitData("teleport").ok, false);
});

test("createVrlSvelteKitLoad returns default keys", async () => {
  const load = createVrlSvelteKitLoad({ source: VALID_SOURCE });
  assert.equal((await load({})).vrl.ok, true);
});

test("createVrlSvelteKitLoad returns custom keys", async () => {
  const load = createVrlSvelteKitLoad({ source: VALID_SOURCE, key: "diagram" });
  assert.equal(Object.hasOwn(await load({}), "diagram"), true);
});

test("createVrlSvelteKitLoad resolves source factories", async () => {
  const load = createVrlSvelteKitLoad({ source: (event) => event.locals.source });
  assert.equal((await load({ locals: { source: VALID_SOURCE } })).vrl.ok, true);
});

test("createVrlSvelteKitLoad resolves option factories", async () => {
  const load = createVrlSvelteKitLoad({ source: VALID_SOURCE, options: () => ({ symbology: "spanish" }) });
  assert.match((await load({})).vrl.svg, />P<\/text>/);
});

test("createVrlSvelteKitLoad rejects invalid keys", () => {
  assert.throws(() => createVrlSvelteKitLoad({ source: VALID_SOURCE, key: "" }), TypeError);
});

test("createVrlSvelteKitLoad rejects invalid sources", () => {
  assert.throws(() => createVrlSvelteKitLoad({ source: null }), TypeError);
});

test("example route compiles", () => {
  assert.equal(core.compileRoute(readFileSync(new URL("../examples/quebrada-gata.vrl", import.meta.url), "utf8")).ok, true);
});

test("documentation SVG preview is generated", () => {
  assert.match(readFileSync(new URL("../docs/assets/quebrada-gata.svg", import.meta.url), "utf8"), /<title>Quebrada Gata topo<\/title>/);
});
