import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, normalizeRoute, parseVrl, parseMeasurementToken, validateGeometry } from "@subvertic/vrl-core";
import { renderTopoSvg, renderRouteText, formatElementDetail } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

const source = 'route "Synthetic unknown height"\nrappel R1 height=unknown rope=20m anchor=bolts';

test("unknown rappel height preserves a null physical delta through JSON", /**
 * Verify retained uncertainty and owned descent independently of schematic pixel geometry and rope length.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of source, normalized and serialized height/motion facts.
 */ () => {
  const result = compileRoute(source), saved = JSON.parse(result.json);
  assert.deepEqual([result.ok, result.model.elements[0].attributes.height, saved.elements[0].attributes.height,
    saved.traversal.segments, result.layout.segments[0].verticalDeltaMeters],
  [true,"unknown","unknown",[{from:0,to:1,elementIndex:0,kind:"technical",direction:"down",verticalDeltaMeters:null}],null]);
});

for (const [token,end] of [["unknown",25],['"unknown"',27]]) {
  test(`unknown height diagnostic locates the ${token} value`, /**
   * Check decoded sentinel semantics and the independently counted bare/quoted UTF-16 source span.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of nonblocking diagnostic code, severity and exact value location.
   */ () => {
    const result = compileRoute(`route Example\nrappel R1 height=${token} rope=20m`);
    const diagnostic = result.diagnostics[0];
    assert.deepEqual([result.ok,result.diagnostics.length,diagnostic.code,diagnostic.kind,diagnostic.severity,diagnostic.location,diagnostic.span],
      [true,1,"VRL_GEOMETRY_HEIGHT_UNKNOWN","geometry","warning",{line:2,column:18},{start:{line:2,column:18},end:{line:2,column:end}}]);
  });
}

test("both unknown declarations retain their own warnings and sentinel values", /**
 * Keep independent height and rope uncertainty without inferring either value from the other.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the two retained values and ordered warning identities.
 */ () => {
  const result=compileRoute('route Example\nrappel R1 height=unknown rope=unknown');
  assert.deepEqual([result.model.elements[0].attributes,result.diagnostics.map(/**
   * Select the stable diagnostic identity in emitted order.
   * @responsibility computation
   * @param {Object} item - Source or geometry diagnostic.
   * @returns {string} Diagnostic code.
   */ item=>item.code)], [{height:"unknown",rope:"unknown"},["VRL_ROPE_LENGTH_UNKNOWN","VRL_GEOMETRY_HEIGHT_UNKNOWN"]]);
});

test("unknown height retains adjacent technical owners and reached annotations", /**
 * Compare descent/ascent ownership and annotation attachment with independently specified source facts.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of ordered technical deltas and the annotation boundary.
 */ () => {
  const result=compileRoute(source+'\nnote "Base"\nrappel R2 height=4m rope=8m\nclimb C1 height=2m');
  assert.deepEqual([result.model.traversal.segments.map(/**
   * Project source owner and physical delta, excluding diagram coordinates.
   * @responsibility computation
   * @param {Object} segment - Canonical technical segment.
   * @returns {Array} Owner index and nullable signed delta.
   */ segment=>[segment.elementIndex,segment.verticalDeltaMeters]),result.model.traversal.annotations],
  [[[0,null],[2,-4],[3,2]],[{elementIndex:1,pointIndex:1}]]);
});

test("inclination and declared rope never fill unknown height", /**
 * Preserve independent measurements while keeping physical motion null through model and layout.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of retained inclination/rope and unknown descent.
 */ () => {
  const result=compileRoute(source+' inclination=80% traverse=3m station=right landing=dry');
  assert.deepEqual([result.model.elements[0].attributes,result.model.traversal.segments[0].verticalDeltaMeters],
    [{height:"unknown",rope:{value:20,unit:"m",meters:20},anchor:"bolts",inclination:{value:80,unit:"%",percent:80},traverse:{value:3,unit:"m",meters:3},station:"right",landing:"dry"},null]);
});

test("legacy height maxima remain partial observations without overwriting unknowns", /**
 * Retain the existing numeric summary contract while proving that unknown height stays explicit in the model.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of all-unknown and mixed legacy maxima plus retained uncertainty.
 */ () => {
  const only=compileRoute(source), mixed=compileRoute(source+'\nrappel R2 height=4m rope=8m');
  assert.deepEqual([only.model.summary.highestRappelMeters,mixed.model.summary.highestRappelMeters,mixed.model.elements[0].attributes.height],[0,4,"unknown"]);
});

