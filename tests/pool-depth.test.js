import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, normalizeRoute, normalizeAttributes, parseVrl, computeVerticalLayout, summarizeRouteMeasurements } from "@subvertic/vrl-core";
import { describeRoute, renderTopoSvg, renderRouteText, computeTopoScene, formatElementDetail } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

const source='route "Synthetic pool depth"\npool P1 depth=2.5m type=deep flow=low note="Observed value"';

test("pool depth survives normalized attributes and JSON without becoming an extension", /**
 * Compare independent measurement, category and literal-note expectations at the normalized/exported boundary.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of successful conversion, field ownership and preserved facts.
 */ () => {
  const result=compileRoute(source), element=JSON.parse(result.json).elements[0];
  assert.deepEqual([result.ok,result.diagnostics,element.attributes,element.extensions],
    [true,[],{depth:{value:2.5,unit:"m",meters:2.5},type:"deep",flow:"low"},{note:"Observed value"}]);
});

for(const [token,expected] of [["0m",0],["-0m",0],["0.000001m",0.000001],["1000000000m",1000000000],['"2.5m"',2.5]]) {
  test(`pool depth accepts its metric boundary ${token}`, /**
   * Preserve exact source metric values, including supplied zero and the established precision/magnitude limits.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the normalized metric record without negative-zero leakage.
   */ () => {
    const result=compileRoute(`route Example\npool P1 depth=${token}`);
    assert.deepEqual([result.ok,result.model.elements[0].attributes.depth],[true,{value:expected,unit:"m",meters:expected}]);
  });
}

for(const token of ["unknown",'"unknown"']) {
  test(`explicit pool depth ${token} remains unknown without a numeric replacement`, /**
   * Preserve the exact decoded sentinel with no required-field or geometry warning for optional pool depth.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of retained normalized/JSON uncertainty and successful diagnostics.
   */ () => {
    const result=compileRoute(`route Example\npool P1 depth=${token}`);
    assert.deepEqual([result.model.elements[0].attributes.depth,JSON.parse(result.json).elements[0].attributes.depth,result.diagnostics],["unknown","unknown",[]]);
  });
}

test("absent pool depth stays absent instead of becoming unknown text or zero in the model", /**
 * Retain source absence while exposing the established unknown-depth description to readers.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of structural absence and the independently specified text fact.
 */ () => {
  const result=compileRoute('route Example\npool P1');
  assert.deepEqual([Object.hasOwn(result.model.elements[0].attributes,"depth"),describeRoute(result.model).entries[0].facts],[false,["Measured pool depth: unknown"]]);
});

test("known pool depth has one exact accessible fact without an unknown placeholder", /**
 * Reject contradictory or duplicated depth presentation using an independent complete fact list.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the source depth, flow, literal note and category in stable order.
 */ () => {
  assert.deepEqual(describeRoute(compileRoute(source).model).entries[0].facts,
    ["Measured pool depth: 2.5m","Flow: low","Note: Observed value","Type: deep"]);
});

for(const [token,fact] of [["0m","Measured pool depth: 0m"],["unknown","Measured pool depth: unknown"]]) {
  test(`pool depth ${token} has one distinct accessible meaning`, /**
   * Prevent zero and unknown from collapsing into the same reader-facing fact.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the entire depth-only fact list.
   */ () => { assert.deepEqual(describeRoute(compileRoute(`route Example\npool P1 depth=${token}`).model).entries[0].facts,[fact]); });
}

test("pool depth does not create swimming, technical motion, distance or category", /**
 * Verify the measurement's bounded domain meaning against independently specified traversal and summaries.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of empty physical movement and absent inferred category/distance.
 */ () => {
  const result=compileRoute('route Example\npool P1 depth=2m'), element=result.model.elements[0];
  const summary=summarizeRouteMeasurements(result.model.elements);
  assert.deepEqual([result.model.traversal,element.attributes.type,element.attributes.distance,summary.maximumDeclaredRopeMeters,summary.summedWalkDistanceMeters],
    [{points:[{elementIndex:0}],segments:[],annotations:[]},undefined,undefined,null,null]);
});

