import assert from "node:assert/strict";
import test from "node:test";

import * as core from "@subvertic/vrl-core";
import * as svg from "@subvertic/vrl-render-svg";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData, createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";

const VALID_SOURCE = `route "Rio Azul"
metadata country="Costa Rica" region="Cartago" difficulty="V4 A3 III" entrance_elevation=1240m exit_elevation=1170m
start "Entrance"
walk distance=120m note="Riverbed approach"
rappel "R1" height=35m rope=70m traverse=50m anchor=bolts anchor_count=2 station=left landing=pool flow=medium shape=ladder inclination=80% stages=20m+15m redirections=12m:left,27m:right note="Waterfall line"
pool type=deep
downclimb "D1" height=4m exposure=medium anchor_count=1 station=right landing=ledge shape=ladder inclination=65%
hazard type=swift_water severity=high note="Avoid after heavy rain"
exit "Left bank trail"`;

/**
 * Compile the shared valid source fixture through the public core facade.
 * @responsibility coordinator
 * @returns {unknown} The result returned by core.compileRoute.
 */
function validCompiled() {
  return core.compileRoute(VALID_SOURCE);
}

test("createDiagnostic builds structured diagnostics", /**
 * Verify createDiagnostic builds structured diagnostics; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.createDiagnostic("syntax", "error", "Bad", { line: 1, column: 2 }), {
    kind: "syntax",
    severity: "error",
    message: "Bad",
    location: { line: 1, column: 2 },
    suggestion: ""
  });
});

test("formatDiagnostic includes suggestions", /**
 * Verify formatDiagnostic includes suggestions; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(
    core.formatDiagnostic(core.createDiagnostic("validation", "warning", "Check", { line: 2, column: 3 }, "Review.")),
    "WARNING validation at 2:3: Check Suggestion: Review."
  );
});

test("formatDiagnostic omits empty suggestions", /**
 * Verify formatDiagnostic omits empty suggestions; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(
    core.formatDiagnostic(core.createDiagnostic("syntax", "error", "Bad", { line: 1, column: 1 })),
    "ERROR syntax at 1:1: Bad"
  );
});

test("hasBlockingDiagnostics returns true for errors", /**
 * Verify hasBlockingDiagnostics returns true for errors; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.hasBlockingDiagnostics([core.createDiagnostic("syntax", "error", "Bad", { line: 1, column: 1 })]), true);
});

test("hasBlockingDiagnostics returns false for warnings", /**
 * Verify hasBlockingDiagnostics returns false for warnings; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.hasBlockingDiagnostics([core.createDiagnostic("validation", "warning", "Check", { line: 1, column: 1 })]), false);
});

test("isMeasurementField recognizes route measurements", /**
 * Verify isMeasurementField recognizes route measurements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isMeasurementField("height"), true);
});

test("isMeasurementField recognizes traverse measurements", /**
 * Verify isMeasurementField recognizes traverse measurements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isMeasurementField("traverse"), true);
});

test("isMeasurementField recognizes elevation measurements", /**
 * Verify isMeasurementField recognizes elevation measurements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isMeasurementField("entrance_elevation"), true);
});

test("isMeasurementField rejects ordinary fields", /**
 * Verify isMeasurementField rejects ordinary fields; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isMeasurementField("anchor"), false);
});

test("isInclinationField recognizes inclination", /**
 * Verify isInclinationField recognizes inclination; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isInclinationField("inclination"), true);
});

test("isInclinationField rejects other fields", /**
 * Verify isInclinationField rejects other fields; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isInclinationField("height"), false);
});

test("parseMeasurementToken parses meters", /**
 * Verify parseMeasurementToken parses meters; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseMeasurementToken("35m"), { ok: true, value: { value: 35, unit: "m", meters: 35 } });
});

test("parseMeasurementToken rejects feet", /**
 * Verify parseMeasurementToken rejects feet; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseMeasurementToken("35ft"), { ok: false, reason: "expected metric measurement such as 35m" });
});

test("normalizeAttributeValue leaves text fields unchanged", /**
 * Verify normalizeAttributeValue leaves text fields unchanged; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeAttributeValue("anchor", "bolts"), "bolts");
});

test("normalizeAttributeValue converts measurement fields", /**
 * Verify normalizeAttributeValue converts measurement fields; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.normalizeAttributeValue("rope", "70m"), { value: 70, unit: "m", meters: 70 });
});

test("normalizeAttributeValue converts elevation fields", /**
 * Verify normalizeAttributeValue converts elevation fields; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.normalizeAttributeValue("exit_elevation", "1170m"), { value: 1170, unit: "m", meters: 1170 });
});

test("normalizeAttributeValue leaves invalid measurement text unchanged", /**
 * Verify normalizeAttributeValue leaves invalid measurement text unchanged; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeAttributeValue("rope", "seventy"), "seventy");
});

test("parseInclinationToken parses percent values", /**
 * Verify parseInclinationToken parses percent values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseInclinationToken("75%"), { ok: true, value: { value: 75, unit: "%", percent: 75 } });
});

test("parseInclinationToken parses bare percent numbers", /**
 * Verify parseInclinationToken parses bare percent numbers; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseInclinationToken("75"), { ok: true, value: { value: 75, unit: "%", percent: 75 } });
});

test("parseInclinationToken rejects non-percent text", /**
 * Verify parseInclinationToken rejects non-percent text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseInclinationToken("steep"), { ok: false, reason: "expected inclination percentage such as 75%" });
});

test("normalizeInclinationValue converts inclination fields", /**
 * Verify normalizeInclinationValue converts inclination fields; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.normalizeInclinationValue("inclination", "65%"), { value: 65, unit: "%", percent: 65 });
});

test("normalizeInclinationValue leaves invalid inclination text unchanged", /**
 * Verify normalizeInclinationValue leaves invalid inclination text unchanged; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeInclinationValue("inclination", "steep"), "steep");
});

test("normalizeInclinationValue leaves other fields unchanged", /**
 * Verify normalizeInclinationValue leaves other fields unchanged; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeInclinationValue("shape", "ladder"), "ladder");
});

test("isRedirectionField recognizes plural redirections", /**
 * Verify isRedirectionField recognizes plural redirections; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isRedirectionField("redirections"), true);
});

test("isRedirectionField recognizes singular redirection", /**
 * Verify isRedirectionField recognizes singular redirection; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isRedirectionField("redirection"), true);
});

test("isRedirectionField rejects ordinary fields", /**
 * Verify isRedirectionField rejects ordinary fields; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isRedirectionField("anchor"), false);
});

test("isRappelStagesField recognizes stages", /**
 * Verify isRappelStagesField recognizes stages; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isRappelStagesField("stages"), true);
});

test("isRappelStagesField rejects height", /**
 * Verify isRappelStagesField rejects height; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.isRappelStagesField("height"), false);
});

test("parseRedirectionToken parses distance and side", /**
 * Verify parseRedirectionToken parses distance and side; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseRedirectionToken("12m:left"), { ok: true, value: { distance: { value: 12, unit: "m", meters: 12 }, side: "left" } });
});

test("parseRedirectionToken defaults missing side", /**
 * Verify parseRedirectionToken defaults missing side; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseRedirectionToken("12m"), { ok: true, value: { distance: { value: 12, unit: "m", meters: 12 }, side: "unknown" } });
});

test("parseRedirectionToken normalizes side casing", /**
 * Verify parseRedirectionToken normalizes side casing; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRedirectionToken("12m:RIGHT").value.side, "right");
});

test("parseRedirectionToken rejects invalid distances", /**
 * Verify parseRedirectionToken rejects invalid distances; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRedirectionToken("far:left").ok, false);
});

test("parseRedirectionToken rejects extra separators", /**
 * Verify parseRedirectionToken rejects extra separators; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRedirectionToken("12m:left:extra").ok, false);
});

test("parseRedirectionsToken parses comma-separated anchors", /**
 * Verify parseRedirectionsToken parses comma-separated anchors; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRedirectionsToken("12m:left,27m:right").value.length, 2);
});

test("parseRedirectionsToken rejects empty lists", /**
 * Verify parseRedirectionsToken rejects empty lists; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRedirectionsToken("").ok, false);
});

test("parseRedirectionsToken rejects malformed anchors", /**
 * Verify parseRedirectionsToken rejects malformed anchors; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRedirectionsToken("far:left").ok, false);
});

test("parseRappelStagesToken parses plus-separated lengths", /**
 * Verify parseRappelStagesToken parses plus-separated lengths; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRappelStagesToken("20m+15m").value.length, 2);
});

test("parseRappelStagesToken rejects single lengths", /**
 * Verify parseRappelStagesToken rejects single lengths; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRappelStagesToken("20m").ok, false);
});

test("parseRappelStagesToken rejects invalid stage lengths", /**
 * Verify parseRappelStagesToken rejects invalid stage lengths; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseRappelStagesToken("20m+far").ok, false);
});

test("normalizeRappelDetailValue converts redirections", /**
 * Verify normalizeRappelDetailValue converts redirections; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeRappelDetailValue("redirections", "12m:left").length, 1);
});

test("normalizeRappelDetailValue converts stages", /**
 * Verify normalizeRappelDetailValue converts stages; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeRappelDetailValue("stages", "20m+15m").length, 2);
});

test("normalizeRappelDetailValue leaves invalid stages unchanged", /**
 * Verify normalizeRappelDetailValue leaves invalid stages unchanged; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeRappelDetailValue("stages", "20m"), "20m");
});

test("normalizeRappelDetailValue leaves invalid redirections unchanged", /**
 * Verify normalizeRappelDetailValue leaves invalid redirections unchanged; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeRappelDetailValue("redirections", "far:left"), "far:left");
});

test("normalizeRappelDetailValue leaves ordinary fields unchanged", /**
 * Verify normalizeRappelDetailValue leaves ordinary fields unchanged; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeRappelDetailValue("anchor", "bolts"), "bolts");
});

test("createEmptyRoute defaults to empty source", /**
 * Verify createEmptyRoute defaults to empty source; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.createEmptyRoute(), { name: null, metadata: {}, elements: [], source: "", sourceMap: { route: null, metadata: [], elements: [] } });
});

test("createRouteElement stores defaults", /**
 * Verify createRouteElement stores defaults; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.createRouteElement("walk", {}, { line: 1, column: 1 }), {
    type: "walk",
    id: null,
    label: null,
    attributes: {},
    sourceLocation: { line: 1, column: 1 }
  });
});

test("normalizeAttributes converts measurement attributes", /**
 * Verify normalizeAttributes converts measurement attributes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.normalizeAttributes({ distance: "120m", note: "Approach" }), {
    distance: { value: 120, unit: "m", meters: 120 },
    note: "Approach"
  });
});

test("normalizeAttributes converts redirection attributes", /**
 * Verify normalizeAttributes converts redirection attributes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeAttributes({ redirections: "12m:left,27m:right" }).redirections.length, 2);
});

test("normalizeAttributes converts rappel stage attributes", /**
 * Verify normalizeAttributes converts rappel stage attributes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeAttributes({ stages: "20m+15m" }).stages.length, 2);
});

test("normalizeElement generates identifiers", /**
 * Verify normalizeElement generates identifiers; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeElement(core.createRouteElement("walk", {}, { line: 1, column: 1 }), {}).id, "W1");
});

test("normalizeElement preserves explicit identifiers", /**
 * Verify normalizeElement preserves explicit identifiers; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeElement(core.createRouteElement("rappel", { height: "1m", rope: "2m" }, { line: 1, column: 1 }, "R9"), {}).id, "R9");
});

test("normalizeElement generates climb identifiers", /**
 * Verify normalizeElement generates climb identifiers; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeElement(core.createRouteElement("climb", { height: "1m" }, { line: 1, column: 1 }), {}).id, "C1");
});

test("normalizeElement increments existing counters", /**
 * Verify normalizeElement increments existing counters; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.normalizeElement(core.createRouteElement("walk", {}, { line: 1, column: 1 }), { walk: 1 }).id, "W2");
});

test("summarizeRoute handles empty routes", /**
 * Verify summarizeRoute handles empty routes; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
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

test("summarizeRoute ignores non-normalized measurements", /**
 * Verify summarizeRoute ignores non-normalized measurements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.summarizeRoute([core.createRouteElement("rappel", { height: "bad" }, { line: 1, column: 1 })]).highestRappelMeters, 0);
});

test("summarizeRoute ignores missing walk distance", /**
 * Verify summarizeRoute ignores missing walk distance; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.summarizeRoute([core.createRouteElement("walk", {}, { line: 1, column: 1 })]).totalDistanceMeters, 0);
});

test("normalizeRoute computes route summary", /**
 * Verify normalizeRoute computes route summary; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(validCompiled().model.summary.requiredRopeMeters, 70);
});

test("normalizeRoute computes elevation change summary", /**
 * Verify normalizeRoute computes elevation change summary; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(validCompiled().model.summary.totalElevationChangeMeters, 70);
});

test("stripComment removes comments outside quotes", /**
 * Verify stripComment removes comments outside quotes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.stripComment('note "Keep # marker" # remove'), 'note "Keep # marker" ');
});

test("stripComment preserves escaped quote content", /**
 * Verify stripComment preserves escaped quote content; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.stripComment('note "Keep \\" # marker" # remove'), 'note "Keep \\" # marker" ');
});

test("tokenize keeps quoted attribute values together", /**
 * Verify tokenize keeps quoted attribute values together; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.tokenize('walk distance=120m note="Riverbed approach"'), ["walk", "distance=120m", 'note="Riverbed approach"']);
});

test("tokenize handles escaped quotes", /**
 * Verify tokenize handles escaped quotes; arrange the scenario and make its single direct assertion. Assertion
 * and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.tokenize('note "Use \\"R1\\""'), ["note", '"Use \\"R1\\""']);
});

test("parseAttributeTokens parses key values", /**
 * Verify parseAttributeTokens parses key values; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.parseAttributeTokens(['note="Main line"'], { line: 1, column: 1 }).attributes, { note: "Main line" });
});

test("parseAttributeTokens rejects missing separators", /**
 * Verify parseAttributeTokens rejects missing separators; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseAttributeTokens(["height"], { line: 1, column: 1 }).diagnostics.length, 1);
});

test("parseAttributeTokens rejects missing keys", /**
 * Verify parseAttributeTokens rejects missing keys; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseAttributeTokens(["=35m"], { line: 1, column: 1 }).diagnostics.length, 1);
});

test("parseAttributeTokens rejects missing values", /**
 * Verify parseAttributeTokens rejects missing values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseAttributeTokens(["height="], { line: 1, column: 1 }).diagnostics.length, 1);
});

test("parseVrl reads a route name", /**
 * Verify parseVrl reads a route name; arrange the scenario and make its single direct assertion. Assertion and
 * setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.name, "Rio Azul");
});

test("parseVrl merges metadata attributes", /**
 * Verify parseVrl merges metadata attributes; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.metadata.region, "Cartago");
});

test("parseVrl reads start labels", /**
 * Verify parseVrl reads start labels; arrange the scenario and make its single direct assertion. Assertion and
 * setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.elements[0].label, "Entrance");
});

test("parseVrl reads explicit element identifiers", /**
 * Verify parseVrl reads explicit element identifiers; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl(VALID_SOURCE).ast.elements[2].id, "R1");
});

test("parseVrl reads climb elements", /**
 * Verify parseVrl reads climb elements; arrange the scenario and make its single direct assertion. Assertion
 * and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route "A"\nclimb "C1" height=3m inclination=60%').ast.elements[0].type, "climb");
});

test("parseVrl parses note text", /**
 * Verify parseVrl parses note text; arrange the scenario and make its single direct assertion. Assertion and
 * setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route "A"\nnote "Low water only"').ast.elements[0].attributes.text, "Low water only");
});

test("parseVrl allows trailing block braces", /**
 * Verify parseVrl allows trailing block braces; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route "A" {\n}').diagnostics.length, 0);
});

test("parseVrl reports missing route names", /**
 * Verify parseVrl reports missing route names; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl("route").diagnostics[0].message, "Route statement requires a route name.");
});

test("parseVrl reports bad metadata attributes", /**
 * Verify parseVrl reports bad metadata attributes; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route "A"\nmetadata country').diagnostics.length, 1);
});

test("parseVrl reports unknown statements", /**
 * Verify parseVrl reports unknown statements; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseVrl('route "A"\nteleport now').diagnostics[0].kind, "syntax");
});

test("validateRoute accepts the valid source AST", /**
 * Verify validateRoute accepts the valid source AST; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateRoute(core.parseVrl(VALID_SOURCE).ast).length, 0);
});

test("validateRoute rejects missing names", /**
 * Verify validateRoute rejects missing names; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateRoute(core.createEmptyRoute()).length, 1);
});

test("validateRoute rejects invalid entrance elevations", /**
 * Verify validateRoute rejects invalid entrance elevations; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateRoute(core.parseVrl('route "A"\nmetadata entrance_elevation=high exit_elevation=100m').ast)[0].message, 'Metadata field "entrance_elevation" must be a metric elevation.');
});

test("validateElement rejects invalid measurement text", /**
 * Verify validateElement rejects invalid measurement text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("walk", { distance: "far" }, { line: 1, column: 1 }))[0].message, 'Field "distance" must be a metric measurement.');
});

test("validateElement rejects nonpositive measurements", /**
 * Verify validateElement rejects nonpositive measurements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("walk", { distance: "0m" }, { line: 1, column: 1 }))[0].message, 'Field "distance" must be greater than 0m.');
});

test("validateElement requires rappel height", /**
 * Verify validateElement requires rappel height; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { rope: "30m" }, { line: 1, column: 1 }))[0].message, 'Rappel requires "height".');
});

test("validateElement requires rappel rope", /**
 * Verify validateElement requires rappel rope; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "30m" }, { line: 1, column: 1 }))[0].message, 'Rappel requires "rope".');
});

test("validateElement rejects unsupported anchors", /**
 * Verify validateElement rejects unsupported anchors; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "30m", rope: "60m", anchor: "plastic" }, { line: 1, column: 1 }))[0].message, 'Field "anchor" has unsupported value "plastic".');
});

test("validateElement warns when rope is shorter than rappel height", /**
 * Verify validateElement warns when rope is shorter than rappel height; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "30m", anchor: "bolts" }, { line: 1, column: 1 }))[0].severity, "warning");
});

test("validateElement skips rope comparison when measurement is invalid", /**
 * Verify validateElement skips rope comparison when measurement is invalid; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "bad", rope: "30m", anchor: "bolts" }, { line: 1, column: 1 })).length, 1);
});

test("validateElement accepts singular redirection details", /**
 * Verify validateElement accepts singular redirection details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirection: "12m:left" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects malformed redirection details", /**
 * Verify validateElement rejects malformed redirection details; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirections: "far:left" }, { line: 1, column: 1 }))[0].message, 'Field "redirections" must list metric redirection anchors.');
});

test("validateElement rejects invalid redirection sides", /**
 * Verify validateElement rejects invalid redirection sides; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirection: "12m:up" }, { line: 1, column: 1 }))[0].message, 'Field "redirection" has unsupported value "12m:up".');
});

test("validateElement rejects nonpositive redirection distances", /**
 * Verify validateElement rejects nonpositive redirection distances; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirections: "0m:left" }, { line: 1, column: 1 }))[0].message, 'Field "redirections" has unsupported value "0m:left".');
});

test("validateElement rejects redirections outside rappel height", /**
 * Verify validateElement rejects redirections outside rappel height; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", redirections: "35m:left" }, { line: 1, column: 1 }))[0].message, 'Field "redirections" must be inside the rappel height.');
});

test("validateElement skips redirection height bounds when height is invalid", /**
 * Verify validateElement skips redirection height bounds when height is invalid; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "bad", rope: "70m", redirections: "12m:left" }, { line: 1, column: 1 })).length, 1);
});

test("validateElement accepts staged rappel details", /**
 * Verify validateElement accepts staged rappel details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "20m+15m" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects malformed rappel stages", /**
 * Verify validateElement rejects malformed rappel stages; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "20m" }, { line: 1, column: 1 }))[0].message, 'Field "stages" must list at least two metric lengths.');
});

test("validateElement rejects nonpositive rappel stages", /**
 * Verify validateElement rejects nonpositive rappel stages; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "-1m+36m" }, { line: 1, column: 1 }))[0].message, 'Field "stages" has unsupported value "-1m+36m".');
});

test("validateElement warns when rappel stages differ from height", /**
 * Verify validateElement warns when rappel stages differ from height; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "35m", rope: "70m", stages: "20m+10m" }, { line: 1, column: 1 }))[0].severity, "warning");
});

test("validateElement skips stage sum checks when height is invalid", /**
 * Verify validateElement skips stage sum checks when height is invalid; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "bad", rope: "70m", stages: "20m+15m" }, { line: 1, column: 1 })).length, 1);
});

test("validateElement accepts valid downclimb exposure", /**
 * Verify validateElement accepts valid downclimb exposure; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("downclimb", { height: "4m", exposure: "medium" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement accepts valid climb details", /**
 * Verify validateElement accepts valid climb details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("climb", { height: "4m", inclination: "70%" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement requires climb heights", /**
 * Verify validateElement requires climb heights; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("climb", { inclination: "70%" }, { line: 1, column: 1 }))[0].message, 'Climb requires "height".');
});

test("validateElement rejects invalid descent shapes", /**
 * Verify validateElement rejects invalid descent shapes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", shape: "spiral" }, { line: 1, column: 1 }))[0].message, 'Field "shape" has unsupported value "spiral".');
});

test("validateElement rejects invalid station values", /**
 * Verify validateElement rejects invalid station values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", station: "floating" }, { line: 1, column: 1 }))[0].message, 'Field "station" has unsupported value "floating".');
});

test("validateElement rejects invalid landing values", /**
 * Verify validateElement rejects invalid landing values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("downclimb", { landing: "cloud" }, { line: 1, column: 1 }))[0].message, 'Field "landing" has unsupported value "cloud".');
});

test("validateElement rejects invalid anchor counts", /**
 * Verify validateElement rejects invalid anchor counts; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", anchor_count: "0" }, { line: 1, column: 1 }))[0].message, 'Field "anchor_count" has unsupported value "0".');
});

test("validateElement rejects invalid flow values", /**
 * Verify validateElement rejects invalid flow values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("pool", { flow: "violent" }, { line: 1, column: 1 }))[0].message, 'Field "flow" has unsupported value "violent".');
});

test("validateElement rejects invalid inclination text", /**
 * Verify validateElement rejects invalid inclination text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", inclination: "steep" }, { line: 1, column: 1 }))[0].message, 'Field "inclination" must be a percentage.');
});

test("validateElement rejects inclination ranges above vertical", /**
 * Verify validateElement rejects inclination ranges above vertical; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", inclination: "120%" }, { line: 1, column: 1 }))[0].message, 'Field "inclination" must be greater than 0% and at most 100%.');
});

test("validateElement rejects zero inclination", /**
 * Verify validateElement rejects zero inclination; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("rappel", { height: "10m", rope: "20m", inclination: "0%" }, { line: 1, column: 1 }))[0].message, 'Field "inclination" must be greater than 0% and at most 100%.');
});

test("validateElement rejects invalid downclimb exposure", /**
 * Verify validateElement rejects invalid downclimb exposure; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("downclimb", { exposure: "wild" }, { line: 1, column: 1 }))[0].message, 'Field "exposure" has unsupported value "wild".');
});

test("validateElement accepts valid pool type", /**
 * Verify validateElement accepts valid pool type; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("pool", { type: "deep" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects invalid pool type", /**
 * Verify validateElement rejects invalid pool type; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("pool", { type: "boiling" }, { line: 1, column: 1 }))[0].message, 'Field "type" has unsupported value "boiling".');
});

test("validateElement accepts valid hazard severity", /**
 * Verify validateElement accepts valid hazard severity; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("hazard", { severity: "critical" }, { line: 1, column: 1 })).length, 0);
});

test("validateElement rejects invalid hazard severity", /**
 * Verify validateElement rejects invalid hazard severity; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.validateElement(core.createRouteElement("hazard", { severity: "extreme" }, { line: 1, column: 1 }))[0].message, 'Field "severity" has unsupported value "extreme".');
});

test("computeVerticalLayout creates one node per element", /**
 * Verify computeVerticalLayout creates one node per element; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model).nodes.length, 7);
});

test("computeVerticalLayout handles empty models", /**
 * Verify computeVerticalLayout handles empty models; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout({ elements: [] }).height, 172);
});

test("computeVerticalLayout respects width options", /**
 * Verify computeVerticalLayout respects width options; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model, { width: 720 }).width, 720);
});

test("computeVerticalLayout applies horizontal scale options", /**
 * Verify computeVerticalLayout applies horizontal scale options; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout(core.normalizeRoute(core.parseVrl('route "A"\nstart "S"\nwalk distance=10m').ast), { horizontalScale: 1.5 }).nodes[1].x, 183);
});

test("computeVerticalLayout includes elevation metadata", /**
 * Verify computeVerticalLayout includes elevation metadata; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model).elevation.totalChangeMeters, 70);
});

test("computeVerticalLayout attaches node elevations", /**
 * Verify computeVerticalLayout attaches node elevations; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout(validCompiled().model).nodes[0].elevationMeters, 1240);
});

test("computeVerticalLayout shifts climb routes below top margin", /**
 * Verify computeVerticalLayout shifts climb routes below top margin; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout(core.normalizeRoute(core.parseVrl('route "A"\nstart "S"\nclimb "C1" height=5m').ast)).nodes[0].y, 176);
});

test("computeVerticalLayout honors custom weighted layout margins", /**
 * Verify computeVerticalLayout honors custom weighted layout margins; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout({ elements: [] }, { marginY: 20, marginBottom: 5 }).height, 25);
});

test("computeElevationLayout honors custom pixel scale", /**
 * Verify computeElevationLayout honors custom pixel scale; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeElevationLayout(validCompiled().model, { pixelsPerMeter: 1 }).height, 512);
});

test("computeElevationLayout rejects inconsistent empty elevation models", /**
 * Verify computeElevationLayout rejects inconsistent empty elevation models; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.computeElevationLayout so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.computeElevationLayout.
   */ () => core.computeElevationLayout({ metadata: { entrance_elevation: { meters: 100 }, exit_elevation: { meters: 90 } }, elements: [] }), /inconsistent/);
});