test("direct normalization preserves unknown height with detached repeatable records", /**
 * Exercise the domain boundary independently of compiler validation and protect caller ownership.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of AST preservation and independent normalized output.
 */ () => {
  const ast=parseVrl(source).ast, first=normalizeRoute(ast), second=normalizeRoute(ast);
  first.elements[0].attributes.height={value:1,unit:"m",meters:1};
  assert.deepEqual([ast.elements[0].attributes.height,second.elements[0].attributes.height,second.traversal.segments[0].verticalDeltaMeters],["unknown","unknown",null]);
});

test("unknown height remains outside the generic metric parser", /**
 * Keep scoped semantic acceptance separate from generic numeric token conversion.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of strict metric parsing.
 */ () => { assert.equal(parseMeasurementToken("unknown").ok,false); });

for (const endpoints of ["entrance_elevation=100m exit_elevation=80m","entrance_elevation=100m exit_elevation=100m","entrance_elevation=100m exit_elevation=120m"]) {
  test(`unknown height rejects a complete profile: ${endpoints}`, /**
   * Prevent rope length, level endpoints or residual connections from inventing a technical height.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of located blocking geometry error and absent derived artifacts.
   */ () => {
    const result=compileRoute(`route Example\nmetadata ${endpoints}\nstart\nwalk distance=10m\nrappel R1 height=unknown rope=20m\nexit`);
    const diagnostic=result.diagnostics[0];
    assert.deepEqual([result.ok,result.model,result.layout,result.json,diagnostic.code,diagnostic.severity,diagnostic.location],
      [false,null,null,null,"VRL_GEOMETRY_HEIGHT_UNKNOWN","error",{line:5,column:18}]);
  });
}

test("one endpoint alone does not establish a measured profile or height", /**
 * Preserve partial endpoint metadata without deriving unknown technical motion.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of schematic success and unknown physical delta.
 */ () => {
  const result=compileRoute('route Example\nmetadata entrance_elevation=100m\nrappel R1 height=unknown rope=20m');
  assert.deepEqual([result.ok,result.layout.elevation,result.model.traversal.segments[0].verticalDeltaMeters,result.diagnostics[0].severity],[true,undefined,null,"warning"]);
});

test("direct geometry validation locates unknown height without parser source maps", /**
 * Verify the programmatic boundary retains a stable fallback location and unknown-height diagnostic.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of fallback location and geometry warning.
 */ () => {
  const model=normalizeRoute({name:"Programmatic",metadata:{},elements:[{type:"rappel",id:"R1",label:null,attributes:{height:"unknown",rope:"20m"}}]});
  const diagnostic=validateGeometry(model)[0];
  assert.deepEqual([diagnostic.code,diagnostic.severity,diagnostic.location],["VRL_GEOMETRY_HEIGHT_UNKNOWN","warning",{line:1,column:1}]);
});