/**
 * Project only physical layout coordinates, excluding the source element retained for downstream rendering.
 * @responsibility computation
 * @param {Object} point - Layout point containing display coordinates and its source element.
 * @returns {Object} All layout properties except the source element whose depth is intentionally changing.
 */
function layoutGeometry(point) {
  const { element, ...geometry } = point;
  return geometry;
}

for(const depth of ["0m","3m","unknown"]) {
  test(`pool depth ${depth} leaves technical motion and profile unchanged`, /**
   * Compare a depth-only edit while separately pinning the declared physical descent and legacy summary facts.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of unchanged canonical/layout geometry and the independent descent.
   */ () => {
    const base='route Example\nmetadata entrance_elevation=100m exit_elevation=88m\nstart S1\nrappel R1 height=12m rope=24m\npool P1';
    const before=compileRoute(base), after=compileRoute(base+` depth=${depth}`);
    assert.deepEqual([after.model.traversal,after.layout.points.map(layoutGeometry),after.model.summary,after.model.traversal.segments[1].verticalDeltaMeters],
      [before.model.traversal,before.layout.points.map(layoutGeometry),before.model.summary,-12]);
  });
}

for(const type of ["deep","shallow","swimmer","dry","unknown"]) {
  test(`pool category ${type} does not supply depth or change a declared zero`, /**
   * Keep unquantified categories independent from optional numeric depth and explicit zero.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of category retention without measurement inference.
   */ () => {
    const absent=compileRoute(`route Example\npool P1 type=${type}`), zero=compileRoute(`route Example\npool P1 type=${type} depth=0m`);
    assert.deepEqual([absent.model.elements[0].attributes.depth,zero.model.elements[0].attributes.type,zero.model.elements[0].attributes.depth.meters],[undefined,type,0]);
  });
}

test("direct normalization owns and preserves the new scoped measurement", /**
 * Exercise domain conversion without compiler validation and prevent normalized mutations from changing source.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of independent source and normalized measurement records.
 */ () => {
  const ast=parseVrl(source).ast, first=normalizeRoute(ast), second=normalizeRoute(ast);
  first.elements[0].attributes.depth.meters=99;
  assert.deepEqual([ast.elements[0].attributes.depth,second.elements[0].attributes.depth.meters],["2.5m",2.5]);
});

for(const [statement,scope] of [["metadata","metadata"],["start S1","element"],["walk W1","element"],["rappel R1 height=3m rope=6m","element"],["downclimb D1 height=3m","element"],["climb C1 height=3m","element"],["hazard H1","element"],["exit E1","element"]]) {
  test(`depth remains literal extension text on ${statement}`, /**
   * Verify field promotion is restricted to pools and cannot reinterpret other scoped documentary text.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of out-of-scope literal ownership and no typed depth value.
   */ () => {
    const result=compileRoute(`route Example\n${statement} depth="Unverified depth note"`);
    const owner=scope==="metadata" ? {attributes:result.model.metadata,extensions:result.model.extensions} : result.model.elements[0];
    assert.deepEqual([result.ok,owner.attributes.depth,owner.extensions.depth],[true,undefined,"Unverified depth note"]);
  });
}

for(const [token,code] of [['""',"VRL_FIELD_MEASUREMENT_SYNTAX"],["-1m","VRL_FIELD_MEASUREMENT_RANGE"],["8ft","VRL_FIELD_MEASUREMENT_SYNTAX"],["1e3m","VRL_FIELD_MEASUREMENT_SYNTAX"],["Infinitym","VRL_FIELD_MEASUREMENT_SYNTAX"],["1000000001m","VRL_FIELD_MEASUREMENT_SYNTAX"],["0.0000001m","VRL_FIELD_MEASUREMENT_SYNTAX"],["UNKNOWN","VRL_FIELD_MEASUREMENT_SYNTAX"],['" unknown "',"VRL_FIELD_MEASUREMENT_SYNTAX"],['"variable"',"VRL_FIELD_MEASUREMENT_SYNTAX"]]) {
  test(`invalid pool depth ${token} blocks derived outputs with a located error`, /**
   * Require the independently classified field failure and exact source-value column with no downstream data.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of proper failure, severity, location and absent artifacts.
   */ () => {
    const result=compileRoute(`route Example\npool P1 depth=${token}`), diagnostic=result.diagnostics[0];
    assert.deepEqual([result.ok,diagnostic.code,diagnostic.severity,diagnostic.location,result.model,result.layout,result.json],
      [false,code,"error",{line:2,column:15},null,null,null]);
  });
}

