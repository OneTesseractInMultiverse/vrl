import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, parseVrl, normalizeRoute, normalizeElement, validateElement, validateRoute, normalizeAttributes, exportRouteJson, summarizeRouteMeasurements, computeVerticalLayout } from "@subvertic/vrl-core";
import { describeRoute, renderRouteText, renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

for (const [label,body,index] of [
  ["backward","pool P1 depth=2m\nswim SW1 distance=12m pool_ref=P1",1],
  ["forward","swim SW1 distance=12m pool_ref=P1\npool P1 depth=2m",0]
]) {
  test(`explicit pool association resolves ${label} without replacing the ID`, /**
   * Verify the authored relationship retains independent pool and swim dimensions through JSON.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of successful exact normalized identity and measurement.
   */ () => {
    const result=compileRoute(`route Example\n${body}`), element=JSON.parse(result.json).elements[index];
    assert.deepEqual([result.ok,result.diagnostics,element.attributes,element.extensions],
      [true,[],{distance:{value:12,unit:"m",meters:12},pool_ref:"P1"},{}]);
  });
}
test("one pool can be explicitly associated with multiple swims", /**
 * Preserve many-to-one authored associations without collapsing movement entries.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of distinct swim identities and exact references.
 */ () => {
  const result=compileRoute('route Example\npool P1\nswim SW1 pool_ref=P1\nswim SW2 pool_ref=P1');
  assert.deepEqual([result.ok,result.model.elements[1].attributes,result.model.elements[2].attributes,result.model.elements[2].id],
    [true,{pool_ref:"P1"},{pool_ref:"P1"},"SW2"]);
});
test("absent pool references never derive from adjacent facts", /**
 * Keep a swimmer-category pool, shared phase and annotation text separate from an explicit reference.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of absent reference and complete independent swimming facts.
 */ () => {
  const result=compileRoute('route Example\npool P1 type=swimmer depth=2m phase=canyon\nswim SW1 phase=canyon note="pool P1"');
  assert.deepEqual([Object.hasOwn(result.model.elements[1].attributes,"pool_ref"),describeRoute(result.model).entries[1].facts],
    [false,["Movement: swimming","Swimming distance: unknown","Note: pool P1","Phase: canyon"]]);
});
for(const id of ["P1","outer pool","__proto__","constructor","unknown","low","2m"," P1 ","poza-ñ-😀",'<pool&"literal>']) {
  test(`pool references preserve exact literal identity ${JSON.stringify(id)}`, /**
   * Resolve legal explicit IDs without normalization, sentinel interpretation, property lookup or translation.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of model and Spanish text identity.
   */ () => {
    const result=compileRoute(`route Example\npool ${JSON.stringify(id)}\nswim SW1 pool_ref=${JSON.stringify(id)}`);
    assert.deepEqual([result.ok,result.model.elements[1].attributes.pool_ref,describeRoute(result.model,{language:"es"}).entries[1].facts],
      [true,id,["Movimiento: nado","Distancia a nado: desconocido",`Referencia de poza: ${id}`]]);
  });
}
for(const token of ['""','"   "','"\t"','"\u00a0"']) {
  test(`blank pool reference ${JSON.stringify(token)} fails locally`, /**
   * Require a nonblank exact ID rather than converting absent information into a reference.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of located syntax validation and short-circuited derived outputs.
   */ () => {
    const result=compileRoute(`route Example\nswim SW1 pool_ref=${token}`);
    assert.deepEqual([result.ok,result.diagnostics[0].code,result.diagnostics[0].location,result.model,result.layout,result.json],
      [false,"VRL_FIELD_REFERENCE_SYNTAX",{line:2,column:19},null,null,null]);
  });
}
for(const [name,body] of [
  ["missing","swim SW1 pool_ref=P1"],
  ["generated pool","pool\nswim SW1 pool_ref=P1"],
  ["different case","pool p1\nswim SW1 pool_ref=P1"],
  ["different spaces",'pool P1\nswim SW1 pool_ref=" P1 "'],
  ["pool id extension","pool id=P1\nswim SW1 pool_ref=P1"]
]) {
  test(`pool reference rejects ${name} targets`, /**
   * Require explicit target identity, not generated numbering or a similar spelling.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of deterministic missing-target failure and absent outputs.
   */ () => {
    const result=compileRoute(`route Example\n${body}`);
    assert.deepEqual([result.ok,result.diagnostics[0].code,result.diagnostics[0].relatedLocations,result.model,result.layout,result.json],
      [false,"VRL_REFERENCE_TARGET_MISSING",undefined,null,null,null]);
  });
}
test("pool reference to a walk fails instead of accepting a non-pool feature", /**
 * Detect removed type checking with an independently specified blocking diagnostic and target range.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact field and related declaration spans.
 */ () => {
  const result=compileRoute('route Example\nwalk P1\nswim SW1 pool_ref=P1'), d=result.diagnostics[0];
  assert.deepEqual([result.ok,d?.code,d?.span,d?.relatedLocations,result.model,result.layout,result.json],
    [false,"VRL_REFERENCE_TARGET_TYPE",{start:{line:3,column:19},end:{line:3,column:21}},
      [{message:"Referenced non-pool declaration",location:{line:2,column:6},span:{start:{line:2,column:6},end:{line:2,column:8}}}],null,null,null]);
});
test("self references cannot form swimming cycles", /**
 * Enforce the swim-to-pool relation even when the target identifier exists on its owner.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of wrong-type failure without a normalized model.
 */ () => {
  const result=compileRoute('route Example\nswim SW1 pool_ref=SW1');
  assert.deepEqual([result.ok,result.diagnostics[0].code,result.model],[false,"VRL_REFERENCE_TARGET_TYPE",null]);
});
test("ambiguous target declarations fail identity validation before reference resolution", /**
 * Reject duplicates instead of choosing the first or last declaration, suppressing cascading link diagnostics.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of sole duplicate identity error and absent model.
 */ () => {
  const result=compileRoute('route Example\npool P1\nwalk P1\nswim SW1 pool_ref=P1');
  assert.deepEqual([result.ok,result.diagnostics.length,result.diagnostics[0].code,result.model],[false,1,"VRL_IDENTIFIER_DUPLICATE",null]);
});
test("invalid local fields suppress cascading reference errors", /**
 * Keep malformed swimming distance as the primary failure before whole-route reference checks run.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the sole field failure.
 */ () => {
  const result=compileRoute('route Example\nswim SW1 distance=bad pool_ref=missing');
  assert.deepEqual([result.ok,result.diagnostics.length,result.diagnostics[0].code],[false,1,"VRL_FIELD_MEASUREMENT_SYNTAX"]);
});
test("duplicate pool reference keys fail in parsing", /**
 * Preserve single ownership rather than accepting competing target declarations.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of syntax failure and downstream absence.
 */ () => {
  const result=compileRoute('route Example\nswim SW1 pool_ref=P1 pool_ref=P2');
  assert.deepEqual([result.ok,result.diagnostics[0].code,result.model],[false,"VRL_SYNTAX_DUPLICATE_ATTRIBUTE",null]);
});
for(const body of ['swim SW1 pool_ref=missing','walk P1\nswim SW1 pool_ref=P1','pool P1\npool P1\nswim SW1 pool_ref=P1','pool\nswim SW1 pool_ref=P1']) {
  test(`direct route normalization rejects invalid reference context: ${body}`, /**
   * Exercise domain enforcement independently of compiler adapters and source diagnostic conversion.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of a strict whole-route invariant failure.
   */ () => {
    assert.throws(/**
     * Normalize a parsed raw route whose reference context violates the declared target contract.
     * @responsibility coordinator
     * @returns {Object} Unreachable model; RangeError propagates to the assertion.
     */ () => normalizeRoute(parseVrl(`route Example\n${body}`).ast),RangeError);
  });
}
test("programmatic reference diagnostics use source locations without a parser map", /**
 * Preserve useful owner and target locations for caller-provided raw records.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact fallback locations and related context.
 */ () => {
  const ast={name:"Example",metadata:{},elements:[
    {type:"walk",id:"P1",attributes:{},sourceLocation:{line:8,column:4}},
    {type:"swim",id:"SW1",attributes:{pool_ref:"P1"},sourceLocation:{line:12,column:7}}]};
  const d=validateRoute(ast)[0];
  assert.deepEqual([d.code,d.location,d.span,d.relatedLocations],
    ["VRL_REFERENCE_TARGET_TYPE",{line:12,column:7},undefined,[{message:"Referenced non-pool declaration",location:{line:8,column:4}}]]);
});
test("reference diagnostics without any provenance use the established default location", /**
 * Exercise raw AST resolution without optional locations or source maps.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of stable fallback location and code.
 */ () => {
  const d=validateRoute({name:"Example",metadata:{},elements:[{type:"swim",attributes:{pool_ref:"P1"}}]})[0];
  assert.deepEqual([d.code,d.location],["VRL_REFERENCE_TARGET_MISSING",{line:1,column:1}]);
});
test("isolated element normalization retains an unresolved identifier without claiming resolution", /**
 * Document the intentionally local contract of existing element-only advanced helpers.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of syntactic acceptance and preserved reference string.
 */ () => {
  const element={type:"swim",id:"SW1",attributes:{pool_ref:"P1"}};
  assert.deepEqual([validateElement(element),normalizeElement(element).attributes],[[],{pool_ref:"P1"}]);
});
test("legacy unscoped conversion does not resolve or coerce pool references", /**
 * Preserve permissive compatibility conversion while rejecting no whole-route context implicitly.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of exact unchanged valid, blank and nonstring values.
 */ () => {
  assert.deepEqual([normalizeAttributes({pool_ref:" P1 "}),normalizeAttributes({pool_ref:""}),normalizeAttributes({pool_ref:7})],
    [{pool_ref:" P1 "},{pool_ref:""},{pool_ref:7}]);
});
for(const statement of ["metadata","walk W1","pool P1","hazard H1","rappel R1 height=2m rope=4m"]) {
  test(`pool_ref remains literal outside swimming: ${statement}`, /**
   * Prevent new relationships from being inferred from metadata or non-swim extensions.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of scoped ownership and untranslated text.
   */ () => {
    const result=compileRoute(`route Example\n${statement} pool_ref=low`);
    const record=statement==="metadata" ? result.model : result.model.elements[0];
    const fields=statement==="metadata" ? record.metadata : record.attributes;
    assert.deepEqual([result.ok,Object.hasOwn(fields,"pool_ref"),record.extensions.pool_ref],[true,false,"low"]);
  });
}
test("pool back-reference extension does not create a typed cycle", /**
 * Keep a pool's opaque source text separate from the valid swim-owned association.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of disjoint ownership without cycle inference.
 */ () => {
  const result=compileRoute('route Example\npool P1 pool_ref=SW1\nswim SW1 pool_ref=P1');
  assert.deepEqual([result.ok,result.model.elements[0].extensions,result.model.elements[1].attributes],
    [true,{pool_ref:"SW1"},{pool_ref:"P1"}]);
});
test("pool references preserve physical associations and route-wide summaries", /**
 * Compare identical route facts with and without explicit feature association.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of canonical traversal, summary and coordinates without merged points.
 */ () => {
  const source='route Example\nmetadata entrance_elevation=10m exit_elevation=6m\nstart\npool P1 depth=2m\nswim SW1 distance=12m phase=canyon\nrappel R1 height=4m rope=8m\nhazard H1\nwalk W1 distance=5m\nexit';
  const plain=compileRoute(source), linked=compileRoute(source.replace("swim SW1","swim SW1 pool_ref=P1"));
  const points=[], expected=[];
  for(const node of linked.layout.nodes) points.push([node.x,node.y,node.elevationMeters]);
  for(const node of plain.layout.nodes) expected.push([node.x,node.y,node.elevationMeters]);
  assert.deepEqual([linked.diagnostics,linked.model.traversal,linked.model.summary,summarizeRouteMeasurements(linked.model.elements),points],
    [plain.diagnostics,plain.model.traversal,plain.model.summary,summarizeRouteMeasurements(plain.model.elements),expected]);
});
for(const language of ["en","es"]) for(const render of [{},{style:"soft-terrain"},{style:"soft-terrain",flow:"rows",symbols:"minimal"},{style:"soft-terrain",flow:"rows",symbols:"minimal",monochrome:true}]) {
  test(`pool reference remains visible, literal and accessible: ${language} ${JSON.stringify(render)}`, /**
   * Independently inspect visible XML, full text and HTML in each supported presentation.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of retained hostile literal ID and bounded SVG primitives.
   */ () => {
    const result=compileRoute('route Example\npool "<P&1>"\nswim SW1 pool_ref="<P&1>"',{layout:{width:320}});
    const svg=renderTopoSvg(result.model,result.layout,{...render,language}), document=documentFor(svg), texts=[];
    for(const node of document.getElementsByTagName("text")) texts.push(node.textContent);
    const prefix=language==="es" ? "Referencia de poza" : "Pool reference";
    const description=describeRoute(result.model,{language}).entries[1].facts;
    assert.deepEqual([texts.join(" ").includes(`${prefix}: <P&1>`),description,renderRouteText(result.model,{language}).includes(`${prefix}: &lt;P&amp;1&gt;`),clippedPrimitives(document)],
      [true,language==="es" ? ["Movimiento: nado","Distancia a nado: desconocido","Referencia de poza: <P&1>"] : ["Movement: swimming","Swimming distance: unknown","Pool reference: <P&1>"],true,[]]);
  });
}
test("saved revision-6 extension associations remain literal and immutable", /**
 * Use a pinned pre-feature model to prevent silent relationship promotion during rendering.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of original JSON, literal extension facts and unchanged input.
 */ () => {
  const fixture=JSON.parse(readFileSync(new URL("./fixtures/model-v6.json",import.meta.url),"utf8"));
  const before=JSON.stringify(fixture.model);
  renderTopoSvg(fixture.model,computeVerticalLayout(fixture.model));
  assert.deepEqual([JSON.parse(exportRouteJson(fixture.model)),describeRoute(fixture.model,{language:"es"}).entries[1].facts,JSON.stringify(fixture.model)===before],
    [fixture.model,["Movimiento: nado","Distancia a nado: 12m","Fase: barranco",'Campo adicional "pool_ref": P1'],true]);
});
test("recompiling old valid reference text promotes only an explicitly resolved association", /**
 * Pin source migration from stored extension text into the newly validated known field.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of typed membership, separate phase and absent extension.
 */ () => {
  const fixture=JSON.parse(readFileSync(new URL("./fixtures/model-v6.json",import.meta.url),"utf8"));
  const result=compileRoute(fixture.source), element=result.model.elements[1];
  assert.deepEqual([result.ok,element.attributes.pool_ref,element.attributes.phase,element.extensions.pool_ref],[true,"P1","canyon",undefined]);
});
test("arbitrary old swim reference prose must migrate to an unrecognized key", /**
 * Reject unsupported historical prose as a relationship while preserving a documented literal migration.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of failure and renamed extension retention.
 */ () => {
  const source='route Example\nswim SW1 pool_ref="as described above"';
  const invalid=compileRoute(source), migrated=compileRoute(source.replace("pool_ref=","pool_note="));
  assert.deepEqual([invalid.ok,invalid.diagnostics[0].code,migrated.ok,migrated.model.elements[0].extensions.pool_note],
    [false,"VRL_REFERENCE_TARGET_MISSING",true,"as described above"]);
});
test("shared state propagates failed associations without a diagram", /**
 * Observe framework-neutral failure instead of allowing stale or fabricated success output.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of reference diagnostic and absent model, JSON and SVG.
 */ () => {
  const state=createDiagramState('route Example\nswim SW1 pool_ref=P1');
  assert.deepEqual([state.ok,state.diagnostics[0].code,state.model,state.json,state.svg],
    [false,"VRL_REFERENCE_TARGET_MISSING",null,null,""]);
});
test("reference results remain deterministic across repeated whole-route compilation", /**
 * Preserve ordered multiple errors and source spans without retained lookup state.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of full result equality.
 */ () => {
  const source='route Example\nswim SW1 pool_ref=P2\nswim SW2 pool_ref=P1\nwalk P1';
  assert.deepEqual(compileRoute(source),compileRoute(source));
});
test("revision 7 changes only the normalized model field contract", /**
 * Retain exports, AST vocabulary and prior structural revisions while promoting reference ownership.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the exact inventory difference.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL("../docs/contracts/v6.json",import.meta.url),"utf8"));
  const current=JSON.parse(readFileSync(new URL("../docs/contracts/v7.json",import.meta.url),"utf8"));
  assert.deepEqual(current,{...previous,revision:7,contracts:{...previous.contracts,model:7}});
});
test("explicit references remain stable when earlier generated pool numbering changes", /**
 * Reserve explicit IDs across the whole document so inserting an unreferenced pool cannot retarget a link.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of generated-ID collision avoidance and stable explicit ownership.
 */ () => {
  const result=compileRoute('route Example\npool\nswim SW1 pool_ref=P1\npool P1 depth=2m');
  assert.deepEqual([result.ok,result.model.elements[0].id,result.model.elements[1].attributes.pool_ref,result.model.elements[2].id],
    [true,"P2","P1","P1"]);
});
test("many forward associations resolve without expanding a navigation graph", /**
 * Exercise a bounded many-to-one input while requiring exactly the source elements and unchanged string references.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of complete normalization without merged or expanded elements.
 */ () => {
  const ast=parseVrl('route Example\n'+ 'swim pool_ref=P1\n'.repeat(1200)+'pool P1').ast;
  const model=normalizeRoute(ast);
  assert.deepEqual([model.elements.length,model.elements[0].attributes.pool_ref,model.elements[1199].attributes.pool_ref,model.elements[1200].id],
    [1201,"P1","P1","P1"]);
});