test("computeElevationLayout honors custom elevation layout margins", /**
 * Verify computeElevationLayout honors custom elevation layout margins; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.computeElevationLayout(validCompiled().model, { spineX: 10, marginY: 20, marginBottom: 5, pixelsPerMeter: 1 }).spine, { x: 10, y1: 20, y2: 360 });
});

test("computeElevationLayout enforces readable node gaps", /**
 * Verify computeElevationLayout enforces readable node gaps; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeElevationLayout(validCompiled().model).nodes[5].y - core.computeElevationLayout(validCompiled().model).nodes[4].y, 68);
});

test("computeElevationLayout can disable readable node gaps", /**
 * Verify computeElevationLayout can disable readable node gaps; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeElevationLayout(validCompiled().model, { pixelsPerMeter: 1, minNodeGap: 0 }).height, 242);
});

test("computeElevationLayout applies horizontal scale options", /**
 * Verify computeElevationLayout applies horizontal scale options; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeElevationLayout(validCompiled().model, { horizontalScale: 1.5 }).nodes[1].x, 183);
});

test("applyMinimumNodeGap preserves upward segment direction", /**
 * Verify applyMinimumNodeGap preserves upward segment direction; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.applyMinimumNodeGap([{ x: 0, y: 50 }, { x: 1, y: 40 }], 20, 45), [{ x: 0, y: 65 }, { x: 1, y: 45 }]);
});

test("applyMinimumNodeGap preserves larger elevation-scaled gaps", /**
 * Verify applyMinimumNodeGap preserves larger elevation-scaled gaps; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.applyMinimumNodeGap([{ y: 100 }, { y: 250 }, { y: 260 }], 68, 0).map(/**
   * Project node.y from the current record.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The node.y value selected or validated above.
   */ (node) => node.y), [100, 250, 318]);
});