const invalid=[
  ["missing height","rappel R1 rope=20m","VRL_FIELD_REQUIRED"],
  ["empty height",'rappel R1 height="" rope=20m',"VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["zero height","rappel R1 height=0m rope=20m","VRL_FIELD_MEASUREMENT_RANGE"],
  ["negative height","rappel R1 height=-1m rope=20m","VRL_FIELD_MEASUREMENT_RANGE"],
  ["nonmetric height","rappel R1 height=20ft rope=20m","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["uppercase height","rappel R1 height=UNKNOWN rope=20m","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["padded height",'rappel R1 height=" unknown " rope=20m',"VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["climb height","climb C1 height=unknown","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["downclimb height","downclimb D1 height=unknown","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["walk height","walk W1 height=unknown","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["metadata height","metadata height=unknown","VRL_FIELD_MEASUREMENT_SYNTAX"],
  ["missing rope","rappel R1 height=unknown","VRL_FIELD_REQUIRED"],
  ["invalid rope","rappel R1 height=unknown rope=0m","VRL_FIELD_MEASUREMENT_RANGE"],
  ["duplicate height","rappel R1 height=unknown height=12m rope=20m","VRL_SYNTAX_DUPLICATE_ATTRIBUTE"],
  ["stages","rappel R1 height=unknown rope=20m stages=5m+7m","VRL_DETAIL_REQUIRES_KNOWN_HEIGHT"],
  ["redirection","rappel R1 height=unknown rope=20m redirection=5m:left","VRL_DETAIL_REQUIRES_KNOWN_HEIGHT"],
  ["redirections","rappel R1 height=unknown rope=20m redirections=5m:left,7m:right","VRL_DETAIL_REQUIRES_KNOWN_HEIGHT"]
];
for (const [name,statement,code] of invalid) {
  test(`unknown height contract rejects ${name} without artifacts`, /**
   * Require the independently named failure and compiler short-circuit for a deliberately invalid document.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the blocking error and absent model/layout/JSON.
   */ () => {
    const result=compileRoute(`route Invalid\n${statement}`);
    assert.deepEqual([result.ok,result.diagnostics.some(/**
     * Find the expected blocking diagnostic without depending on message wording.
     * @responsibility computation
     * @param {Object} diagnostic - Emitted source or geometry diagnostic.
     * @returns {boolean} Whether code and severity both match the independent expected failure.
     */ diagnostic=>diagnostic.code===code && diagnostic.severity==="error"),result.model,result.layout,result.json],[false,true,null,null,null]);
  });
}

for (const field of ["stages=5m+7m","redirection=5m:left","redirections=5m:left,7m:right"]) {
  test(`direct normalization rejects unpositioned ${field}`, /**
   * Prevent alternate validators from bypassing the domain-owned measured-detail precondition.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the expected invariant failure.
   */ () => {
    assert.throws(/**
     * Invoke the direct domain normalization boundary with an unknown height and positioned detail.
     * @responsibility coordinator
     * @returns {Object} Unreachable normalized model; the domain RangeError propagates.
     */ ()=>normalizeRoute(parseVrl(source+` ${field}`).ast),/unplaceableDetail/);
  });
}

for (const language of ["en","es"]) {
  for (const shape of ["ladder","direct","slab"]) for (const options of [{},{style:"soft-terrain"},{style:"soft-terrain",flow:"rows",monochrome:true}]) {
    test(`unknown height stays visible and accessible: ${language}/${shape}/${JSON.stringify(options)}`, /**
     * Check independent localized uncertainty facts and complete primitive bounds across supported presentations.
     * @responsibility coordinator
     * @returns {void} Completes one assertion of readable height, unknown physical delta and unclipped output.
     */ () => {
      const result=compileRoute(source+` shape=${shape}`,{layout:{width:320}});
      const document=documentFor(renderTopoSvg(result.model,result.layout,{...options,language})), parts=[];
      for(const node of document.getElementsByTagName("text")) parts.push(node.textContent);
      const visible=parts.join(" ").replace(/\s+/g," ").toLowerCase();
      const description=document.getElementsByTagName("desc")[0].textContent.toLowerCase();
      const height=language==="en" ? /(?:physical height:|height) unknown/ : /(?:altura fisica: desconocido|altura desconocida)/;
      const delta=language==="en" ? "vertical change: unknown" : "cambio vertical: desconocido";
      assert.deepEqual([height.test(visible),description.includes(delta),clippedPrimitives(document)],[true,true,[]]);
    });
  }
  test(`visible HTML preserves unknown physical height in ${language}`, /**
   * Verify external-image alternatives retain uncertainty independently of graphical style.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of localized physical-height wording.
   */ () => {
    const result=compileRoute(source), document=documentFor(renderRouteText(result.model,{language}));
    assert.equal(document.documentElement.textContent.toLowerCase().includes(language==="en" ? "physical height: unknown" : "altura fisica: desconocido"),true);
  });
  test(`advanced detail formatter retains unknown height in ${language}`, /**
   * Preserve the unknown height in the supported compact formatter as well as full diagrams.
   * @responsibility coordinator
   * @returns {void} Completes one assertion of the independently specified detail string.
   */ () => { assert.equal(formatElementDetail(compileRoute(source).model.elements[0],language),language==="en" ? "unknown / 20m / bolts" : "desconocido / 20m / parabolts"); });
}

test("shared diagram state retains unknown height warning and usable schematic output", /**
 * Exercise the framework-neutral adapter boundary without losing uncertainty or successful warnings.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of warning identity, visible wording and retained JSON.
 */ () => {
  const state=createDiagramState(source,{style:"soft-terrain"});
  assert.deepEqual([state.ok,state.diagnostics[0].code,state.svg.includes("height unknown"),JSON.parse(state.json).elements[0].attributes.height],[true,"VRL_GEOMETRY_HEIGHT_UNKNOWN",true,"unknown"]);
});

test("model revision 3 retains the previous inventory and unrelated contract revisions", /**
 * Pin the compatibility change to the normalized model while retaining the revision-2 evidence.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of the scoped version change.
 */ () => {
  const previous=JSON.parse(readFileSync(new URL('../docs/contracts/v2.json',import.meta.url),'utf8'));
  const current=JSON.parse(readFileSync(new URL('../docs/contracts/v3.json',import.meta.url),'utf8'));
  assert.deepEqual(current,{...previous,revision:3,contracts:{...previous.contracts,model:3}});
});
