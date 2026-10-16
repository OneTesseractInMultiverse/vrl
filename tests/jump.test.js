import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, parseVrl, normalizeRoute, normalizeElement, exportRouteJson, computeVerticalLayout, summarizeRouteMeasurements } from "@subvertic/vrl-core";
import { describeRoute, renderRouteText, renderTopoSvg, computeTopoScene, formatElementDetail, symbolCode, needsSegmentArrow } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

test("jump has exactly one downward physical segment", /**
 * Establish independent owner, direction and signed height facts; witness a deliberately removed descent.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact standalone traversal and JSON identity.
 */ () => {
  const result=compileRoute('route Example\njump J1 height=3m');
  assert.deepEqual([result.ok,result.diagnostics,JSON.parse(result.json).elements[0].type,result.model.traversal],
    [true,[],"jump",{points:[{elementIndex:0},{elementIndex:null}],segments:[{from:0,to:1,elementIndex:0,kind:"technical",direction:"down",verticalDeltaMeters:-3}],annotations:[]}]);
});
for (const value of ["0.000001m","3m","1000000000m"]) {
  test(`jump accepts a positive vertical height ${value}`, /**
   * Preserve minimum precision, ordinary height and supported magnitude boundary as negative vertical motion.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of retained height and exact signed descent.
   */ () => {
    const result=compileRoute(`route Example\njump height=${value}`), meters=Number(value.slice(0,-1));
    assert.deepEqual([result.ok,result.model.elements[0].id,result.model.elements[0].attributes,result.model.traversal.segments[0].verticalDeltaMeters],
      [true,"J1",{height:{value:meters,unit:"m",meters}},-meters]);
  });
}
for (const [declaration,code] of [
  ["","VRL_FIELD_REQUIRED"],["height=0m","VRL_FIELD_MEASUREMENT_RANGE"],["height=-2m","VRL_FIELD_MEASUREMENT_RANGE"],
  ["height=bad","VRL_FIELD_MEASUREMENT_SYNTAX"],["height=3ft","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["height=Unknown","VRL_FIELD_MEASUREMENT_SYNTAX"],["height=1000000001m","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["height=0.0000001m","VRL_FIELD_MEASUREMENT_SYNTAX"],["height=NaNm","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["height=3m height=4m","VRL_SYNTAX_DUPLICATE_ATTRIBUTE"]
]) {
  test(`invalid jump declaration blocks all derived output: ${declaration}`, /**
   * Require explicit valid measurements without accepting malformed, ambiguous or invented numeric motion.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the primary stable failure and downstream absence.
   */ () => {
    const result=compileRoute(`route Example\njump J1 ${declaration}`);
    assert.deepEqual([result.ok,result.diagnostics[0].code,result.model,result.layout,result.json],[false,code,null,null,null]);
  });
}
for(const token of ['unknown','"unknown"']) {
  test(`unknown jump height remains null physical motion: ${token}`, /**
   * Retain explicit uncertainty at its authored value without reading dimensions from schematic pixels.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of source-located warning, exact sentinel and null descent.
   */ () => {
    const result=compileRoute(`route Example\njump J1 height=${token}`);
    assert.deepEqual([result.ok,result.diagnostics[0].code,result.diagnostics[0].severity,result.diagnostics[0].location,
      JSON.parse(result.json).elements[0].attributes.height,result.model.traversal.segments[0].verticalDeltaMeters],
      [true,"VRL_GEOMETRY_HEIGHT_UNKNOWN","warning",{line:2,column:16},"unknown",null]);
  });
}
test("unknown jump cannot satisfy a measured endpoint profile", /**
 * Reject missing physical evidence instead of filling height from endpoint residuals.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of blocking geometry uncertainty and absent outputs.
 */ () => {
  const result=compileRoute('route Example\nmetadata entrance_elevation=10m exit_elevation=7m\njump J1 height=unknown');
  assert.deepEqual([result.ok,result.diagnostics[0].code,result.diagnostics[0].severity,result.model,result.layout,result.json],
    [false,"VRL_GEOMETRY_HEIGHT_UNKNOWN","error",null,null,null]);
});
test("measured jumps reconcile exact endpoints independently of pool depth", /**
 * Require a three-meter descent despite unrelated pool depth and separate movement facts.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact endpoints and owned delta without estimates.
 */ () => {
  const result=compileRoute('route Example\nmetadata entrance_elevation=10m exit_elevation=7m\nstart\njump J1 height=3m\npool P1 depth=20m\nexit');
  assert.deepEqual([result.ok,result.diagnostics,result.layout.nodes[0].elevationMeters,result.layout.nodes.at(-1).elevationMeters,result.model.traversal.segments[1].verticalDeltaMeters],
    [true,[],10,7,-3]);
});
test("adjacent jumps and a climb preserve every owner and reached annotation", /**
 * Establish descent/descent/ascent ordering with a shared reached boundary and no annotation motion.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact source ownership and boundary association.
 */ () => {
  const result=compileRoute('route Example\njump J1 height=3m\njump J2 height=4m\nhazard H1\nclimb C1 height=2m');
  assert.deepEqual(result.model.traversal,{points:[{elementIndex:0},{elementIndex:1},{elementIndex:null},{elementIndex:3}],
    segments:[{from:0,to:1,elementIndex:0,kind:"technical",direction:"down",verticalDeltaMeters:-3},
      {from:1,to:2,elementIndex:1,kind:"technical",direction:"down",verticalDeltaMeters:-4},
      {from:2,to:3,elementIndex:3,kind:"technical",direction:"up",verticalDeltaMeters:2}],annotations:[{elementIndex:2,pointIndex:2}]});
});
test("jump extensions cannot scale height, create rigging or associate a pool", /**
 * Keep nonapplicable source fields literal even when their spellings resemble existing technical fields.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of limited known fields, exact extensions and unchanged physical descent.
 */ () => {
  const result=compileRoute('route Example\njump J1 height=3m inclination=50% rope=unknown stages=bad redirection=bad redirections=bad depth=9m pool_ref=missing shape=ladder station=left distance=7m');
  const element=result.model.elements[0];
  assert.deepEqual([result.ok,result.diagnostics,element.attributes,element.extensions,result.model.traversal.segments[0].verticalDeltaMeters],
    [true,[],{height:{value:3,unit:"m",meters:3}},{inclination:"50%",rope:"unknown",stages:"bad",redirection:"bad",redirections:"bad",depth:"9m",pool_ref:"missing",shape:"ladder",station:"left",distance:"7m"},-3]);
});
test("pools and prose do not create jump movements", /**
 * Preserve source meaning when jumping is mentioned only as documentary text.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of unchanged explicit vocabulary and no technical segment.
 */ () => {
  const result=compileRoute('route Example\npool P1 depth=3m\nnote Jump mentioned, no movement declared');
  assert.deepEqual([result.model.elements[0].type,result.model.elements[1].type,result.model.traversal.segments],["pool","note",[]]);
});
for(const source of ['jump J1','jump J1 height=0m','jump J1 height=bad']) {
  test(`direct jump normalization enforces height: ${source}`, /**
   * Apply domain invariants independently of compiler diagnostics and layout.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of RangeError for invalid raw jump data.
   */ () => {
    assert.throws(/**
     * Normalize the invalid raw jump without the compiler adapter.
     * @responsibility coordinator
     * @returns {Object} Unreachable model; the domain failure propagates.
     */ () => normalizeRoute(parseVrl(`route Example\n${source}`).ast),RangeError);
  });
}
test("isolated jump normalization preserves scoped observations", /**
 * Verify valid unknown height, phase, flow and landing without materializing unrelated extensions.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact typed fields and caller-owned source immutability.
 */ () => {
  const element={type:"jump",attributes:{height:"unknown",phase:"canyon",flow:"low",landing:"pool"}};
  const before=JSON.stringify(element);
  assert.deepEqual([normalizeElement(element).attributes,JSON.stringify(element)],[{height:"unknown",phase:"canyon",flow:"low",landing:"pool"},before]);
});
for(const field of ['phase=other','flow=other','landing=other']) {
  test(`invalid jump observation fails: ${field}`, /**
   * Keep newly scoped observations subject to existing exact vocabulary validation.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of a blocking unsupported value.
   */ () => {
    const result=compileRoute(`route Example\njump J1 height=3m ${field}`);
    assert.deepEqual([result.ok,result.diagnostics[0].code,result.model],[false,"VRL_FIELD_UNSUPPORTED_VALUE",null]);
  });
}
test("jump IDs reserve future explicit declarations and reject ambiguity", /**
 * Preserve stable independent J allocation and existing whole-route duplicate identity failure.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of generated reservation and duplicate failure.
 */ () => {
  const result=compileRoute('route Example\njump height=2m\njump J1 height=3m');
  const duplicate=compileRoute('route Example\njump J1 height=2m\npool J1');
  assert.deepEqual([result.model.elements[0].id,result.model.elements[1].id,duplicate.diagnostics[0].code,duplicate.model],["J2","J1","VRL_IDENTIFIER_DUPLICATE",null]);
});
test("jumps do not enter walking or rappel summaries", /**
 * Compare the unchanged existing summary contract with and without measured and unknown jumps.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of independent declared rope/walk aggregates and maxima.
 */ () => {
  const source='route Example\nrappel R1 height=4m rope=8m\nwalk W1 distance=5m';
  const plain=compileRoute(source), jumps=compileRoute(source+'\njump J1 height=50m\njump J2 height=unknown');
  assert.deepEqual([jumps.model.summary,summarizeRouteMeasurements(jumps.model.elements)],
    [plain.model.summary,summarizeRouteMeasurements(plain.model.elements)]);
});
for(const language of ["en","es"]) for(const render of [{},{style:"soft-terrain"},{style:"soft-terrain",flow:"rows",symbols:"minimal"},{style:"soft-terrain",flow:"rows",symbols:"minimal",monochrome:true}]) {
  test(`jump output retains exact height, movement and uncertainty: ${language} ${JSON.stringify(render)}`, /**
   * Inspect visible SVG, complete descriptions and HTML using independent bilingual expectations.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of complete facts, safe literal text, no clipping and no ladder rungs.
   */ () => {
    const result=compileRoute('route Example\njump J1 height=3m note="<literal&text>"\njump J2 height=unknown',{layout:{width:320}});
    const svg=renderTopoSvg(result.model,result.layout,{...render,language}), doc=documentFor(svg), texts=[];
    for(const node of doc.getElementsByTagName("text")) texts.push(node.textContent);
    const description=describeRoute(result.model,{language}), words=language==="es" ? ["Salto","Altura fisica: 3m","Movimiento: descenso","Cambio vertical: -3m","desconocido"] : ["Jump","Physical height: 3m","Movement: descent","Vertical change: -3m","unknown"];
    assert.deepEqual([texts.join(" ").includes(words[0]),description.entries[0].facts,description.entries[1].facts,renderRouteText(result.model,{language}).includes("&lt;literal&amp;text&gt;"),svg.includes('class="vrl-drop-rung"'),clippedPrimitives(doc),(texts.join(" ").match(/(?<![-\d])\b3m\b/g) ?? []).length],
      [true,[words[2],words[3],words[1],"Note: <literal&text>".replace("Note",language==="es"?"Nota":"Note")],
        [words[2],(language==="es"?"Cambio vertical: ":"Vertical change: ")+words[4],(language==="es"?"Altura fisica: ":"Physical height: ")+words[4]],true,false,[],1]);
  });
}
test("classic jump scenes use a direct path without fabricated rigging", /**
 * Inspect the scene contract independently of serialization and caller-provided extension names.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of direct geometry, no rungs/stages/redirections and a directed jump symbol.
 */ () => {
  const result=compileRoute('route Example\njump J1 height=3m shape=ladder stages=1m+2m'), scene=computeTopoScene(result.model,result.layout);
  const segment=scene.segments[0];
  assert.deepEqual([segment.shape,segment.rungs,segment.stages,segment.redirections,symbolCode(result.model.elements[0]),needsSegmentArrow(result.model.elements[0])],["direct",[],[],[],"J",true]);
});
for(const [height,expected] of [["unknown","unknown"],[{meters:3},"3m"]]) {
  test(`jump detail formatter retains declared height ${expected}`, /**
   * Exercise the public detail projection for both explicitly unknown and measured heights.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of literal supported height formatting.
   */ () => assert.equal(formatElementDetail({type:"jump",attributes:{height}}),expected));
}
test("framework-neutral jump states distinguish warning and failure", /**
 * Keep unknown schematic output visible while blocking a missing required declaration.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of shared success/warning/failure propagation.
 */ () => {
  const unknown=createDiagramState('route Example\njump J1 height=unknown'), invalid=createDiagramState('route Example\njump J1');
  assert.deepEqual([unknown.ok,unknown.diagnostics[0].severity,unknown.svg.includes("height unknown"),invalid.ok,invalid.model,invalid.svg],[true,"warning",true,false,null,""]);
});
test("jump compilation remains deterministic across repeated calls", /**
 * Prevent ID, unknown-height or layout state from leaking across route compilation.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of identical complete results.
 */ () => {
  const source='route Example\njump height=3m\njump J1 height=unknown';
  assert.deepEqual(compileRoute(source),compileRoute(source));
});
test("revision-7 saved pool references survive the new movement vocabulary", /**
 * Render a pinned pre-jump model without changing its JSON, exact association or existing physical meaning.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of immutable saved-model compatibility.
 */ () => {
  const fixture=JSON.parse(readFileSync(new URL("./fixtures/model-v7.json",import.meta.url),"utf8")), before=JSON.stringify(fixture.model);
  renderTopoSvg(fixture.model,computeVerticalLayout(fixture.model));
  assert.deepEqual([JSON.parse(exportRouteJson(fixture.model)),describeRoute(fixture.model).entries[1].facts,JSON.stringify(fixture.model)],
    [fixture.model,["Movement: swimming","Swimming distance: 12m","Phase: canyon","Pool reference: P1"],before]);
});