test("hasElevationProfile detects complete elevation metadata", /**
 * Verify hasElevationProfile detects complete elevation metadata; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.hasElevationProfile(validCompiled().model), true);
});

test("hasElevationProfile rejects partial elevation metadata", /**
 * Verify hasElevationProfile rejects partial elevation metadata; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.hasElevationProfile({ metadata: { entrance_elevation: { meters: 100 } }, elements: [] }), false);
});

test("routeElevationProfile returns total elevation change", /**
 * Verify routeElevationProfile returns total elevation change; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.routeElevationProfile(validCompiled().model), { entranceMeters: 1240, exitMeters: 1170, totalChangeMeters: 70 });
});

test("routeElevationProfile returns null without elevations", /**
 * Verify routeElevationProfile returns null without elevations; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.routeElevationProfile({ metadata: {}, elements: [] }), null);
});

test("routeElevationProfile tolerates missing metadata", /**
 * Verify routeElevationProfile tolerates missing metadata; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.routeElevationProfile({ elements: [] }), null);
});

test("routeElevationProfile rejects null elevation values", /**
 * Verify routeElevationProfile rejects null elevation values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.routeElevationProfile({ metadata: { entrance_elevation: null, exit_elevation: { meters: 90 } }, elements: [] }), null);
});

test("elevationSegmentDeltas distributes residual descent", /**
 * Verify elevationSegmentDeltas distributes residual descent; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.elevationSegmentDeltas(validCompiled().model).map(/**
   * Compute Math.round(value * 100) / 100.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number} The result of the documented comparison or calculation.
   */ (value) => Math.round(value * 100) / 100), [11.26, 15.63, 28, 12.51, 2.6]);
});

test("elevationSegmentDeltas returns empty without elevation metadata", /**
 * Verify elevationSegmentDeltas returns empty without elevation metadata; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.elevationSegmentDeltas({ metadata: {}, elements: [] }), []);
});

test("elevationSegmentDeltas rejects inconsistent profiles without eligible connections", /**
 * Verify elevationSegmentDeltas rejects inconsistent profiles without eligible connections; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.elevationSegmentDeltas so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.elevationSegmentDeltas.
   */ () => core.elevationSegmentDeltas({ metadata: { entrance_elevation: { meters: 100 }, exit_elevation: { meters: 90 } }, elements: [{ type: "start", attributes: {} }] }), /inconsistent/);
});

