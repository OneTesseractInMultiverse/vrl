import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, parseVrl, normalizeRoute, summarizeRouteMeasurements, exportRouteJson, computeVerticalLayout } from "@subvertic/vrl-core";
import { describeRoute, renderRouteText, renderTopoSvg, symbolCode, legendSymbolRows } from "@subvertic/vrl-render-svg";
import { resolveElementIconId } from "@subvertic/vrl-icons/semantics";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

const source='route "Synthetic swim"\nswim SW1 distance=12m flow=low note="Supplied example"';

test("swimming has exact movement and distance facts independent of pools", /**
 * Reject lost or relabeled movement/distance using an independent complete accessible fact list.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of supplied swimming facts without a depth or walking claim.
 */ () => {
  assert.deepEqual(describeRoute(compileRoute(source).model).entries[0].facts,
    ["Movement: swimming","Swimming distance: 12m","Flow: low","Note: Supplied example"]);
});
test("swim source and JSON retain typed distance and literal extensions", /**
 * Check new vocabulary, field ownership and exact metric conversion through exported JSON.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of successful independent model facts.
 */ () => {
  const result=compileRoute(source), element=JSON.parse(result.json).elements[0];
  assert.deepEqual([result.ok,result.diagnostics,element.type,element.id,element.attributes,element.extensions],
    [true,[],"swim","SW1",{distance:{value:12,unit:"m",meters:12},flow:"low"},{note:"Supplied example"}]);
});
test("swim keyword and distance retain exact UTF-16 source spans", /**
 * Compare lexer/parser provenance against counted source columns.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of keyword, identity and value boundaries.
 */ () => {
  const record=parseVrl('route Example\nswim SW1 distance=12m').ast.sourceMap.elements[0];
  assert.deepEqual([record.keywordSpan,record.idSpan,record.attributeSpans.distance.valueSpan],
    [{start:{line:2,column:1},end:{line:2,column:5}},{start:{line:2,column:6},end:{line:2,column:9}},{start:{line:2,column:19},end:{line:2,column:22}}]);
});
test("swim identities reserve future explicit names without sharing start counters", /**
 * Verify independent SW/S counters and whole-document reservation with exact expected identities.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of deterministic IDs and identical repeated JSON.
 */ () => {
  const input='route Example\nstart\nswim\nswim SW1 distance=2m\nswim\nexit';
  const first=compileRoute(input), second=compileRoute(input), ids=[];
  for(const element of first.model.elements) ids.push(element.id);
  assert.deepEqual([ids,first.json===second.json],[["S1","SW2","SW1","SW4","E1"],true]);
});
for(const token of ["0.000001m","1000000000m",'"12.5m"']) {
  test(`swim accepts supported metric boundary ${token}`, /**
   * Compare numeric conversion to an independent metric expectation without geometry-derived values.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of successful exact distance.
   */ () => {
    const expected=token==='"12.5m"' ? 12.5 : token==="0.000001m" ? 0.000001 : 1000000000;
    const result=compileRoute(`route Example\nswim SW1 distance=${token}`);
    assert.deepEqual([result.ok,result.model.elements[0].attributes.distance],[true,{value:expected,unit:"m",meters:expected}]);
  });
}
test("absent swimming distance stays absent and visibly unknown without a warning", /**
 * Separate omitted distance from numeric zero and from an invented physical measurement.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of absence, exact unknown facts and successful diagnostics.
 */ () => {
  const result=compileRoute('route Example\nswim SW1');
  assert.deepEqual([result.diagnostics,Object.hasOwn(result.model.elements[0].attributes,"distance"),describeRoute(result.model).entries[0].facts],
    [[],false,["Movement: swimming","Swimming distance: unknown"]]);
});
for(const [token,code] of [["0m","VRL_FIELD_MEASUREMENT_RANGE"],["-0m","VRL_FIELD_MEASUREMENT_RANGE"],["-1m","VRL_FIELD_MEASUREMENT_RANGE"],["unknown","VRL_FIELD_MEASUREMENT_SYNTAX"],['""',"VRL_FIELD_MEASUREMENT_SYNTAX"],["12ft","VRL_FIELD_MEASUREMENT_SYNTAX"],["1e3m","VRL_FIELD_MEASUREMENT_SYNTAX"],["Infinitym","VRL_FIELD_MEASUREMENT_SYNTAX"],["1000000001m","VRL_FIELD_MEASUREMENT_SYNTAX"],["0.0000001m","VRL_FIELD_MEASUREMENT_SYNTAX"]]) {
  test(`invalid swimming distance ${token} fails at its value and blocks derived data`, /**
   * Verify independently classified failure, source location and downstream short-circuit behavior.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the full failure boundary.
   */ () => {
    const result=compileRoute(`route Example\nswim SW1 distance=${token}`), diagnostic=result.diagnostics[0];
    assert.deepEqual([result.ok,diagnostic.code,diagnostic.severity,diagnostic.location,result.model,result.layout,result.json],
      [false,code,"error",{line:2,column:19},null,null,null]);
  });
}
for(const [body,code] of [["swim SW1 distance=1m distance=2m","VRL_SYNTAX_DUPLICATE_ATTRIBUTE"],["swim SW1\nswim SW1","VRL_IDENTIFIER_DUPLICATE"],["swim SW1 flow=fast","VRL_FIELD_UNSUPPORTED_VALUE"],["swim SW1\nmetadata country=CR","VRL_SYNTAX_METADATA_ORDER"]]) {
  test(`swim rejects malformed declarations: ${body}`, /**
   * Exercise duplicate attributes/IDs, invalid vocabulary and illegal document ordering for the new statement.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of error identity and absent model.
   */ () => {
    const result=compileRoute(`route Example\n${body}`);
    assert.deepEqual([result.ok,result.diagnostics[0].code,result.model],[false,code,null]);
  });
}
test("direct normalization rejects nonpositive swimming distance", /**
 * Require domain enforcement without relying on compiler adapters.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the strict invariant failure.
 */ () => { assert.throws(/**
   * Invoke strict conversion for a syntactically valid zero-distance swimming record.
   * @responsibility coordinator
   * @returns {Object} Unreachable model; RangeError propagates.
   */ () => normalizeRoute(parseVrl('route Example\nswim SW1 distance=0m').ast),RangeError); });
