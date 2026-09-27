import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, normalizeRoute, parseVrl, parseMeasurementToken, summarizeRouteMeasurements } from "@subvertic/vrl-core";
import { renderTopoSvg, renderRouteText, formatElementDetail } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

const source = 'route "Synthetic unknown rope"\nrappel R1 height=12m rope=unknown anchor=bolts';

test("explicit unknown rope survives normalization and JSON without changing physical descent", /**
 * Compare normalized/serialized uncertainty and declared-height motion with independently specified facts.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of identity, rope, height and canonical movement.
 */ () => {
  const result = compileRoute(source);
  const exported = JSON.parse(result.json);
  assert.deepEqual([result.ok, result.model.elements[0].attributes, exported.elements[0].attributes.rope, exported.traversal.segments],
    [true, {height:{value:12,unit:"m",meters:12},rope:"unknown",anchor:"bolts"}, "unknown", [{from:0,to:1,elementIndex:0,kind:"technical",direction:"down",verticalDeltaMeters:-12}]]);
});

test("unknown rope warning identifies the authored field and does not block output", /**
 * Verify diagnostic severity, stable code and exact UTF-16 value span for the explicit sentinel.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of source-located nonblocking uncertainty.
 */ () => {
  const result = compileRoute(source), diagnostic = result.diagnostics[0];
  assert.deepEqual([result.ok, result.diagnostics.length, diagnostic.kind, diagnostic.code, diagnostic.severity, diagnostic.location, diagnostic.span],
    [true, 1, "validation", "VRL_ROPE_LENGTH_UNKNOWN", "warning", {line:2,column:27}, {start:{line:2,column:27},end:{line:2,column:34}}]);
});

test("direct normalization accepts explicit unknown while preserving ownership and determinism", /**
 * Exercise the domain normalization boundary independently of the compiler validator.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of detached and repeatable unknown data.
 */ () => {
  const ast = parseVrl(source).ast, first = normalizeRoute(ast), second = normalizeRoute(ast);
  first.elements[0].attributes.rope = {value:24,unit:"m",meters:24};
  assert.deepEqual([ast.elements[0].attributes.rope, second.elements[0].attributes.rope], ["unknown", "unknown"]);
});

test("unknown rope is not a generic metric token", /**
 * Keep the reusable numeric parser independent of the scoped declaration sentinel.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of strict token rejection.
 */ () => { assert.equal(parseMeasurementToken("unknown").ok, false); });

test("quoted unknown rope retains the same sentinel and a span including its quotes", /**
 * Verify decoded token semantics and source fidelity for the quoted spelling independently of the bare form.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the retained sentinel and exact authored value span.
 */ () => {
  const result = compileRoute('route Example\nrappel R1 height=12m rope="unknown"');
  assert.deepEqual([result.ok, result.model.elements[0].attributes.rope, result.diagnostics[0].span],
    [true, "unknown", {start:{line:2,column:27},end:{line:2,column:36}}]);
});

test("all unknown ropes yield a null observed maximum and zero numeric declaration count", /**
 * Keep unknown evidence distinct from zero in the explicit summary while retaining the legacy aggregate.
 * @responsibility coordinator
 * @returns {void} Completes one assertion with independently specified observation counts and values.
 */ () => {
  const result = compileRoute(source), summary = summarizeRouteMeasurements(result.model.elements);
  assert.deepEqual([summary.maximumDeclaredRopeMeters, summary.declaredRopeCount, summary.rappelCount, result.model.summary.requiredRopeMeters], [null, 0, 1, 0]);
});

test("mixed known and unknown ropes count only numeric declarations", /**
 * Preserve all rappel owners while excluding unknown rope from numeric maxima and observed counts.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of partial observations.
 */ () => {
  const result = compileRoute(`${source}\nrappel R2 height=5m rope=20m\nrappel R3 height=4m rope=unknown`);
  const summary = summarizeRouteMeasurements(result.model.elements);
  assert.deepEqual([summary.maximumDeclaredRopeMeters, summary.declaredRopeCount, summary.rappelCount, result.model.summary.requiredRopeMeters], [20, 1, 3, 20]);
});