test("technicalSegmentDelta uses outgoing rappels", /**
 * Verify technicalSegmentDelta uses outgoing rappels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.technicalSegmentDelta({ type: "rappel", attributes: { height: { meters: 10 } } }, { type: "pool", attributes: {} }), 10);
});

test("technicalSegmentDelta uses outgoing downclimbs", /**
 * Verify technicalSegmentDelta uses outgoing downclimbs; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.technicalSegmentDelta({ type: "downclimb", attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }, { type: "hazard", attributes: {} }), 2);
});

test("technicalSegmentDelta uses incoming climbs", /**
 * Verify technicalSegmentDelta uses incoming climbs; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.technicalSegmentDelta({ type: "walk", attributes: {} }, { type: "climb", attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }), -2);
});

test("technicalSegmentDelta ignores non-technical segments", /**
 * Verify technicalSegmentDelta ignores non-technical segments; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.technicalSegmentDelta({ type: "walk", attributes: {} }, { type: "pool", attributes: {} }), 0);
});

test("technicalVerticalMeters defaults vertical inclination", /**
 * Verify technicalVerticalMeters defaults vertical inclination; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.technicalVerticalMeters({ attributes: { height: { meters: 10 } } }), 10);
});

test("technicalVerticalMeters ignores missing heights", /**
 * Verify technicalVerticalMeters ignores missing heights; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.technicalVerticalMeters({ attributes: {} }), 0);
});

test("technicalVerticalMeters ignores malformed inclination values", /**
 * Verify technicalVerticalMeters ignores malformed inclination values; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.technicalVerticalMeters({ attributes: { height: { meters: 10 }, inclination: { value: 50 } } }), 10);
});

test("residualDistributionWeights uses non-technical segment weights", /**
 * Verify residualDistributionWeights uses non-technical segment weights; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.residualDistributionWeights([{ type: "start" }, { type: "walk" }, { type: "pool" }], [0, 0]), [0.9, 0.85]);
});

test("residualDistributionWeights never assigns residuals to technical segments", /**
 * Verify residualDistributionWeights never assigns residuals to technical segments; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(core.residualDistributionWeights([{ type: "rappel" }, { type: "pool" }, { type: "downclimb" }], [10, 2]), [0, 0]);
});

test("elementVisualWeight uses known weights", /**
 * Verify elementVisualWeight uses known weights; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.elementVisualWeight({ type: "rappel" }), 1.25);
});

test("elementVisualWeight defaults unknown elements", /**
 * Verify elementVisualWeight defaults unknown elements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.elementVisualWeight({ type: "unknown" }), 1);
});

test("horizontalProgress uses rappel spacing", /**
 * Verify horizontalProgress uses rappel spacing; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.horizontalProgress({ type: "rappel" }), 44);
});

test("horizontalProgress uses downclimb spacing", /**
 * Verify horizontalProgress uses downclimb spacing; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.horizontalProgress({ type: "downclimb" }), 42);
});

test("horizontalProgress uses climb spacing", /**
 * Verify horizontalProgress uses climb spacing; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.horizontalProgress({ type: "climb" }), 42);
});

test("horizontalProgress uses exit spacing", /**
 * Verify horizontalProgress uses exit spacing; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.horizontalProgress({ type: "exit" }), 78);
});

test("horizontalProgress defaults progression spacing", /**
 * Verify horizontalProgress defaults progression spacing; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.horizontalProgress({ type: "walk" }), 58);
});

test("resolveHorizontalScale accepts positive finite numbers", /**
 * Verify resolveHorizontalScale accepts positive finite numbers; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.resolveHorizontalScale(1.25), 1.25);
});

test("resolveHorizontalScale defaults missing values", /**
 * Verify resolveHorizontalScale defaults missing values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.resolveHorizontalScale(), 1);
});

test("resolveHorizontalScale rejects non-number values", /**
 * Verify resolveHorizontalScale rejects non-number values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.resolveHorizontalScale so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.resolveHorizontalScale.
   */ () => core.resolveHorizontalScale("1.25"), TypeError);
});

test("resolveHorizontalScale rejects non-finite values", /**
 * Verify resolveHorizontalScale rejects non-finite values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.resolveHorizontalScale so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.resolveHorizontalScale.
   */ () => core.resolveHorizontalScale(Number.POSITIVE_INFINITY), RangeError);
});

test("resolveHorizontalScale rejects nonpositive values", /**
 * Verify resolveHorizontalScale rejects nonpositive values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.resolveHorizontalScale so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.resolveHorizontalScale.
   */ () => core.resolveHorizontalScale(0), RangeError);
});

test("verticalDirection moves climbs upward", /**
 * Verify verticalDirection moves climbs upward; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.verticalDirection({ type: "climb" }), -1);
});

test("verticalDirection moves ordinary elements downward", /**
 * Verify verticalDirection moves ordinary elements downward; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.verticalDirection({ type: "walk" }), 1);
});

test("resolveTheme returns dark tokens", /**
 * Verify resolveTheme returns dark tokens; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveTheme("dark").background, "#14171a");
});

test("resolveTheme applies overrides", /**
 * Verify resolveTheme applies overrides; arrange the scenario and make its single direct assertion. Assertion
 * and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveTheme("light", { background: "#eeeeee" }).background, "#eeeeee");
});

test("resolveDiagramLanguage accepts Spanish aliases", /**
 * Verify resolveDiagramLanguage accepts Spanish aliases; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveDiagramLanguage("es-CR"), "es");
});

test("resolveDiagramLanguage defaults non-string values", /**
 * Verify resolveDiagramLanguage defaults non-string values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveDiagramLanguage(null), "en");
});

test("resolveDiagramLanguage defaults unknown languages", /**
 * Verify resolveDiagramLanguage defaults unknown languages; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveDiagramLanguage("de"), "en");
});

test("diagramText returns Spanish summary labels", /**
 * Verify diagramText returns Spanish summary labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.diagramText("es").difficulty, "Dificultad");
});

test("elementLabel falls back for unknown element types", /**
 * Verify elementLabel falls back for unknown element types; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.elementLabel("custom", "es"), "custom");
});

test("localizeDetailValue translates known Spanish values", /**
 * Verify localizeDetailValue translates known Spanish values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.localizeDetailValue("medium", "es"), "medio");
});

test("localizeDetailValue leaves unknown strings unchanged", /**
 * Verify localizeDetailValue leaves unknown strings unchanged; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.localizeDetailValue("technical", "es"), "technical");
});

test("localizeDetailValue leaves non-string values unchanged", /**
 * Verify localizeDetailValue leaves non-string values unchanged; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.localizeDetailValue(3, "es"), 3);
});

test("resolveRenderLanguage uses explicit language", /**
 * Verify resolveRenderLanguage uses explicit language; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveRenderLanguage({ language: "es" }), "es");
});

test("resolveRenderLanguage uses locale aliases", /**
 * Verify resolveRenderLanguage uses locale aliases; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveRenderLanguage({ locale: "es-CR" }), "es");
});

test("resolveRenderLanguage uses Spanish symbology as a default", /**
 * Verify resolveRenderLanguage uses Spanish symbology as a default; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveRenderLanguage({ symbology: "spanish" }), "es");
});

test("renderTopoSvg includes an accessible title", /**
 * Verify renderTopoSvg includes an accessible title; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /<title>Rio Azul topo<\/title>/);
});

test("renderTopoSvg uses explicit README-safe dimensions", /**
 * Verify renderTopoSvg uses explicit README-safe dimensions; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const markup = svg.renderTopoSvg(validCompiled().model, validCompiled().layout);
  const dimensions = markup.match(/viewBox="[^" ]+ [^" ]+ ([^" ]+) ([^" ]+)" width="([^" ]+)" height="([^" ]+)"/);
  assert.deepEqual(dimensions.slice(1, 3), dimensions.slice(3, 5));
});

test("renderTopoSvg can hide the legend", /**
 * Verify renderTopoSvg can hide the legend; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = validCompiled();
  const withLegend = Number(svg.renderTopoSvg(result.model, result.layout).match(/height="([^"]+)"/)[1]);
  const withoutLegend = Number(svg.renderTopoSvg(result.model, result.layout, { legend: false }).match(/height="([^"]+)"/)[1]);
  assert.equal(withoutLegend < withLegend, true);
});

test("renderTopoSvg includes total elevation change", /**
 * Verify renderTopoSvg includes total elevation change; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /Elevation change: 70m \(1240m-1170m\)/);
});

test("renderTopoSvg supports Spanish diagram labels", /**
 * Verify renderTopoSvg supports Spanish diagram labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout, { language: "es" }), /Desnivel: 70m \(1240m-1170m\)/);
});

test("renderTopoSvg passes Spanish symbology options", /**
 * Verify renderTopoSvg passes Spanish symbology options; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout, { symbology: "spanish" }), />P<\/text>/);
});

test("renderTopoSvg omits redundant Spanish pool text labels", /**
 * Verify renderTopoSvg omits redundant Spanish pool text labels; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.doesNotMatch(svg.renderTopoSvg(validCompiled().model, validCompiled().layout, { symbology: "spanish" }), />Poza P1<\/text>/);
});

test("renderInfoBox falls back when metadata is absent", /**
 * Verify renderInfoBox falls back when metadata is absent; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderInfoBox({ name: "A" }, { width: 400 }, svg.resolveTheme()), /Difficulty: no data/);
});

test("renderInfoBox supports Spanish fallback labels", /**
 * Verify renderInfoBox supports Spanish fallback labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderInfoBox({ name: "A" }, { width: 400 }, svg.resolveTheme(), "es"), /Dificultad: sin dato/);
});

test("renderTopoSvg includes terrain profile layer", /**
 * Verify renderTopoSvg includes terrain profile layer; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /vrl-terrain-profile/);
});

test("renderTopoSvg includes a topo legend", /**
 * Verify renderTopoSvg includes a topo legend; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderTopoSvg(validCompiled().model, validCompiled().layout), /vrl-legend/);
});

test("renderTopoSvg omits the legend when disabled", /**
 * Verify renderTopoSvg omits the legend when disabled; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.doesNotMatch(svg.renderTopoSvg(validCompiled().model, validCompiled().layout, { legend: false }), /vrl-legend/);
});

test("renderLegend color-codes English flow labels by category", /**
 * Verify renderLegend color-codes English flow labels by category; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLegend(validCompiled().layout, svg.resolveTheme()), /vrl-detail-badge-flow/);
});

test("renderLegend color-codes Spanish level labels", /**
 * Verify renderLegend color-codes Spanish level labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLegend(validCompiled().layout, svg.resolveTheme(), "es"), />medio<\/text>/);
});

test("renderLegend color-codes exposure labels by category", /**
 * Verify renderLegend color-codes exposure labels by category; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLegend(validCompiled().layout, svg.resolveTheme()), /vrl-detail-badge-exposure/);
});

test("renderLegend color-codes hazard severity labels by category", /**
 * Verify renderLegend color-codes hazard severity labels by category; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLegend(validCompiled().layout, svg.resolveTheme()), /vrl-detail-badge-hazardSeverity/);
});

test("renderLegend color-codes inclination labels by category", /**
 * Verify renderLegend color-codes inclination labels by category; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLegend(validCompiled().layout, svg.resolveTheme()), /vrl-detail-badge-inclination/);
});

test("renderLegend includes federation symbol explanations", /**
 * Verify renderLegend includes federation symbol explanations; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLegend(validCompiled().layout, svg.resolveTheme()), /<tspan font-weight="800" fill="#111111">M<\/tspan><tspan> = Walk<\/tspan>/);
});

test("renderLegend includes Spanish profile symbol explanations", /**
 * Verify renderLegend includes Spanish profile symbol explanations; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLegend(validCompiled().layout, svg.resolveTheme(), "es", "spanish"), /<tspan font-weight="800" fill="#111111">P<\/tspan><tspan> = Poza<\/tspan>/);
});

test("legendSymbolRows uses active profile codes", /**
 * Verify legendSymbolRows uses active profile codes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.legendSymbolRows("es", "spanish")[0][2][0], "A");
});

test("topoLegendHeight returns default legend space", /**
 * Verify topoLegendHeight returns default legend space; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.topoLegendHeight(), 156);
});

test("renderDetailLine color-codes flow levels by category", /**
 * Verify renderDetailLine color-codes flow levels by category; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("flow: medium", 10, 20, svg.resolveTheme()), /vrl-detail-badge-flow/);
});

test("renderDetailLine color-codes exposure levels by category", /**
 * Verify renderDetailLine color-codes exposure levels by category; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("exposure: medium", 10, 20, svg.resolveTheme()), /vrl-detail-badge-exposure/);
});

test("renderDetailLine color-codes hazard severity levels by category", /**
 * Verify renderDetailLine color-codes hazard severity levels by category; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("severity: high", 10, 20, svg.resolveTheme()), /vrl-detail-badge-hazardSeverity/);
});

test("renderDetailLine color-codes inclination values by category", /**
 * Verify renderDetailLine color-codes inclination values by category; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("80%", 10, 20, svg.resolveTheme()), /vrl-detail-badge-inclination/);
});

test("renderDetailLine uses one flow color for different flow values", /**
 * Verify renderDetailLine uses one flow color for different flow values; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual([...svg.renderDetailLine("flow: low / flow: high", 10, 20, svg.resolveTheme()).matchAll(/<rect[^>]+fill="([^"]+)"/g)].map(/**
   * Project match.1 from the current record.
   * @responsibility computation
   * @param {unknown} match - Regular-expression match including the capture groups consumed below.
   * @returns {unknown} The match.1 value selected or validated above.
   */ (match) => match[1]), ["#1479a6", "#1479a6"]);
});