test("duplicate pool depth declarations fail instead of choosing a measurement", /**
 * Preserve duplicate-attribute rejection before semantic interpretation of the new field.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of syntax failure and absent artifacts.
 */ () => {
  const result=compileRoute('route Example\npool P1 depth=2m depth=unknown');
  assert.deepEqual([result.ok,result.diagnostics[0].code,result.model,result.layout,result.json],[false,"VRL_SYNTAX_DUPLICATE_ATTRIBUTE",null,null,null]);
});

test("direct normalization rejects negative pool depth", /**
 * Prevent alternative application validators from bypassing the domain-owned nonnegative range.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of an invariant failure.
 */ () => { assert.throws(/**
   * Invoke the domain boundary with a deliberately negative depth measurement.
   * @responsibility coordinator
   * @returns {Object} Unreachable normalized model; RangeError propagates.
   */ ()=>normalizeRoute(parseVrl('route Example\npool P1 depth=-1m').ast),RangeError); });

for(const language of ["en","es"]) for(const depth of ["2.5m","0m","unknown"]) for(const options of [{},{style:"soft-terrain"},{style:"soft-terrain",flow:"rows",monochrome:true}]) {
  test(`pool depth remains visible and accessible: ${language}/${depth}/${JSON.stringify(options)}`, /**
   * Decode actual SVG text, verify independently specified depth wording and check complete primitive bounds.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of depth preservation and unclipped output in each presentation.
   */ () => {
    const result=compileRoute(`route Example\npool P1 depth=${depth} type=deep flow=low note="Observed value"`,{layout:{width:320}});
    const document=documentFor(renderTopoSvg(result.model,result.layout,{...options,language})), parts=[];
    for(const node of document.getElementsByTagName("text")) parts.push(node.textContent);
    const value=depth==="unknown" && language==="es" ? "desconocido" : depth;
    const visible=(language==="en" ? "pool depth: " : "profundidad de poza: ")+value;
    const accessible=(language==="en" ? "Measured pool depth: " : "Profundidad medida de poza: ")+value;
    assert.deepEqual([parts.join(" ").replace(/\s+/g," ").includes(visible),document.getElementsByTagName("desc")[0].textContent.includes(accessible),clippedPrimitives(document)],[true,true,[]]);
  });
}

for(const language of ["en","es"]) {
  test(`pool depth retains independent category, flow and note facts in ${language}`, /**
   * Require every supplied pool fact in the complete HTML alternative with no contradictory placeholder.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the independently specified complete translated fact list.
   */ () => {
    const result=compileRoute(source);
    const document=documentFor(renderRouteText(result.model,{language}));
    const facts=describeRoute(result.model,{language}).entries[0].facts;
    assert.deepEqual([facts,document.documentElement.textContent.includes("Observed value")],
      [language==="en" ? ["Measured pool depth: 2.5m","Flow: low","Note: Observed value","Type: deep"] : ["Profundidad medida de poza: 2.5m","Flujo: bajo","Nota: Observed value","Tipo: profunda"],true]);
  });
  test(`advanced pool formatter keeps depth, category and note in ${language}`, /**
   * Preserve each supplied descriptive fact in the supported compact text formatter.
   * @responsibility coordinator
   * @returns {void} Completes one assertion against an independent localized detail string.
   */ () => { assert.equal(formatElementDetail(compileRoute(source).model.elements[0],language),language==="en" ? "pool depth: 2.5m / pool type: deep / Observed value" : "profundidad de poza: 2.5m / tipo de poza: profunda / Observed value"); });
}