test("swimming stays outside walking and rope aggregates", /**
 * Pin legacy and provenance-aware totals independently of the new swimming distance.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact observed walking and declared rope quantities.
 */ () => {
  const result=compileRoute('route Example\nmetadata total_distance=6m\nwalk W1 distance=6m\nswim SW1 distance=100m');
  const summary=summarizeRouteMeasurements(result.model.elements,result.model.metadata);
  assert.deepEqual([result.diagnostics,result.model.summary.totalDistanceMeters,result.model.summary.requiredRopeMeters,summary.walkCount,summary.measuredWalkCount,summary.summedWalkDistanceMeters,summary.maximumDeclaredRopeMeters],
    [[],6,0,1,1,6,null]);
});
test("swimming preserves adjacent technical owners and annotation boundaries", /**
 * Verify source-ordered progression while retaining independently declared descent/ascent and hazard ownership.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of complete technical events and reached annotation boundary.
 */ () => {
  const result=compileRoute('route Example\nstart S1\nrappel R1 height=8m rope=16m\nclimb C1 height=2m\nswim SW1 distance=12m\nhazard H1 type=slippery\nrappel R2 height=3m rope=6m\nexit E1'), technical=[], points=[];
  for(const segment of result.model.traversal.segments) if(segment.kind==="technical") technical.push([result.model.elements[segment.elementIndex].id,segment.direction,segment.verticalDeltaMeters]);
  for(const point of result.model.traversal.points) points.push(point.elementIndex===null ? null : result.model.elements[point.elementIndex].id);
  assert.deepEqual([technical,points,result.model.traversal.annotations],[[["R1","down",-8],["C1","up",2],["R2","down",-3]],["S1","R1",null,"C1","SW1","R2","E1"],[{elementIndex:4,pointIndex:4}]]);
});
test("swim distance does not become a vertical delta or rescale schematic coordinates", /**
 * Hold itinerary and endpoint constraints fixed while editing only swimming distance.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of identical canonical motion, physical profile and display positions.
 */ () => {
  const results=[];
  for(const distance of ["", " distance=1m"," distance=100m"]) {
    const result=compileRoute('route Example\nmetadata entrance_elevation=100m exit_elevation=96m\nstart S1\nswim SW1'+distance+'\nrappel R1 height=4m rope=8m\nexit E1'), coordinates=[];
    for(const point of result.layout.points) coordinates.push([point.x,point.y,point.elevationMeters]);
    results.push([result.diagnostics,result.model.traversal,coordinates,result.model.summary]);
  }
  assert.deepEqual(results,[results[0],results[0],results[0]]);
});
test("swim endpoint residual remains an explicit estimate rather than a distance-derived elevation", /**
 * Pin the existing connection-calibration warning and retained physical declarations.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of endpoint estimation and no technical swimming delta.
 */ () => {
  const result=compileRoute('route Example\nmetadata entrance_elevation=100m exit_elevation=99m\nstart S1\nswim SW1 distance=12m\nexit E1'), codes=[], deltas=[];
  for(const diagnostic of result.diagnostics) codes.push(diagnostic.code);
  for(const segment of result.model.traversal.segments) deltas.push(segment.verticalDeltaMeters);
  assert.deepEqual([result.ok,codes,deltas,result.model.elements[1].attributes.distance.meters],[true,["VRL_GEOMETRY_ELEVATIONS_ESTIMATED"],[0,0],12]);
});
for(const type of ["deep","swimmer","shallow","dry","unknown"]) {
  test(`pool category ${type} and supplied depth do not create a swimming element`, /**
   * Preserve the feature/movement distinction even where an existing category pictogram depicts a swimmer.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the sole feature type, absent distance and empty traversal.
   */ () => {
    const result=compileRoute(`route Example\npool P1 type=${type} depth=2m`);
    assert.deepEqual([result.model.elements.length,result.model.elements[0].type,result.model.elements[0].attributes.distance,result.model.traversal.segments],[1,"pool",undefined,[]]);
  });
}
test("pool-only depth and type remain literal extensions on swim", /**
 * Prevent nearby feature vocabulary from giving swimming a pool measurement or subtype.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of disjoint typed and extension maps.
 */ () => {
  const element=compileRoute('route Example\nswim SW1 depth="variable" type=deep note="pool P1"').model.elements[0];
  assert.deepEqual([element.attributes,element.extensions],[{},{depth:"variable",type:"deep",note:"pool P1"}]);
});
for(const language of ["en","es"]) for(const distance of ["12m",null]) for(const options of [{},{style:"soft-terrain"},{style:"soft-terrain",flow:"rows",monochrome:true,symbols:"minimal"},{style:"soft-terrain",flow:"rows",symbols:"minimal"}]) {
  test(`swimming is visible, accessible and bounded: ${language}/${distance}/${JSON.stringify(options)}`, /**
   * Inspect independent SVG text and complete facts across classic, soft, narrow and monochrome presentations without transformed icon paths.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of retained identity/distance/flow/note with no clipped primitives.
   */ () => {
    const result=compileRoute('route Example\nswim SW1'+(distance===null ? "" : ` distance=${distance}`)+' flow=low note="Original note"',{layout:{width:320}});
    const document=documentFor(renderTopoSvg(result.model,result.layout,{...options,language})), text=[];
    for(const node of document.getElementsByTagName("text")) text.push(node.textContent);
    const visible=text.join(" ").replace(/\s+/g," "), desc=document.getElementsByTagName("desc")[0].textContent;
    const value=distance??(language==="es"?"desconocido":"unknown");
    const label=language==="es" ? "distancia a nado" : "swimming distance";
    const fact=language==="es" ? "Distancia a nado" : "Swimming distance";
    assert.deepEqual([visible.includes(label+": "+value),visible.includes(language==="es"?"flujo:":"flow:"),visible.includes("Original note"),desc.includes(fact+": "+value),desc.includes(language==="es"?"Movimiento: nado":"Movement: swimming"),clippedPrimitives(document)],[true,true,true,true,true,[]]);
  });
}
for(const language of ["en","es"]) {
  test(`HTML alternative retains exact swimming facts in ${language}`, /**
   * Verify actual HTML text and an independent complete localized fact list.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of native text content and complete scoped facts.
   */ () => {
    const model=compileRoute(source).model, html=documentFor(renderRouteText(model,{language}));
    assert.deepEqual([describeRoute(model,{language}).entries[0].facts,html.documentElement.textContent.includes("12m")],
      [language==="en"?["Movement: swimming","Swimming distance: 12m","Flow: low","Note: Supplied example"]:["Movimiento: nado","Distancia a nado: 12m","Flujo: bajo","Nota: Supplied example"],true]);
  });
}
for(const symbology of ["federation","french","spanish"]) {
  test(`swim has a stable project abbreviation and legend entry in ${symbology}`, /**
   * Verify explicit symbol vocabulary independently from source identifiers and pool categories.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of SW abbreviation and the exact legend entry.
   */ () => {
    const element=compileRoute('route Example\nswim arbitrary').model.elements[0];
    assert.deepEqual([symbolCode(element,symbology),legendSymbolRows("en",symbology).flat().at(-1)],["SW",["SW","Swim"]]);
  });
}
test("explicit swimming selects the existing transparent icon without changing pool mapping", /**
 * Pin semantic mapping to the original icon rather than inferring movement from the picture.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of stable explicit swim and pool-category icon identities.
 */ () => {
  assert.deepEqual([resolveElementIconId({type:"swim",attributes:{}}),resolveElementIconId({type:"pool",attributes:{type:"swimmer"}})],["swim","swim"]);
});
test("swim rows keep directed distance compression with distinct distance wording", /**
 * Inspect prepared row primitives and visible wording independently of rendered colors.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of a directed compression cue and absence of a walking-distance claim.
 */ () => {
  const result=compileRoute(source,{layout:{width:320}});
  const svg=renderTopoSvg(result.model,result.layout,{style:"soft-terrain",flow:"rows",monochrome:true,legend:false});
  const document=documentFor(svg), breaks=[];
  for(const path of document.getElementsByTagName("path")) if(path.getAttribute("class")==="vrl-row-distance-break") breaks.push(path.getAttribute("marker-end"));
  assert.deepEqual([breaks.length,breaks[0]?.startsWith("url(#"),svg.includes("Swimming distance"),svg.includes("Walking distance")],[1,true,true,false]);
});
test("shared state exposes swimming without warnings or a pool assumption", /**
 * Exercise the framework-neutral facade against independent success and retained JSON meaning.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of successful state, distance wording and explicit element type.
 */ () => {
  const state=createDiagramState(source);
  assert.deepEqual([state.ok,state.diagnostics,state.svg.includes("swimming distance: 12m"),JSON.parse(state.json).elements[0].type],[true,[],true,"swim"]);
});
test("saved revision 4 models retain JSON and pool semantics under the expanded vocabulary", /**
 * Compare the pinned pre-swim model with source recompilation and render it without promoting features into movement.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of unchanged persisted JSON and original pool facts.
 */ () => {
  const fixture=JSON.parse(readFileSync(new URL("./fixtures/model-v4.json",import.meta.url),"utf8"));
  const result=compileRoute(fixture.source), before=JSON.stringify(fixture.model);
  renderTopoSvg(fixture.model,computeVerticalLayout(fixture.model));
  assert.deepEqual([JSON.parse(exportRouteJson(fixture.model)),JSON.parse(result.json),JSON.stringify(fixture.model),describeRoute(fixture.model).entries[0].facts],
    [fixture.model,fixture.model,before,["Measured pool depth: 2.5m","Type: deep"]]);
});
test("swim extends AST and model revisions without changing other structural contracts", /**
 * Pin the closed-vocabulary compatibility decision while retaining earlier inventories.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exactly the affected versioned contracts and stable runtime exports.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL("../docs/contracts/v4.json",import.meta.url),"utf8"));
  const current=JSON.parse(readFileSync(new URL("../docs/contracts/v5.json",import.meta.url),"utf8"));
  assert.deepEqual(current,{...previous,revision:5,contracts:{...previous.contracts,ast:2,model:5}});
});