test("renderDetailLine color-codes standalone levels", /**
 * Verify renderDetailLine color-codes standalone levels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("medium", 10, 20, svg.resolveTheme()), /vrl-detail-badge-level/);
});

test("renderDetailLine keeps plain detail text", /**
 * Verify renderDetailLine keeps plain detail text; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("landing: pool", 10, 20, svg.resolveTheme()), /landing: pool/);
});

test("renderDetailLine keeps unlabeled plain text", /**
 * Verify renderDetailLine keeps unlabeled plain text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("plain", 10, 20, svg.resolveTheme()), /plain/);
});

test("renderDetailLine pads separators after compact measurements", /**
 * Verify renderDetailLine pads separators after compact measurements; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("60m / 2 anchors", 10, 20, svg.resolveTheme()), /60m<\/text><text x="31"[^>]*stroke-width="1"[^>]*> \/ <\/text><text x="52"/);
});

test("detailLineRows wraps compact detail fields at separators", /**
 * Verify detailLineRows wraps compact detail fields at separators; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.detailLineRows("flow: medium / exposure: high", 48, "en").length, 2);
});

test("detailLineRows wraps long plain details by words", /**
 * Verify detailLineRows wraps long plain details by words; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.detailLineRows("severity: high / Avoid the final dam pool before the old metal ladder", 120, "en").length, 4);
});

test("detailLineRows preserves blank plain detail text", /**
 * Verify detailLineRows preserves blank plain detail text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.detailLineRows("   ", 1, "en"), [["   "]]);
});

test("detailLineRows returns empty rows for empty details", /**
 * Verify detailLineRows returns empty rows for empty details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.detailLineRows(""), []);
});

test("renderDetailLine places wrapped rows below the first detail row", /**
 * Verify renderDetailLine places wrapped rows below the first detail row; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDetailLine("severity: high / Avoid the final dam pool before the old metal ladder", 10, 20, svg.resolveTheme(), "en", 120), /y="34"/);
});

test("renderDetailLine returns empty markup for empty details", /**
 * Verify renderDetailLine returns empty markup for empty details; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.renderDetailLine("", 10, 20, svg.resolveTheme()), "");
});

test("renderLevelBadge renders Spanish level text", /**
 * Verify renderLevelBadge renders Spanish level text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLevelBadge("medium", 10, 20, "es"), />medio<\/text>/);
});

test("renderLevelBadge falls back to neutral category for unknown badge categories", /**
 * Verify renderLevelBadge falls back to neutral category for unknown badge categories; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLevelBadge("medium", 10, 20, "en", "unknown", svg.resolveTheme()), /vrl-detail-badge-level/);
});

test("renderLevelBadge rejects non-string inclination values", /**
 * Verify renderLevelBadge rejects non-string inclination values; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.renderLevelBadge(80, 10, 20, "en", "inclination", svg.resolveTheme()), "");
});

test("renderLevelBadge rejects non-level text", /**
 * Verify renderLevelBadge rejects non-level text; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.renderLevelBadge("technical", 10, 20), "");
});

test("resolveLevelValue maps Spanish values", /**
 * Verify resolveLevelValue maps Spanish values; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveLevelValue("medio", "es"), "medium");
});

test("resolveLevelValue rejects non-string values", /**
 * Verify resolveLevelValue rejects non-string values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveLevelValue(3), null);
});

test("renderTopoSvg uses readable progression spacing before rendering labels", /**
 * Verify renderTopoSvg uses readable progression spacing before rendering labels; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const points = validCompiled().layout.points;
  assert.equal(points.slice(1).every(/**
   * Evaluate the selection condition point.y - points[index].y >= 68.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (point, index) => point.y - points[index].y >= 68), true);
});

test("terrainProfilePath handles empty layouts", /**
 * Verify terrainProfilePath handles empty layouts; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.terrainProfilePath({ width: 100, height: 80, nodes: [] }), "M 0 80 L 100 80 L 100 26 L 0 46 Z");
});

test("terrainProfilePath follows route nodes", /**
 * Verify terrainProfilePath follows route nodes; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.terrainProfilePath(validCompiled().layout), "M 0 617 L 0 152 L 38 142 L 106 122 L 164 190 L 208 276 L 266 430 L 308 499 L 386 567 L 640 607 L 640 617 Z");
});

test("renderTerrainProfile uses terrain color", /**
 * Verify renderTerrainProfile uses terrain color; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderTerrainProfile(validCompiled().layout, svg.resolveTheme()), /fill="#d8d1bb"/);
});

test("renderWaterSegments marks pools", /**
 * Verify renderWaterSegments marks pools; arrange the scenario and make its single direct assertion. Assertion
 * and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderWaterSegments(validCompiled().layout, svg.resolveTheme()), /vrl-water-run/);
});

test("renderRouteSegments renders arrow markers for drops", /**
 * Verify renderRouteSegments renders arrow markers for drops; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRouteSegments(validCompiled().layout, svg.resolveTheme()), /marker-end="url\(#vrl-arrow\)"/);
});

test("renderRouteSegments renders ladder drops by default", /**
 * Verify renderRouteSegments renders ladder drops by default; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRouteSegments(validCompiled().layout, svg.resolveTheme()), /vrl-drop-ladder/);
});

test("renderRouteSegments defaults missing descent shape to ladder", /**
 * Verify renderRouteSegments defaults missing descent shape to ladder; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "A"\nrappel height=10m rope=20m\npool');
  assert.match(svg.renderRouteSegments(result.layout, svg.resolveTheme()), /vrl-drop-ladder/);
});

test("renderRouteSegments can render direct descent shapes", /**
 * Verify renderRouteSegments can render direct descent shapes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "A"\nrappel height=10m rope=20m shape=direct\npool');
  assert.doesNotMatch(svg.renderRouteSegments(result.layout, svg.resolveTheme()), /vrl-drop-ladder/);
});

test("renderRouteSegments marks direct technical shapes without ladder rungs", /**
 * Verify renderRouteSegments marks direct technical shapes without ladder rungs; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "A"\nrappel height=10m rope=20m shape=direct\npool');
  assert.match(svg.renderRouteSegments(result.layout, svg.resolveTheme()), /vrl-drop-direct/);
});

test("routeSegmentPath renders traverse bends", /**
 * Verify routeSegmentPath renders traverse bends; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.routeSegmentPath(validCompiled().layout.nodes[0], validCompiled().layout.nodes[1]), "M 96 108 L 113 142 L 154 176");
});

test("routeSegmentPath renders drop ledges", /**
 * Verify routeSegmentPath renders drop ledges; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.routeSegmentPath(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3]), "M 198 262 L 214 262 L 246 339 L 256 416");
});

test("dropLadderGeometry builds vertical descent coordinates by default", /**
 * Verify dropLadderGeometry builds vertical descent coordinates by default; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], { attributes: {} }), {
    startX: 198,
    startY: 262,
    dropX: 232,
    bottomX: 232,
    bottomY: 416,
    endX: 256,
    endY: 416
  });
});

test("dropLadderGeometry supports leftward drops", /**
 * Verify dropLadderGeometry supports leftward drops; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.dropLadderGeometry({ x: 50, y: 10 }, { x: 30, y: 50 }).dropX, 16);
});

test("dropLadderGeometry applies inclination to ladder angle", /**
 * Verify dropLadderGeometry applies inclination to ladder angle; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], validCompiled().model.elements[2]).bottomX, 246);
});

test("dropLadderGeometry scales technical line length from elevation profile", /**
 * Verify dropLadderGeometry scales technical line length from elevation profile; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.dropLadderGeometry({ x: 10, y: 100 }, { x: 70, y: 200 }, { attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }, { elevation: { pixelsPerMeter: 5 } }).bottomY, 110);
});

test("technicalLineVerticalDelta uses technical height and elevation scale", /**
 * Verify technicalLineVerticalDelta uses technical height and elevation scale; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.technicalLineVerticalDelta({ y: 100 }, { y: 200 }, { attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }, { elevation: { pixelsPerMeter: 5 } }), 10);
});

test("technicalLineVerticalDelta uses upward direction for scaled climbs", /**
 * Verify technicalLineVerticalDelta uses upward direction for scaled climbs; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.technicalLineVerticalDelta({ y: 200 }, { y: 100 }, { attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }, { elevation: { pixelsPerMeter: 5 } }), -10);
});

test("technicalLineVerticalDelta falls back to node spacing without elevation scale", /**
 * Verify technicalLineVerticalDelta falls back to node spacing without elevation scale; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.technicalLineVerticalDelta({ y: 100 }, { y: 200 }, { attributes: { height: { meters: 4 } } }), 100);
});

test("technicalLineVerticalDelta falls back when layout has no elevation", /**
 * Verify technicalLineVerticalDelta falls back when layout has no elevation; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.technicalLineVerticalDelta({ y: 100 }, { y: 200 }, { attributes: { height: { meters: 4 } } }, {}), 100);
});

test("renderDirectTechnicalSegment scales the direct technical slope", /**
 * Verify renderDirectTechnicalSegment scales the direct technical slope; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDirectTechnicalSegment({ x: 10, y: 100 }, { x: 70, y: 200 }, svg.resolveTheme(), { attributes: { height: { meters: 4 }, inclination: { percent: 50 } } }, { elevation: { pixelsPerMeter: 5 } }), /L 48 110/);
});

test("renderDropLadderSegment renders rungs", /**
 * Verify renderDropLadderSegment renders rungs; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDropLadderSegment(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], svg.resolveTheme()), /vrl-drop-rung/);
});

test("renderDropRungs scales rung count", /**
 * Verify renderDropRungs scales rung count; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDropRungs({ dropX: 20, startY: 10, endY: 120 }, svg.resolveTheme()), /y1="28"/);
});

test("renderDropRungs supports upward geometry", /**
 * Verify renderDropRungs supports upward geometry; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDropRungs({ dropX: 20, startY: 120, endY: 10 }, svg.resolveTheme()), /y1="102"/);
});

test("renderDropRungs handles zero-length geometry", /**
 * Verify renderDropRungs handles zero-length geometry; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderDropRungs({ dropX: 20, bottomX: 20, startY: 10, endY: 10 }, svg.resolveTheme()), /vrl-drop-rung/);
});

test("rappelStagesForElement returns normalized stages", /**
 * Verify rappelStagesForElement returns normalized stages; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.rappelStagesForElement(validCompiled().model.elements[2]).length, 2);
});

test("rappelStagesForElement defaults to an empty list", /**
 * Verify rappelStagesForElement defaults to an empty list; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.rappelStagesForElement({ attributes: {} }), []);
});

test("redirectionsForElement returns plural normalized redirections", /**
 * Verify redirectionsForElement returns plural normalized redirections; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.redirectionsForElement(validCompiled().model.elements[2]).length, 2);
});

test("redirectionsForElement returns singular normalized redirections", /**
 * Verify redirectionsForElement returns singular normalized redirections; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.redirectionsForElement({ attributes: { redirection: [{ distance: { meters: 12 }, side: "left" }] } }).length, 1);
});

test("redirectionsForElement defaults to an empty list", /**
 * Verify redirectionsForElement defaults to an empty list; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.redirectionsForElement({ attributes: {} }), []);
});

test("rappelHeightMeters reads normalized heights", /**
 * Verify rappelHeightMeters reads normalized heights; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.rappelHeightMeters(validCompiled().model.elements[2]), 35);
});

test("rappelHeightMeters defaults missing heights to zero", /**
 * Verify rappelHeightMeters defaults missing heights to zero; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.rappelHeightMeters({ attributes: {} }), 0);
});

test("rappelHeightMeters defaults missing attributes to zero", /**
 * Verify rappelHeightMeters defaults missing attributes to zero; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.rappelHeightMeters({}), 0);
});

test("rappelHeightMeters defaults missing elements to zero", /**
 * Verify rappelHeightMeters defaults missing elements to zero; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.rappelHeightMeters(), 0);
});

test("redirectionRatio uses rappel height", /**
 * Verify redirectionRatio uses rappel height; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.redirectionRatio({ distance: { meters: 12 } }, validCompiled().model.elements[2]), 12 / 35);
});

test("redirectionRatio defaults when height is absent", /**
 * Verify redirectionRatio defaults when height is absent; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.redirectionRatio({ distance: { meters: 12 } }, { attributes: {} }), 0.5);
});

test("technicalLinePoint interpolates along the technical line", /**
 * Verify technicalLinePoint interpolates along the technical line; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, 0.5), { x: 15, y: 150 });
});

test("technicalLinePoint clamps low ratios", /**
 * Verify technicalLinePoint clamps low ratios; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, -1), { x: 11, y: 105 });
});

test("technicalLinePoint clamps high ratios", /**
 * Verify technicalLinePoint clamps high ratios; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, 2), { x: 20, y: 195 });
});

test("technicalLinePoint defaults missing bottomX to dropX", /**
 * Verify technicalLinePoint defaults missing bottomX to dropX; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.technicalLinePoint({ dropX: 10, startY: 100, endY: 200 }, 0.5), { x: 10, y: 150 });
});

test("renderStageBoundary renders stage boundary marks", /**
 * Verify renderStageBoundary renders stage boundary marks; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderStageBoundary({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, 0.5, svg.resolveTheme()), /vrl-rappel-stage-boundary/);
});

test("renderRappelStageMarkers renders stage labels", /**
 * Verify renderRappelStageMarkers renders stage labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRappelStageMarkers(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], validCompiled().model.elements[2]), validCompiled().model.elements[2], svg.resolveTheme()), /vrl-rappel-stage-label/);
});

test("renderRappelStageMarkers places leftward labels after the marker", /**
 * Verify renderRappelStageMarkers places leftward labels after the marker; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRappelStageMarkers({ dropX: 20, bottomX: 10, startY: 100, endY: 200 }, { attributes: { stages: [{ meters: 20 }, { meters: 15 }] } }, svg.resolveTheme()), /text-anchor="start"/);
});

test("renderRedirectionMarkers renders redirection anchors", /**
 * Verify renderRedirectionMarkers renders redirection anchors; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRedirectionMarkers(svg.dropLadderGeometry(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3], validCompiled().model.elements[2]), validCompiled().model.elements[2], svg.resolveTheme()), /vrl-redirection-anchor/);
});

test("renderRedirectionMarkers handles geometry without bottomX", /**
 * Verify renderRedirectionMarkers handles geometry without bottomX; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 20, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "left" }] } }, svg.resolveTheme()), /text-anchor="start"/);
});

test("renderRedirectionMarkers omits unknown side text", /**
 * Verify renderRedirectionMarkers omits unknown side text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 10, bottomX: 20, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "unknown" }] } }, svg.resolveTheme()), /Redirection anchor 12m/);
});

test("renderRedirectionMarkers places leftward labels after the marker", /**
 * Verify renderRedirectionMarkers places leftward labels after the marker; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 20, bottomX: 10, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "left" }] } }, svg.resolveTheme()), /text-anchor="end"/);
});

test("renderRedirectionMarkers abbreviates right labels", /**
 * Verify renderRedirectionMarkers abbreviates right labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderRedirectionMarkers({ dropX: 20, bottomX: 10, startY: 100, endY: 200 }, { attributes: { height: { meters: 35 }, redirections: [{ distance: { meters: 12 }, side: "right" }] } }, svg.resolveTheme()), />12m R<\/text>/);
});

test("renderSegmentLabels includes traverse labels", /**
 * Verify renderSegmentLabels includes traverse labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderSegmentLabels(validCompiled().layout, svg.resolveTheme()), /50m/);
});

test("segmentLabel uses traverse before walk distance", /**
 * Verify segmentLabel uses traverse before walk distance; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.segmentLabel({ element: { attributes: {} } }, validCompiled().layout.nodes[2]), "50m");
});

test("segmentLabel ignores implicit walk distances", /**
 * Verify segmentLabel ignores implicit walk distances; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.segmentLabel(validCompiled().layout.nodes[0], validCompiled().layout.nodes[1]), "");
});

test("segmentLabel returns empty for unlabeled segments", /**
 * Verify segmentLabel returns empty for unlabeled segments; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.segmentLabel(validCompiled().layout.nodes[3], validCompiled().layout.nodes[4]), "");
});

test("segmentLabelPosition uses segment midpoint", /**
 * Verify segmentLabelPosition uses segment midpoint; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(svg.segmentLabelPosition(validCompiled().layout.nodes[1], validCompiled().layout.nodes[2]), { x: 176, y: 212 });
});

test("segmentTechnicalElement uses outgoing rappel elements", /**
 * Verify segmentTechnicalElement uses outgoing rappel elements; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.segmentTechnicalElement(validCompiled().layout.nodes[2], validCompiled().layout.nodes[3]).type, "rappel");
});

test("segmentTechnicalElement uses incoming climb elements", /**
 * Verify segmentTechnicalElement uses incoming climb elements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.segmentTechnicalElement({ element: { type: "walk" } }, { element: { type: "climb" } }).type, "climb");
});

test("segmentTechnicalElement ignores ordinary segments", /**
 * Verify segmentTechnicalElement ignores ordinary segments; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.segmentTechnicalElement(validCompiled().layout.nodes[0], validCompiled().layout.nodes[1]), null);
});

test("renderStationTicks marks drop stations", /**
 * Verify renderStationTicks marks drop stations; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderStationTicks(validCompiled().layout, svg.resolveTheme()), /vrl-station-tick/);
});

test("renderStationTicks clears route lines under stations", /**
 * Verify renderStationTicks clears route lines under stations; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderStationTicks(validCompiled().layout, svg.resolveTheme()), /vrl-station-tick-clearance/);
});

test("renderStationTicks skips technical nodes without station data", /**
 * Verify renderStationTicks skips technical nodes without station data; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.renderStationTicks({ nodes: [{ x: 10, y: 20, element: { type: "rappel", attributes: {} } }] }, svg.resolveTheme()), "");
});

test("renderStationTick offsets right station ticks", /**
 * Verify renderStationTick offsets right station ticks; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderStationTick({ x: 10, y: 20, element: { attributes: { station: "right" } } }, svg.resolveTheme()), /x1="18"/);
});

test("renderNode renders hazard symbols", /**
 * Verify renderNode renders hazard symbols; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[5], svg.resolveTheme()), /vrl-symbol-hazard/);
});

test("renderNode renders standard federation symbols", /**
 * Verify renderNode renders standard federation symbols; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[0], svg.resolveTheme()), />IN<\/text>/);
});

test("renderNode strokes labels for line clearance", /**
 * Verify renderNode strokes labels for line clearance; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderNode(validCompiled().layout.nodes[2], svg.resolveTheme()), /paint-order="stroke"/);
});

test("renderNodes stacks close node labels", /**
 * Verify renderNodes stacks close node labels; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderNodes({ width: 120, nodes: [{ x: 10, y: 20, element: { type: "walk", id: "W1", attributes: { distance: { meters: 10 } } } }, { x: 12, y: 22, element: { type: "pool", id: "P1", attributes: { type: "deep" } } }] }, svg.resolveTheme()), /vrl-label-leader/);
});

test("renderNodes leaves compact symbol-only nodes unstacked", /**
 * Verify renderNodes leaves compact symbol-only nodes unstacked; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.doesNotMatch(svg.renderNodes({ width: 120, nodes: [{ x: 10, y: 20, element: { type: "pool", id: "P1", attributes: {} } }] }, svg.resolveTheme()), /vrl-label-leader/);
});

test("renderNode skips visible labels for symbol-only nodes without details", /**
 * Verify renderNode skips visible labels for symbol-only nodes without details; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.doesNotMatch(svg.renderNode({ x: 10, y: 20, element: { type: "pool", id: "P1", label: null, attributes: {} } }, svg.resolveTheme()), /x="38" y="11"/);
});

test("nodeLabelPlacement honors minimum label positions", /**
 * Verify nodeLabelPlacement honors minimum label positions; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.nodeLabelPlacement({ x: 10, y: 20, element: { type: "walk" } }, 50).titleY, 50);
});

test("renderLabelLeader skips natural labels", /**
 * Verify renderLabelLeader skips natural labels; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.renderLabelLeader({ x: 10, y: 20 }, { labelX: 38, titleY: 11 }, svg.resolveTheme()), "");
});

test("renderLabelLeader draws shifted labels", /**
 * Verify renderLabelLeader draws shifted labels; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderLabelLeader({ x: 10, y: 20 }, { labelX: 38, titleY: 50 }, svg.resolveTheme()), /vrl-label-leader/);
});

test("renderAnchorMarks renders anchor count marks", /**
 * Verify renderAnchorMarks renders anchor count marks; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderAnchorMarks(validCompiled().layout.nodes[2], validCompiled().model.elements[2], svg.resolveTheme()), /aria-label="2 anchors"/);
});

test("renderAnchorMarks can place marks right", /**
 * Verify renderAnchorMarks can place marks right; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderAnchorMarks({ x: 10, y: 20 }, { attributes: { anchor_count: 1 } }, svg.resolveTheme(), "right"), /cx="24"/);
});

test("renderAnchorMarks skips missing anchor counts", /**
 * Verify renderAnchorMarks skips missing anchor counts; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.renderAnchorMarks(validCompiled().layout.nodes[0], validCompiled().model.elements[0], svg.resolveTheme()), "");
});

test("anchorMarkCount caps visible marks", /**
 * Verify anchorMarkCount caps visible marks; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.anchorMarkCount({ attributes: { anchor_count: "9" } }), 4);
});

test("anchorMarkCount rejects invalid counts", /**
 * Verify anchorMarkCount rejects invalid counts; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.anchorMarkCount({ attributes: { anchor_count: "bad" } }), 0);
});

test("formatElementTitle falls back to element type", /**
 * Verify formatElementTitle falls back to element type; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementTitle({ type: "custom", id: null, label: null }), "custom");
});

test("formatElementTitle includes generated identifiers", /**
 * Verify formatElementTitle includes generated identifiers; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementTitle(validCompiled().model.elements[2]), "Rappel R1");
});

test("formatElementTitle supports Spanish labels", /**
 * Verify formatElementTitle supports Spanish labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementTitle(validCompiled().model.elements[2], "es"), "Rapel R1");
});

test("formatElementDetail formats rappel details", /**
 * Verify formatElementDetail formats rappel details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[2]), "35m / 70m / bolts");
});

test("formatElementDetail supports Spanish values", /**
 * Verify formatElementDetail supports Spanish values; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[4], "es"), "4m / exposicion: medio");
});

test("formatElementDetail formats walk details", /**
 * Verify formatElementDetail formats walk details; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[1]), "120m");
});

test("formatElementDetail formats downclimb details", /**
 * Verify formatElementDetail formats downclimb details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[4]), "4m / exposure: medium");
});

test("formatElementDetail formats note details", /**
 * Verify formatElementDetail formats note details; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail(core.normalizeRoute(core.parseVrl('route "A"\nnote "Low water"').ast).elements[0]), "Low water");
});

test("formatElementDetail handles empty note details", /**
 * Verify formatElementDetail handles empty note details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail({ type: "note", attributes: {} }), "");
});

test("formatElementDetail formats hazard severity before notes", /**
 * Verify formatElementDetail formats hazard severity before notes; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[5]), "severity: high / Avoid after heavy rain");
});

test("formatElementDetail falls back to hazard type without notes", /**
 * Verify formatElementDetail falls back to hazard type without notes; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail({ type: "hazard", attributes: { type: "swift_water" } }), "swift_water");
});

test("formatElementDetail formats default type attributes", /**
 * Verify formatElementDetail formats default type attributes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail(validCompiled().model.elements[3]), "deep");
});

test("formatElementDetail returns empty detail for unknown empty elements", /**
 * Verify formatElementDetail returns empty detail for unknown empty elements; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail({ type: "custom", attributes: {} }), "");
});

test("formatMeasurement rejects non-measurements", /**
 * Verify formatMeasurement rejects non-measurements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatMeasurement("35m"), "");
});

test("renderNode uses fallback colors for unknown elements", /**
 * Verify renderNode uses fallback colors for unknown elements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderNode({ id: "X1", element: { type: "custom", id: "X1", label: null, attributes: {} }, x: 10, y: 10 }, svg.resolveTheme()), /stroke="#111111"/);
});

test("renderSymbolMarker renders snake extension glyphs", /**
 * Verify renderSymbolMarker renders snake extension glyphs; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 10 }, { type: "hazard", id: "H1", attributes: { type: "snake" } }, "#b42318"), /vrl-symbol-snake/);
});

test("renderSymbolMarker renders clearance halos", /**
 * Verify renderSymbolMarker renders clearance halos; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 10 }, { type: "walk", id: "W1", attributes: {} }, "#111111"), /vrl-symbol-clearance/);
});

test("renderSymbolMarker spaces standard letters above the node circle", /**
 * Verify renderSymbolMarker spaces standard letters above the node circle; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 20 }, { type: "rappel", id: "R1", attributes: {} }, "#111111"), /<text x="10" y="5"/);
});

test("renderSymbolMarker falls back to black stroke", /**
 * Verify renderSymbolMarker falls back to black stroke; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(svg.renderSymbolMarker({ x: 10, y: 10 }, { type: "custom", id: "X1", attributes: {} }, ""), /stroke="#111111"/);
});

test("formatTopoLabel formats starts by label", /**
 * Verify formatTopoLabel formats starts by label; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoLabel(validCompiled().model.elements[0]), "Entrance");
});

test("formatTopoLabel falls back for unlabeled exits", /**
 * Verify formatTopoLabel falls back for unlabeled exits; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoLabel({ type: "exit", id: "E1", label: null, attributes: {} }), "Exit E1");
});

test("formatTopoLabel formats rappel height labels", /**
 * Verify formatTopoLabel formats rappel height labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoLabel(validCompiled().model.elements[2]), "R1, 35m");
});

test("formatTopoLabel omits generic walk labels", /**
 * Verify formatTopoLabel omits generic walk labels; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoLabel(validCompiled().model.elements[1]), "");
});

test("formatTopoLabel omits generic pool labels", /**
 * Verify formatTopoLabel omits generic pool labels; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoLabel(validCompiled().model.elements[3]), "");
});

test("formatTopoLabel omits generic hazard labels", /**
 * Verify formatTopoLabel omits generic hazard labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoLabel(validCompiled().model.elements[5]), "");
});

test("formatTopoDetail formats rappel rope labels", /**
 * Verify formatTopoDetail formats rappel rope labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[2]), "70m / 2 anchors / landing: pool / flow: medium / 80%");
});

test("formatTopoDetail supports Spanish values", /**
 * Verify formatTopoDetail supports Spanish values; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[2], null, "es"), "70m / 2 anclajes / llegada: poza / flujo: medio / 80%");
});

test("formatTopoDetail uses singular Spanish anchor labels", /**
 * Verify formatTopoDetail uses singular Spanish anchor labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail({ type: "rappel", attributes: { rope: { meters: 20 }, anchor_count: 1 } }, null, "es"), "20m / 1 anclaje");
});

test("formatTopoDetail formats downclimb landing labels", /**
 * Verify formatTopoDetail formats downclimb landing labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[4]), "4m / exposure: medium / landing: ledge / 65%");
});

test("formatTopoDetail keeps plain rappel details without expressive fields", /**
 * Verify formatTopoDetail keeps plain rappel details without expressive fields; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail({ type: "rappel", attributes: { rope: { meters: 20 } } }), "20m");
});

test("formatTopoDetail omits empty landing labels", /**
 * Verify formatTopoDetail omits empty landing labels; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail({ type: "rappel", attributes: { rope: { meters: 20 }, landing: "" } }), "20m");
});

test("formatTopoDetail formats singular redirection counts", /**
 * Verify formatTopoDetail formats singular redirection counts; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail({ type: "rappel", attributes: { rope: { meters: 20 }, redirections: [{ distance: { meters: 12 }, side: "left" }] } }), "20m");
});

test("formatTopoDetail keeps plain downclimb details without landings", /**
 * Verify formatTopoDetail keeps plain downclimb details without landings; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail({ type: "downclimb", attributes: { height: { meters: 4 }, exposure: "medium" } }), "4m / exposure: medium");
});

test("formatTopoDetail falls back for non-descents", /**
 * Verify formatTopoDetail falls back for non-descents; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[3]), "deep");
});

test("formatTopoDetail formats climb details", /**
 * Verify formatTopoDetail formats climb details; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail({ type: "climb", attributes: { height: { meters: 5 }, inclination: { percent: 55 } } }), "5m / 55%");
});

test("formatTopoDetail formats node elevations", /**
 * Verify formatTopoDetail formats node elevations; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail(validCompiled().model.elements[0], validCompiled().layout.nodes[0]), "1240m");
});

test("formatTopoDetail omits missing node elevations", /**
 * Verify formatTopoDetail omits missing node elevations; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatTopoDetail({ type: "start", attributes: {} }), "");
});

test("needsSegmentArrow detects rappel segments", /**
 * Verify needsSegmentArrow detects rappel segments; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.needsSegmentArrow(validCompiled().model.elements[2]), true);
});

test("needsSegmentArrow detects downclimb segments", /**
 * Verify needsSegmentArrow detects downclimb segments; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.needsSegmentArrow(validCompiled().model.elements[4]), true);
});

test("needsSegmentArrow detects climb segments", /**
 * Verify needsSegmentArrow detects climb segments; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.needsSegmentArrow({ type: "climb" }), true);
});

test("needsSegmentArrow rejects walk segments", /**
 * Verify needsSegmentArrow rejects walk segments; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.needsSegmentArrow(validCompiled().model.elements[1]), false);
});

test("inclinationPercent uses normalized inclination", /**
 * Verify inclinationPercent uses normalized inclination; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.inclinationPercent(validCompiled().model.elements[2]), 80);
});

test("inclinationPercent defaults to vertical", /**
 * Verify inclinationPercent defaults to vertical; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.inclinationPercent({ attributes: {} }), 100);
});

test("inclinationPercent ignores malformed normalized values", /**
 * Verify inclinationPercent ignores malformed normalized values; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.inclinationPercent({ attributes: { inclination: { value: 70 } } }), 100);
});

test("formatElementDetail handles partial rappel details", /**
 * Verify formatElementDetail handles partial rappel details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail({ type: "rappel", attributes: { height: { meters: 12 } } }), "12m");
});

test("formatElementDetail handles empty downclimb details", /**
 * Verify formatElementDetail handles empty downclimb details; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.formatElementDetail({ type: "downclimb", attributes: {} }), "");
});

test("resolveSymbolProfile returns known profiles", /**
 * Verify resolveSymbolProfile returns known profiles; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveSymbolProfile("spanish").pool, "P");
});

test("resolveSymbolProfile defaults unknown profiles", /**
 * Verify resolveSymbolProfile defaults unknown profiles; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveSymbolProfile("unknown").pool, "V");
});

test("symbolCode uses federation rappel code", /**
 * Verify symbolCode uses federation rappel code; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolCode(validCompiled().model.elements[2]), "R");
});

test("symbolCode uses Spanish pool code", /**
 * Verify symbolCode uses Spanish pool code; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolCode(validCompiled().model.elements[3], "spanish"), "P");
});

test("symbolCode uses fallback element identifiers", /**
 * Verify symbolCode uses fallback element identifiers; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolCode({ type: "custom", id: "X9", attributes: {} }), "X9");
});

test("symbolCode uses unknown fallback for missing identifiers", /**
 * Verify symbolCode uses unknown fallback for missing identifiers; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolCode({ type: "custom", id: null, attributes: {} }), "?");
});

test("symbolCode uses snake extension code", /**
 * Verify symbolCode uses snake extension code; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolCode({ type: "hazard", id: "H1", attributes: { type: "snake_dense_area" } }), "SN");
});

test("isSnakeHazard detects snake hazard types", /**
 * Verify isSnakeHazard detects snake hazard types; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.isSnakeHazard({ type: "hazard", attributes: { type: "serpiente" } }), true);
});

test("isSnakeHazard rejects non-hazard snake attributes", /**
 * Verify isSnakeHazard rejects non-hazard snake attributes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.isSnakeHazard({ type: "note", attributes: { type: "snake" } }), false);
});

test("isSnakeHazard rejects ordinary hazards", /**
 * Verify isSnakeHazard rejects ordinary hazards; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.isSnakeHazard({ type: "hazard", attributes: { type: "swift_water" } }), false);
});

test("symbolKind identifies snake extensions", /**
 * Verify symbolKind identifies snake extensions; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolKind({ type: "hazard", attributes: { type: "snake" } }), "snake");
});

test("symbolKind identifies ordinary hazards", /**
 * Verify symbolKind identifies ordinary hazards; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolKind({ type: "hazard", attributes: { type: "swift_water" } }), "hazard");
});

test("symbolKind identifies standard symbols", /**
 * Verify symbolKind identifies standard symbols; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.symbolKind({ type: "rappel", attributes: {} }), "standard");
});

test("escapeXml escapes markup characters", /**
 * Verify escapeXml escapes markup characters; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.escapeXml('<a b="c">&'), "&lt;a b=&quot;c&quot;&gt;&amp;");
});

test("compileRoute returns ok for valid input", /**
 * Verify compileRoute returns ok for valid input; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(validCompiled().ok, true);
});

test("compileRoute returns invalid for syntax errors", /**
 * Verify compileRoute returns invalid for syntax errors; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRoute("teleport").ok, false);
});

test("compileRoute includes JSON export", /**
 * Verify compileRoute includes JSON export; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(validCompiled().json, /"requiredRopeMeters": 70/);
});

test("createRouteCompiler accepts injected layout ports", /**
 * Verify createRouteCompiler accepts injected layout ports; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.createRouteCompiler({ /**
   * Supply the layout test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing width.
   */ layout: () => ({ width: 1 }) })(VALID_SOURCE).layout.width, 1);
});