for(const style of ["classic","soft-terrain"]) {
  test(`pool depth does not rescale symbolic geometry in ${style}`, /**
   * Compare the independent marker placement for the same category with absent, zero and large depth claims.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of unchanged pool marker and actual basin/surface geometry, with an explicit silhouette count.
   */ () => {
    const markers=[], silhouettes=[];
    for(const suffix of [""," depth=0m"," depth=100m"]) {
      const result=compileRoute('route Example\npool P1 type=deep'+suffix);
      const scene=computeTopoScene(result.model,result.layout,{style});
      markers.push(scene.nodes[0].drawing.marker);
      silhouettes.push(scene.pools);
    }
    assert.deepEqual([markers[0] !== undefined,markers,silhouettes[0].length,silhouettes],
      [true,[markers[0],markers[0],markers[0]],style==="soft-terrain" ? 1 : 0,[silhouettes[0],silhouettes[0],silhouettes[0]]]);
  });
}

test("revision 3 extension depth remains literal when a saved model is rendered", /**
 * Preserve historical documentary data without silently promoting it into a revision-4 measurement.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of old depth ownership, unknown placeholder and literal extension fact.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL('./fixtures/model-v3.json',import.meta.url),'utf8'));
  const model=previous.model, before=JSON.stringify(model);
  renderTopoSvg(model,computeVerticalLayout(model));
  assert.deepEqual([describeRoute(model).entries[1].facts,JSON.stringify(model)===before],
    [["Measured pool depth: unknown",'Additional field "depth": 2m',"Type: deep"],true]);
});

test("recompiling historical numeric pool depth promotes only its scoped known field", /**
 * Make the explicit source migration observable while retaining the independent unknown technical declarations.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of promoted depth and retained unknown height/rope.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL('./fixtures/model-v3.json',import.meta.url),'utf8'));
  const result=compileRoute(previous.source);
  assert.deepEqual([result.model.elements[1].attributes.depth,result.model.elements[1].extensions.depth,result.model.elements[0].attributes.height,result.model.elements[0].attributes.rope],
    [{value:2,unit:"m",meters:2},undefined,"unknown","unknown"]);
});

test("renamed pool depth prose remains literal without claiming a measurement", /**
 * Verify the documented migration for prior arbitrary depth extension text.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of literal extension retention and absent typed depth.
 */ () => {
  const result=compileRoute('route Example\npool P1 depth_note="variable"');
  assert.deepEqual([result.ok,result.model.elements[0].attributes.depth,result.model.elements[0].extensions.depth_note],[true,undefined,"variable"]);
});

test("shared state retains zero depth without adding a warning or technical movement", /**
 * Check successful framework-neutral state and exact zero preservation across JSON and SVG.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of stable success, presentation and physical meaning.
 */ () => {
  const state=createDiagramState('route Example\npool P1 depth=0m');
  assert.deepEqual([state.ok,state.diagnostics,state.svg.includes("pool depth: 0m"),JSON.parse(state.json).elements[0].attributes.depth.meters,state.model.traversal.segments],[true,[],true,0,[]]);
});

test("revision 4 changes only the normalized model inventory revision", /**
 * Keep the field-promotion compatibility boundary explicit while retaining all runtime exports and prior revisions.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the scoped contract revision.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL('../docs/contracts/v3.json',import.meta.url),'utf8'));
  const current=JSON.parse(readFileSync(new URL('../docs/contracts/v4.json',import.meta.url),'utf8'));
  assert.deepEqual(current,{...previous,revision:4,contracts:{...previous.contracts,model:4}});
});


test("legacy unscoped normalization converts depth without claiming semantic validity", /**
 * Distinguish permissive token conversion from the strict pool-only, nonnegative route boundary.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of conversion, sentinel preservation and unparseable literal retention.
 */ () => {
  assert.deepEqual([normalizeAttributes({depth:"2m"}),normalizeAttributes({depth:"unknown"}),normalizeAttributes({depth:"-1m"}),normalizeAttributes({depth:"variable"})],
    [{depth:{value:2,unit:"m",meters:2}},{depth:"unknown"},{depth:{value:-1,unit:"m",meters:-1}},{depth:"variable"}]);
});