test("known stage lengths never become a declared rope total", /**
 * Retain independent stage facts without filling an unknown rope from them or the physical height.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of rope uncertainty and unchanged declared stages.
 */ () => {
  const result = compileRoute(source+' stages=5m+7m redirection=6m:right');
  assert.deepEqual([result.model.elements[0].attributes.rope, result.model.elements[0].attributes.stages, result.diagnostics.length], ["unknown", [{value:5,unit:"m",meters:5},{value:7,unit:"m",meters:7}], 1]);
});

test("unknown rope does not suppress stage mismatch warnings", /**
 * Preserve independent relationship validation alongside the new nonblocking uncertainty warning.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of both warning identities.
 */ () => {
  const result = compileRoute(source+' stages=5m+6m');
  assert.deepEqual(result.diagnostics.map(/**
   * Select diagnostic identity in emitted order.
   * @responsibility computation
   * @param {Object} item - Emitted validation diagnostic.
   * @returns {string} Stable diagnostic code.
   */ item => item.code), ["VRL_ROPE_LENGTH_UNKNOWN", "VRL_STAGE_TOTAL_MISMATCH"]);
});

const invalid = [
  ['missing rope', 'rappel R1 height=12m', 'VRL_FIELD_REQUIRED'],
  ['empty rope', 'rappel R1 height=12m rope=""', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['zero rope', 'rappel R1 height=12m rope=0m', 'VRL_FIELD_MEASUREMENT_RANGE'],
  ['negative rope', 'rappel R1 height=12m rope=-1m', 'VRL_FIELD_MEASUREMENT_RANGE'],
  ['nonmetric rope', 'rappel R1 height=12m rope=40ft', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['different sentinel case', 'rappel R1 height=12m rope=UNKNOWN', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['padded sentinel', 'rappel R1 height=12m rope=" unknown "', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['unknown height', 'rappel R1 height=unknown rope=unknown', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['unknown walk distance', 'walk W1 distance=unknown', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['unknown metadata rope', 'metadata rope=unknown', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['unknown climb rope', 'climb C1 height=3m rope=unknown', 'VRL_FIELD_MEASUREMENT_SYNTAX'],
  ['unknown stages', 'rappel R1 height=12m rope=unknown stages=unknown', 'VRL_FIELD_STAGES_SYNTAX'],
  ['outside redirection', 'rappel R1 height=12m rope=unknown redirection=12m:left', 'VRL_REDIRECTION_OUTSIDE_HEIGHT'],
  ['duplicate declaration', 'rappel R1 height=12m rope=unknown rope=24m', 'VRL_SYNTAX_DUPLICATE_ATTRIBUTE']
];
for (const [name, statement, code] of invalid) {
  test(`unknown rope contract rejects ${name} without downstream artifacts`, /**
   * Preserve field/syntax failures and compiler short-circuit behavior for a deliberately invalid source.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of expected error presence and absent output.
   */ () => {
    const result = compileRoute(`route "Synthetic invalid declaration"\n${statement}`);
    assert.deepEqual([result.ok, result.diagnostics.some(/**
     * Find the independently declared blocking error without hiding any output-state assertion.
     * @responsibility computation
     * @param {Object} diagnostic - Emitted source diagnostic.
     * @returns {boolean} Whether both the expected code and error severity match.
     */ diagnostic => diagnostic.code === code && diagnostic.severity === "error"), result.model, result.layout, result.json], [false,true,null,null,null]);
  });
}

test("direct normalization still rejects unknown rope outside a rappel", /**
 * Prevent alternate compiler validators from bypassing the domain-owned scope rule.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the domain invariant failure.
 */ () => {
  const ast = parseVrl('route Invalid\nwalk W1 rope=unknown').ast;
  assert.throws(/**
   * Invoke normalization with the deliberately forbidden scoped declaration.
   * @responsibility coordinator
   * @returns {Object} Unreachable normalized model; the expected RangeError propagates.
   */ () => normalizeRoute(ast), RangeError);
});

test("summary does not accept the unknown sentinel for walk distance", /**
 * Keep malformed direct helper inputs distinct from the permitted unknown rappel rope.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of a strict summary-input failure.
 */ () => {
  assert.throws(/**
   * Invoke the summary with an unsupported direct distance value.
   * @responsibility coordinator
   * @returns {Object} Unreachable summary; the expected TypeError propagates.
   */ () => summarizeRouteMeasurements([{type:"walk",attributes:{distance:"unknown"}}]), TypeError);
});

for (const language of ["en", "es"]) {
  const ropeText = language === "en" ? "declared rope: unknown" : "cuerda declarada: desconocido";
  for (const options of [{}, {style:"soft-terrain"}, {style:"soft-terrain",flow:"rows",monochrome:true}, {style:"soft-terrain",flow:"rows",theme:"dark",symbols:"minimal"}]) {
    test(`explicit unknown rope stays visible and accessible in ${language}/${JSON.stringify(options)}`, /**
     * Decode real SVG text and its description, requiring a localized unknown label and complete bounds.
     * @responsibility coordinator
     * @returns {void} Completes one assertion of visible/textual uncertainty without clipping.
     */ () => {
      const result = compileRoute(source,{layout:{width:320}});
      const document = documentFor(renderTopoSvg(result.model,result.layout,{...options,language}));
      const parts=[];
      for(const node of document.getElementsByTagName("text")) parts.push(node.textContent);
      const visible=parts.join(" ").replace(/\s+/g," ").toLowerCase();
      assert.deepEqual([visible.includes(ropeText), document.getElementsByTagName("desc")[0].textContent.toLowerCase().includes(ropeText), clippedPrimitives(document)], [true,true,[]]);
    });
  }
  test(`visible HTML preserves unknown rope in ${language}`, /**
   * Verify the external-image text alternative retains the explicit localized rope fact.
   * @responsibility coordinator
   * @returns {void} Completes one assertion against decoded HTML text.
   */ () => {
    const result=compileRoute(source), document=documentFor(renderRouteText(result.model,{language}));
    assert.equal(document.documentElement.textContent.toLowerCase().includes(ropeText),true);
  });
}

test("shared diagram state exposes the unknown-rope warning with usable output", /**
 * Verify the adapter boundary preserves a successful warning state, source location and rendered unknown fact.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of warning propagation and available artifacts.
 */ () => {
  const state=createDiagramState(source,{style:"soft-terrain"});
  assert.deepEqual([state.ok,state.diagnostics[0].code,state.diagnosticsText.includes("explicitly unknown"),state.svg.includes("declared rope: unknown"),JSON.parse(state.json).elements[0].attributes.rope], [true,"VRL_ROPE_LENGTH_UNKNOWN",true,true,"unknown"]);
});

test("revision 2 changes only the normalized model contract and retains the runtime export inventory", /**
 * Compare the new revision against the retained revision-1 inventory; unrelated contracts stay unchanged.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the scoped compatibility declaration.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL('../docs/contracts/v1.json',import.meta.url),'utf8'));
  const current=JSON.parse(readFileSync(new URL('../docs/contracts/v2.json',import.meta.url),'utf8'));
  assert.deepEqual(current,{...previous,revision:2,contracts:{...previous.contracts,model:2}});
});

for (const [language,expected] of [["en","12m / unknown / bolts"],["es","12m / desconocido / parabolts"]]) {
  test(`advanced detail formatter retains the unknown rope in ${language}`, /**
   * Preserve the sentinel in the public detail formatter as well as full SVG serialization.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of localized compact detail text.
   */ () => { assert.equal(formatElementDetail(compileRoute(source).model.elements[0],language),expected); });
}