test("compileRouteWithDependencies accepts injected export ports", /**
 * Verify compileRouteWithDependencies accepts injected export ports; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.compileRouteWithDependencies("", {}, {
    /**
     * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing ast, diagnostics.
     */
    parse: () => ({ ast: { name: "A", metadata: {}, elements: [] }, diagnostics: [] }),
    /**
     * Supply the validate test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Array} The ordered records or values assembled above.
     */
    validate: () => [],
    /**
     * Supply the normalize test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing name, elements.
     */
    normalize: () => ({ name: "A", elements: [] }),
    /**
     * Supply the layout test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing height.
     */
    layout: () => ({ height: 1 }),
    /**
     * Supply the exportJson test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {string} The literal "json" for this branch.
     */
    exportJson: () => "json"
  }).json, "json");
});

test("exportRouteJson serializes models", /**
 * Verify exportRouteJson serializes models; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.exportRouteJson({ name: "A" }), '{\n  "name": "A"\n}');
});

test("createVrlDiagramComponent requires React", /**
 * Verify createVrlDiagramComponent requires React; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise createVrlDiagramComponent so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by createVrlDiagramComponent.
   */ () => createVrlDiagramComponent(null), TypeError);
});

test("createVrlDiagramComponent requires createElement", /**
 * Verify createVrlDiagramComponent requires createElement; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise createVrlDiagramComponent so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by createVrlDiagramComponent.
   */ () => createVrlDiagramComponent({}), TypeError);
});

