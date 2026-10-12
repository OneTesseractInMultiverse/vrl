import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, parseVrl, normalizeRoute, summarizeRouteMeasurements, exportRouteJson, computeVerticalLayout } from "@subvertic/vrl-core";
import { describeRoute, renderRouteText, renderTopoSvg } from "@subvertic/vrl-render-svg";
import { detailRecordsForElement, detailRecordText } from "../packages/vrl-render-svg/src/detail-content.js";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

const source='route Example\nwalk W1 distance=5m phase=approach\nrappel R1 height=4m rope=8m phase=canyon\nwalk W2 distance=7m phase=return';

/**
 * Project explicitly owned phases while distinguishing absence from the string unknown.
 * @responsibility computation
 * @param {Object} model - Normalized document whose elements are read without mutation.
 * @returns {Array} Source-ordered membership values; missing fields remain undefined.
 */
function phases(model) {
  const result=[];
  for(const element of model.elements) result.push(element.attributes.phase);
  return result;
}

for(const [type,required] of [["start",""],["exit",""],["walk",""],["swim",""],["rappel","height=4m rope=8m"],["downclimb","height=2m"],["climb","height=2m"],["pool",""],["hazard",""]]) {
  for(const phase of ["approach","canyon","return"]) {
    test(`${type} owns explicit ${phase} membership in model and JSON`, /**
     * Verify a supplied membership is typed on its exact owner, with no extension fallback.
     * @responsibility coordinator
     * @returns {void} Completes one assertion of success, warnings, typed model and JSON ownership.
     */ () => {
      const result=compileRoute(`route Example\n${type} X1 ${required} phase="${phase}"`);
      assert.deepEqual([result.ok,result.diagnostics,phases(result.model),phases(JSON.parse(result.json)),result.model.elements[0].extensions.phase],
        [true,[],[phase],[phase],undefined]);
    });
  }
}
test("phase membership never carries forward or derives from adjacent facts", /**
 * Separate unknown membership from supplied source order, a phase-like ID, note and adjacent annotation.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of only explicitly supplied membership.
 */ () => {
  const result=compileRoute('route Example\nstart S1 phase=approach\nwalk canyon distance=2m\nnote N1 text="Return begins"\nhazard H1\nrappel R1 height=4m rope=8m phase=canyon\npool P1\nswim SW1\nexit E1');
  assert.deepEqual(phases(result.model),["approach",undefined,undefined,undefined,"canyon",undefined,undefined,undefined]);
});
test("interleaved phases remain independent memberships without transition rules", /**
 * Preserve repeated and interleaved source values without imposing a section state machine.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of successful exact source-ordered membership.
 */ () => {
  const result=compileRoute('route Example\nwalk W1 phase=return\nwalk W2 phase=approach\nwalk W3 phase=canyon\nwalk W4 phase=approach');
  assert.deepEqual([result.ok,result.diagnostics,phases(result.model)],[true,[],["return","approach","canyon","approach"]]);
});
for(const value of ["unknown","Approach","approach return","", " approach","return ","__proto__","constructor","1m","retorno","approаch"]) {
  test(`invalid phase ${JSON.stringify(value)} fails at the value and blocks outputs`, /**
   * Reject unsupported case, whitespace, translated, confusable and prototype-like values without coercion.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of diagnostic identity, span and absent derived outputs.
   */ () => {
    const result=compileRoute(`route Example\nwalk W1 phase=${JSON.stringify(value)}`), d=result.diagnostics[0];
    assert.deepEqual([result.ok,d.code,d.severity,d.span,result.model,result.layout,result.json],
      [false,"VRL_FIELD_UNSUPPORTED_VALUE","error",{start:{line:2,column:15},end:{line:2,column:17+value.length}},null,null,null]);
  });
}
test("duplicate phase declarations fail before a model is produced", /**
 * Keep one explicit owner value by rejecting competing declarations instead of selecting the last.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of duplicate-key failure and short circuit.
 */ () => {
  const result=compileRoute('route Example\nwalk W1 phase=approach phase=canyon');
  assert.deepEqual([result.ok,result.diagnostics[0].code,result.model],[false,"VRL_SYNTAX_DUPLICATE_ATTRIBUTE",null]);
});
test("direct normalization enforces phase vocabulary", /**
 * Exercise the domain invariant independently of the compiler validation adapter.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of rejection at strict normalization.
 */ () => {
  assert.throws(/**
   * Submit syntactically valid but unsupported membership directly to domain normalization.
   * @responsibility coordinator
   * @returns {Object} Unreachable normalized model; invariant failure propagates.
   */ () => normalizeRoute(parseVrl('route Example\nwalk W1 phase=unknown').ast),RangeError);
});
test("metadata phase remains literal and never supplies element membership", /**
 * Preserve the element-only boundary even for a recognizable metadata value.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of metadata extension ownership and unspecified element phase.
 */ () => {
  const result=compileRoute('route Example\nmetadata phase=approach\nwalk W1');
  assert.deepEqual([result.model.metadata,result.model.extensions,phases(result.model),describeRoute(result.model,{language:"es"}).metadata],
    [{},{phase:"approach"},[undefined],['Campo adicional "phase": approach']]);
});
test("phase changes preserve traversal, summaries and physical layout", /**
 * Compare differently tagged copies of identical physical facts without asserting screen labels are unchanged.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of canonical associations, aggregate scope and actual coordinates.
 */ () => {
  const plain=compileRoute(source.replaceAll(/ phase=\w+/g,""));
  const tagged=compileRoute(source);
  const coords=[], baseline=[];
  for(const node of tagged.layout.nodes) coords.push([node.x,node.y,node.elevationMeters]);
  for(const node of plain.layout.nodes) baseline.push([node.x,node.y,node.elevationMeters]);
  assert.deepEqual([tagged.model.traversal,tagged.model.summary,summarizeRouteMeasurements(tagged.model.elements,tagged.model.metadata),coords],
    [plain.model.traversal,plain.model.summary,summarizeRouteMeasurements(plain.model.elements,plain.model.metadata),baseline]);
});
test("phase-tagged annotations preserve reached boundary without adding motion", /**
 * Verify membership cannot move an annotation to a different phase or progression point.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of independent physical ownership and explicit annotation phase.
 */ () => {
  const result=compileRoute('route Example\nrappel R1 height=4m rope=8m phase=canyon\nnote N1 phase=return text=Literal\nhazard H1 phase=approach');
  assert.deepEqual([result.model.traversal,phases(result.model)],
    [{points:[{elementIndex:0},{elementIndex:null}],segments:[{from:0,to:1,kind:"technical",elementIndex:0,direction:"down",verticalDeltaMeters:-4}],annotations:[{elementIndex:1,pointIndex:1},{elementIndex:2,pointIndex:1}]},["canyon",undefined,"approach"]]);
});
test("phase facts preserve their exact localized membership", /**
 * Detect phase loss or mistranslation with an independently authored Spanish oracle.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of complete ordered facts.
 */ () => {
  const model=compileRoute('route Example\nwalk W1 distance=5m phase=approach').model;
  assert.deepEqual(describeRoute(model,{language:"es"}).entries[0].facts,["Distancia a pie: 5m","Fase: aproximacion"]);
});
for(const language of ["en","es"]) for(const render of [{},{style:"soft-terrain"},{style:"soft-terrain",flow:"rows",symbols:"minimal"},{style:"soft-terrain",flow:"rows",symbols:"minimal",monochrome:true}]) {
  test(`phase text remains visible and accessible: ${language} ${JSON.stringify(render)}`, /**
   * Verify each explicit category survives real visible text, full description and HTML without color dependence.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of complete labels, valid XML and bounded primitive output.
   */ () => {
    const result=compileRoute(source,{layout:{width:320}});
    const svg=renderTopoSvg(result.model,result.layout,{...render,language});
    const document=documentFor(svg), visible=[];
    for(const node of document.getElementsByTagName("text")) visible.push(node.textContent);
    const text=visible.join(" "), description=describeRoute(result.model,{language}).text, html=renderRouteText(result.model,{language});
    const expected=language==="es" ? ["Fase: aproximacion","Fase: barranco","Fase: retorno"] : ["Phase: approach","Phase: canyon","Phase: return"];
    const retained=[];
    for(const fact of expected) retained.push([text.includes(fact),description.includes(fact),html.includes(fact)]);
    assert.deepEqual([retained,clippedPrimitives(document)],[[[true,true,true],[true,true,true],[true,true,true]],[]]);
  });
}
for(const type of ["start","exit"]) {
  test(`elevated ${type} retains its phase alongside measured elevation`, /**
   * Exercise the endpoint detail early-return case without replacing its supplied elevation.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of both independently expected detail records.
   */ () => {
    const model=compileRoute(`route Example\n${type} X1 phase=return`).model;
    const records=detailRecordsForElement(model.elements[0],{elevationMeters:12},"en"), texts=[];
    for(const record of records) texts.push(detailRecordText(record));
    assert.deepEqual(texts,["12m","Phase: return"]);
  });
}
test("historical phase extensions remain literal without silent promotion", /**
 * Use pinned revision-5 data to prevent render-time reinterpretation of stored extensions.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of saved JSON, exact literal facts and immutable input.
 */ () => {
  const fixture=JSON.parse(readFileSync(new URL("./fixtures/model-v5.json",import.meta.url),"utf8"));
  const before=JSON.stringify(fixture.model);
  const svg=renderTopoSvg(fixture.model,computeVerticalLayout(fixture.model),{language:"es"});
  assert.deepEqual([JSON.parse(exportRouteJson(fixture.model)),describeRoute(fixture.model,{language:"es"}).entries[1].facts,JSON.stringify(fixture.model)===before,svg.includes("Phase:")],
    [fixture.model,['Distancia a pie: 5m','Campo adicional "phase": approach'],true,false]);
});
test("historical arbitrary phase prose needs explicit source migration", /**
 * Reject recompilation that would otherwise silently interpret unsupported old extension prose.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of blocking diagnostic and successful renamed prose retention.
 */ () => {
  const fixture=JSON.parse(readFileSync(new URL("./fixtures/model-v5.json",import.meta.url),"utf8"));
  const rejected=compileRoute(fixture.source), migrated=compileRoute(fixture.source.replace('phase="approach & return"','phase_note="approach & return"'));
  assert.deepEqual([rejected.ok,rejected.diagnostics[0].code,migrated.ok,migrated.model.elements[0].extensions.phase_note,phases(migrated.model)],
    [false,"VRL_FIELD_UNSUPPORTED_VALUE",true,"approach & return",[undefined,"approach"]]);
});
test("compatible-view unfamiliar typed phase text is escaped without translation", /**
 * Preserve caller-owned unfamiliar view data literally while keeping serialization safe.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of owned phase text, escaped HTML and no input mutation.
 */ () => {
  const model=compileRoute('route Example\nwalk W1').model;
  model.elements[0].attributes.phase="<custom>";
  const before=JSON.stringify(model);
  assert.deepEqual([describeRoute(model).entries[0].facts,renderRouteText(model).includes("Phase: &lt;custom&gt;"),JSON.stringify(model)===before],
    [["Walking distance: unknown","Phase: <custom>"],true,true]);
});
test("shared diagram state retains membership deterministically without new warnings", /**
 * Verify the framework-neutral pipeline propagates phase and leaves warnings empty for valid membership.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact phase facts and repeatable output.
 */ () => {
  const first=createDiagramState(source), second=createDiagramState(source);
  assert.deepEqual([first.ok,first.diagnostics,phases(JSON.parse(first.json)),first.json===second.json,first.svg===second.svg],[true,[],["approach","canyon","return"],true,true]);
});
test("revision 6 changes only the model field contract", /**
 * Pin the extension-promotion boundary while retaining all exports and AST vocabulary.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the independently specified inventory revision.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL("../docs/contracts/v5.json",import.meta.url),"utf8"));
  const current=JSON.parse(readFileSync(new URL("../docs/contracts/v6.json",import.meta.url),"utf8"));
  assert.deepEqual(current,{...previous,revision:6,contracts:{...previous.contracts,model:6}});
});
for(const phase of ["approach","canyon","return"]) {
  test(`programmatic notes may explicitly own ${phase} membership`, /**
   * Exercise domain membership on notes independently of the source free-text grammar.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of typed ownership and the literal note body.
   */ () => {
    const ast=parseVrl('route Example\nnote "Literal"').ast;
    ast.elements[0].attributes.phase=phase;
    const model=normalizeRoute(ast);
    assert.deepEqual([phases(model),model.elements[0].extensions.text],[[phase],"Literal"]);
  });
}
test("source note assignment-shaped text stays literal without phase membership", /**
 * Keep source compatibility instead of consuming a phase-looking fragment as a new attribute.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of literal text and absent domain membership.
 */ () => {
  const model=compileRoute('route Example\nnote phase=return').model;
  assert.deepEqual([phases(model),model.elements[0].extensions.text],[[undefined],"phase=return"]);
});
test("Spanish walking titles do not imply approach membership", /**
 * Prevent the former walking translation from contradicting return or unspecified phase declarations.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of movement titles independent of membership.
 */ () => {
  const result=compileRoute('route Example\nwalk W1 phase=return\nwalk W2');
  const description=describeRoute(result.model,{language:"es"});
  assert.deepEqual([description.entries[0].title,description.entries[0].facts,description.entries[1].title,description.entries[1].facts],
    ["Caminata W1",["Distancia a pie: desconocido","Fase: retorno"],"Caminata W2",["Distancia a pie: desconocido"]]);
});