test("createVrlReactDiagramState renders valid SVG", /**
 * Verify createVrlReactDiagramState renders valid SVG; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(createVrlReactDiagramState(VALID_SOURCE).svg, /<svg/);
});

test("createVrlReactDiagramState reports invalid sources", /**
 * Verify createVrlReactDiagramState reports invalid sources; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(createVrlReactDiagramState("teleport").ok, false);
});

test("React adapter renders valid SVG containers", /**
 * Verify React adapter renders valid SVG containers; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE }).type, "div");
});

test("React adapter renders diagnostics", /**
 * Verify React adapter renders diagnostics; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: "teleport" }).type, "pre");
});

test("React adapter applies container props", /**
 * Verify React adapter applies container props; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE, containerProps: { id: "route" } }).child.props.id, "route");
});

test("React adapter applies custom class names", /**
 * Verify React adapter applies custom class names; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE, className: "custom-route" }).child.props.className, "custom-route");
});

test("React adapter applies custom roles", /**
 * Verify React adapter applies custom roles; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: VALID_SOURCE, role: "presentation" }).child.props.role, "presentation");
});

test("React adapter applies diagnostics props", /**
 * Verify React adapter applies diagnostics props; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: "teleport", diagnosticsProps: { id: "diagnostics" } }).props.id, "diagnostics");
});

test("React adapter applies diagnostics class names", /**
 * Verify React adapter applies diagnostics class names; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  assert.equal(Component({ source: "teleport", diagnosticsClassName: "custom-diagnostics" }).props.className, "custom-diagnostics");
});

test("React adapter supports default source", /**
 * Verify React adapter supports default source; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) }, { source: VALID_SOURCE });
  assert.equal(Component().type, "div");
});

test("React adapter supports injected diagram state", /**
 * Verify React adapter supports injected diagram state; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project type, props, child into the record required by createElement.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @param {unknown} child - Current child node or record during recursive traversal.
   * @returns {Object} A record containing type, props, child.
   */ createElement: (type, props, child) => ({ type, props, child }) });
  const state = createVrlReactDiagramState(VALID_SOURCE);
  assert.equal(Component({ diagram: state }).child.props.dangerouslySetInnerHTML.__html, state.svg);
});

test("createVrlSvelteDiagramState renders valid SVG", /**
 * Verify createVrlSvelteDiagramState renders valid SVG; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(createVrlSvelteDiagramState(VALID_SOURCE).svg, /<svg/);
});

test("createVrlSvelteDiagramState reports invalid sources", /**
 * Verify createVrlSvelteDiagramState reports invalid sources; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(createVrlSvelteDiagramState("teleport").ok, false);
});

test("Svelte helper renders valid SVG markup", /**
 * Verify Svelte helper renders valid SVG markup; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(renderVrlSvelteMarkup(VALID_SOURCE), /class="vrl-diagram"/);
});

test("Svelte helper renders diagnostics", /**
 * Verify Svelte helper renders diagnostics; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(renderVrlSvelteMarkup("teleport"), /vrl-diagram__diagnostics/);
});

test("Svelte helper applies custom class names", /**
 * Verify Svelte helper applies custom class names; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(renderVrlSvelteMarkup(VALID_SOURCE, {}, { className: "custom-route" }), /class="custom-route"/);
});

test("Svelte helper applies custom roles", /**
 * Verify Svelte helper applies custom roles; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(renderVrlSvelteMarkup(VALID_SOURCE, {}, { role: "presentation" }), /role="presentation"/);
});

test("Svelte helper escapes diagnostics classes", /**
 * Verify Svelte helper escapes diagnostics classes; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(renderVrlSvelteMarkup("teleport", {}, { diagnosticsClassName: "bad\"class" }), /class="bad&quot;class"/);
});

test("Svelte helper supports injected diagram state", /**
 * Verify Svelte helper supports injected diagram state; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const state = createVrlSvelteDiagramState(VALID_SOURCE);
  assert.match(renderVrlSvelteMarkup("", {}, { diagram: state }), /<svg/);
});

test("createVrlSvelteKitData renders valid data", /**
 * Verify createVrlSvelteKitData renders valid data; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(createVrlSvelteKitData(VALID_SOURCE).ok, true);
});

test("createVrlSvelteKitData reports invalid data", /**
 * Verify createVrlSvelteKitData reports invalid data; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(createVrlSvelteKitData("teleport").ok, false);
});

test("createVrlSvelteKitLoad returns default keys", /**
 * Verify createVrlSvelteKitLoad returns default keys; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const load = createVrlSvelteKitLoad({ source: VALID_SOURCE });
  assert.equal((await load({})).vrl.ok, true);
});

test("createVrlSvelteKitLoad returns custom keys", /**
 * Verify createVrlSvelteKitLoad returns custom keys; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const load = createVrlSvelteKitLoad({ source: VALID_SOURCE, key: "diagram" });
  assert.equal(Object.hasOwn(await load({}), "diagram"), true);
});

test("createVrlSvelteKitLoad resolves source factories", /**
 * Verify createVrlSvelteKitLoad resolves source factories; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const load = createVrlSvelteKitLoad({ /**
   * Supply the source test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @param {unknown} event - SvelteKit request event or independently specified technical event.
   * @returns {unknown} The event.locals.source value selected or validated above.
   */ source: (event) => event.locals.source });
  assert.equal((await load({ locals: { source: VALID_SOURCE } })).vrl.ok, true);
});

test("createVrlSvelteKitLoad resolves option factories", /**
 * Verify createVrlSvelteKitLoad resolves option factories; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const load = createVrlSvelteKitLoad({ source: VALID_SOURCE, /**
   * Supply the options test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing symbology.
   */ options: () => ({ symbology: "spanish" }) });
  assert.match((await load({})).vrl.svg, />P<\/text>/);
});

test("createVrlSvelteKitLoad rejects invalid keys", /**
 * Verify createVrlSvelteKitLoad rejects invalid keys; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise createVrlSvelteKitLoad so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by createVrlSvelteKitLoad.
   */ () => createVrlSvelteKitLoad({ source: VALID_SOURCE, key: "" }), TypeError);
});

test("createVrlSvelteKitLoad rejects invalid sources", /**
 * Verify createVrlSvelteKitLoad rejects invalid sources; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise createVrlSvelteKitLoad so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by createVrlSvelteKitLoad.
   */ () => createVrlSvelteKitLoad({ source: null }), TypeError);
});
