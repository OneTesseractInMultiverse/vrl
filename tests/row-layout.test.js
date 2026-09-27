import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { wrapRowText, placeRowText } from "../packages/vrl-render-svg/src/row-text.js";
import { continuationCode, validateRowExtent } from "../packages/vrl-render-svg/src/row-policy.js";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";
const source = readFileSync(new URL("../examples/soft-terrain-canyon.vrl", import.meta.url), "utf8");
const defaults = { flow: "rows", style: "soft-terrain", symbols: "annotations" };
/**
 * Compile a requested fixture and prepare row geometry through the public API, propagating genuine failures.
 * @responsibility coordinator
 * @param {string} text - Complete DSL fixture; defaults to the shared fictional canyon.
 * @param {number} width - Exact requested drawing width; defaults to 320.
 * @param {Object} options - Explicit per-test renderer overrides; defaults to empty.
 * @returns {Object} Prepared scene with canonical records and fixed-width presentation.
 */
function scene(text = source, width = 320, options = {}) {
  const result = compileRoute(text, { layout: { width } });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return computeTopoScene(result.model, result.layout, { ...defaults, ...options });
}
/**
 * Read the independently observable text fragments in source order, ignoring wrapping positions.
 * @responsibility computation
 * @param {Object} value - Prepared row scene.
 * @returns {string[]} Exact visible text for each section, including supplied facts.
 */
function textInventory(value) {
  const result = [];
  for (const row of value.rows) {
    let text = "";
    for (const line of row.details.lines) text += line.text;
    result.push(text);
  }
  return result;
}
for (const width of [320, 736, 2048]) for (const language of ["en", "es"]) {
  test(`rows preserve exact width, ownership and readable text at ${width}/${language}`, /**
   * Compare explicit source-index ownership, fixed width and the chosen minimum text/icon sizes.
   * @responsibility coordinator
   * @returns {void} Completes after its single contract assertion succeeds.
   */ () => {
    const value = scene(source, width, { language });
    const indexes = [], fonts = [], sizes = [];
    for (const row of value.rows) {
      indexes.push(row.elementIndexes);
      for (const line of row.details.lines) fonts.push(line.fontSize);
      for (const icon of row.details.icons) sizes.push(icon.size);
    }
    assert.deepEqual([value.viewBox.width, indexes, Math.min(...fonts), [...new Set(sizes)]], [width, [[0], [1], [2], [3], [4, 5], [6]], 14, [24]]);
  });
}
test("row width changes preserve the complete ordered fact inventory", /**
 * Verify independently expected measurements and ordered ownership, as well as equality across widths.
 * @responsibility coordinator
 * @returns {void} Completes after the single expected-facts assertion succeeds.
 */ () => {
  const narrow = textInventory(scene()), wide = textInventory(scene(source, 736));
  assert.deepEqual([narrow, wide], [
    ["Start Entry [S1]", "Rappel R1Physical height: 18mdeclared rope: 40mbolts / 2 anchorsStation: rightVertical change: -18m", "Pool P1pool depth unknown", "Walk W1120mWalking distance compressed: 120m", "Rappel R2Physical height: 12mdeclared rope: 30mtree / anchor count unknownHazard H1: slipperySlippery landingVertical change: -12m", "Exit Exit [E1]"],
    ["Start Entry [S1]", "Rappel R1Physical height: 18mdeclared rope: 40mbolts / 2 anchorsStation: rightVertical change: -18m", "Pool P1pool depth unknown", "Walk W1120mWalking distance compressed: 120m", "Rappel R2Physical height: 12mdeclared rope: 30mtree / anchor count unknownHazard H1: slipperySlippery landingVertical change: -12m", "Exit Exit [E1]"]
  ]);
});
test("continuation pairs are unique, complete and point forward in logical order", /**
 * Independently specify every outgoing/incoming pairing in the fictional route.
 * @responsibility coordinator
 * @returns {void} Completes after exact logical pairing is established.
 */ () => {
  const pairs = [];
  for (const row of scene().rows) for (const marker of [row.incoming, row.outgoing]) if (marker !== null) pairs.push([row.index + 1, marker.role, marker.code, marker.sectionNumber]);
  assert.deepEqual(pairs, [[1,"out","A",2],[2,"in","A",1],[2,"out","B",3],[3,"in","B",2],[3,"out","C",4],[4,"in","C",3],[4,"out","D",5],[5,"in","D",4],[5,"out","E",6],[6,"in","E",5]]);
});
for (const [index, code] of [[0,"A"],[25,"Z"],[26,"AA"],[255,"IV"]]) {
  test(`continuation ${index} has stable code ${code}`, /**
   * Check boundary encoding at alphabet rollover and the resource limit.
   * @responsibility coordinator
   * @returns {void} Completes after the independent code assertion.
   */ () => { assert.equal(continuationCode(index), code); });
}
for (const text of ["", "abcdef", "hello world again", "árbol 岩 🧗🏽‍♀️texto", "first\nsecond\n"]) {
  test(`row wrapping preserves every character: ${JSON.stringify(text)}`, /**
   * Reconstruct the original text exactly, including whitespace, Unicode and explicit newlines.
   * @responsibility coordinator
   * @returns {void} Completes after lossless reconstruction is verified.
   */ () => { assert.equal(wrapRowText(text, 100, 14).join(""), text); });
}
for (const [text, expected] of [["abcdef",["abc","def"]],["abcde",["abc","de"]],["ab cd ef",["ab ","cd ","ef"]]]) {
  test(`wrapping observes exact character boundary for ${text}`, /**
   * Use a three-character conservative envelope to verify wrapping exactly at and beyond its threshold.
   * @responsibility coordinator
   * @returns {void} Completes after exact fragment comparison.
   */ () => { assert.deepEqual(wrapRowText(text, 31.5, 14), expected); });
}
test("impossible text width fails rather than splitting a surrogate pair", /**
 * Reject a width smaller than one complete supplementary character at the chosen font.
 * @responsibility coordinator
 * @returns {void} Completes after the specified failure is observed.
 */ () => { assert.throws(/**
 * Exercise the unsupported single-character constraint.
 * @responsibility coordinator
 * @returns {string[]} Returns only if the guard regresses; the intended RangeError propagates.
 */ () => wrapRowText("🧗", 20, 14), RangeError); });
test("an empty text block has neutral bounds", /**
 * Preserve the shared bounds owner's empty-collection contract without inventing visible content.
 * @responsibility coordinator
 * @returns {void} Completes after the independently specified empty block is checked.
 */ () => { assert.deepEqual(placeRowText([], 24, 0, 200, false), { lines: [], icons: [], bounds: { minX:0,minY:0,maxX:0,maxY:0 }, bottom:28 }); });
for (const [name, body] of [["empty",""],["annotations only",'note N1 text="Only note"\nhazard H1 type=slippery'],["leading annotations",'note N1 text="Before entry"\nstart\nexit'],["minimal","start\nexit"],["unmeasured",'downclimb D1\nwalk W1'],["dry pool",'pool P1 type=dry'],["staged",'rappel R1 height=20m rope=40m stages=8m+12m redirection=10m:left station=left\nclimb C1 height=5m station=right\nexit'],["long multilingual",`start "${"岩árbol🧗".repeat(20)}"\nexit`]]) {
  test(`row SVG retains complete bounds for ${name}`, /**
   * Inspect emitted primitives independently of scene bounds across awkward route structures.
   * @responsibility coordinator
   * @returns {void} Completes after every emitted primitive fits the declared canvas.
   */ () => {
    const state = createDiagramState(`route Test\n${body}`, { ...defaults, symbols: "minimal", layout: { width:320 } });
    if (!state.ok) throw new Error(state.diagnosticsText);
    assert.deepEqual(clippedPrimitives(documentFor(state.svg)), []);
  });
}
test("minimal mode preserves all coordinates and facts while hiding pictograms", /**
 * Compare full scenes after removing only paint visibility, preserving both legend and detail reservations.
 * @responsibility coordinator
 * @returns {void} Completes after the structural equivalence assertion.
 */ () => {
  const visible = scene(), minimal = scene(source, 320, { symbols: "minimal" });
  visible.legend.icons = [];
  for (const row of visible.rows) row.details.icons = [];
  assert.deepEqual(visible, minimal);
});
test("walking compression retains the declared distance and explicit break", /**
 * Verify the complete visible distance record and the emitted compression primitive for its owner.
 * @responsibility coordinator
 * @returns {void} Completes after the independently expected walk representation is matched.
 */ () => {
  const value = scene(), walk = value.rows[3];
  assert.deepEqual([walk.geometry.paths[0].kind, textInventory(value)[3]], ["distance-break", "Walk W1120mWalking distance compressed: 120m"]);
});
test("row rendering preserves physical points, deltas and all canonical segment owners", /**
 * Compare against the core output and ensure rendering never mutates either input.
 * @responsibility coordinator
 * @returns {void} Completes after canonical identity and immutability are established.
 */ () => {
  const result = compileRoute(source), before = JSON.stringify(result);
  const value = computeTopoScene(result.model, result.layout, defaults), segments = [];
  for (const row of value.rows) segments.push(...row.segments);
  assert.deepEqual([value.physicalPoints, segments, JSON.stringify(result)], [result.layout.points, result.layout.segments, before]);
});
test("row rendering is deterministic across intervening widths and symbol modes", /**
 * Repeat the same public render after unrelated configurations to expose shared mutable presentation state.
 * @responsibility coordinator
 * @returns {void} Completes after byte-identical output is established.
 */ () => {
  const result = compileRoute(source, { layout: { width:320 } });
  const first = renderTopoSvg(result.model, result.layout, defaults);
  scene(source, 736, { symbols: "icons", language: "es", legend:false });
  assert.equal(renderTopoSvg(result.model, result.layout, defaults), first);
});
for (const width of [319, 320.5, 2049]) {
  test(`unsupported row width ${width} fails explicitly`, /**
   * Reject a finite but unsupported row width instead of shrinking text or clipping.
   * @responsibility coordinator
   * @returns {void} Completes after the specified constraint failure.
   */ () => { assert.throws(/**
   * Request the unsupported width through the public scene API.
   * @responsibility coordinator
   * @returns {Object} Returns only if rejection regresses.
   */ () => scene(source, width), /width must be an integer/); });
}
for (const width of [NaN, Infinity, -1, 0]) {
  test(`invalid layout width ${width} is rejected at the boundary`, /**
   * Supply invalid raw geometry to verify ordinary layout validation precedes row rendering.
   * @responsibility coordinator
   * @returns {void} Completes after numeric/layout failure is observed.
   */ () => {
    const result=compileRoute(source);
    assert.throws(/**
     * Call the public scene facade with the deliberately invalid dimension.
     * @responsibility coordinator
     * @returns {Object} Returns only if validation regresses.
     */ () => computeTopoScene(result.model,{...result.layout,width},defaults));
  });
}
for (const options of [{flow:"bad"},{flow:null},{flow:"rows",style:"classic"},{flow:"rows",style:undefined}]) {
  test(`invalid flow configuration fails: ${JSON.stringify(options)}`, /**
   * Reject unknown or incompatible row options without silently selecting continuous rendering.
   * @responsibility coordinator
   * @returns {void} Completes after the public configuration failure.
   */ () => { assert.throws(/**
    * Submit deliberately invalid renderer options.
    * @responsibility coordinator
    * @returns {Object} Returns only if configuration rejection regresses.
    */ () => scene(source,320,{...options,symbols:"classic"}), {name:"TypeError",message:options.flow === "rows" ? "Row layout requires the soft-terrain style." : "Renderer flow must be continuous or rows."}); });
}
for (const [width,height] of [[321,100],[320,50001]]) {
  test(`fitted row overflow ${width}/${height} fails explicitly`, /**
   * Exercise the final complete-bounds guard independently from normal valid placement.
   * @responsibility coordinator
   * @returns {void} Completes after overflow raises the documented constraint failure.
   */ () => { assert.throws(/**
    * Submit independently specified escaped bounds.
    * @responsibility coordinator
    * @returns {void} Returns only if the final extent guard regresses.
    */ () => validateRowExtent({width,height},320), RangeError); });
}
for (const [name, value] of [["missing points",undefined],["missing boundary",[]]]) {
  test(`incomplete canonical layout fails: ${name}`, /**
   * Reject caller-built geometry that cannot prove the complete route boundary inventory.
   * @responsibility coordinator
   * @returns {void} Completes after the canonical-layout failure assertion.
   */ () => {
    const result=compileRoute(source);
    assert.throws(/**
     * Remove required physical boundaries from an otherwise valid layout.
     * @responsibility coordinator
     * @returns {Object} Returns only if completeness validation regresses.
     */ () => computeTopoScene(result.model,{...result.layout,points:value},defaults), /complete canonical layout/);
  });
}
for (const field of ["from","to","elementIndex","direction","verticalDeltaMeters"]) {
  test(`contradictory canonical ${field} fails`, /**
   * Reject ownership and direction contradictions before drawing a misleading continuation diagram.
   * @responsibility coordinator
   * @returns {void} Completes after the documented mismatch assertion.
   */ () => {
    const result=compileRoute(source), layout=structuredClone(result.layout);
    layout.segments[0][field]="wrong";
    assert.throws(/**
     * Submit the contradictory canonical field through the public renderer boundary.
     * @responsibility coordinator
     * @returns {Object} Returns only if correspondence validation regresses.
     */ () => computeTopoScene(result.model,layout,defaults), /ownership must match/);
  });
}
for (const text of [`route Limits\n${'note text="a"\n'.repeat(257)}`, `route Limits\n${`note text="${"x".repeat(15000)}"\n`.repeat(7)}`]) {
  test(`resource-exceeding row input fails at ${text.length} source characters`, /**
   * Verify section/text resource budgets reject whole documents without silently dropping content.
   * @responsibility coordinator
   * @returns {void} Completes after explicit row resource failure.
   */ () => { assert.throws(/**
    * Prepare a deliberately excessive but syntactically valid route.
    * @responsibility coordinator
    * @returns {Object} Returns only if resource rejection regresses.
    */ () => scene(text), /Row layout supports/); });
}
test("compatible routes without cached traversal use the public core traversal owner", /**
 * Verify the supported domain derivation fallback preserves the exact canonical sections.
 * @responsibility coordinator
 * @returns {void} Completes after fallback and stored traversal agree.
 */ () => {
  const result=compileRoute(source), route={...result.model}; delete route.traversal;
  assert.deepEqual(computeTopoScene(route,result.layout,defaults).traversal,result.model.traversal);
});
test("staged ascent and descent stay intact with physical elevations and station associations", /**
 * Independently specify canonical owners, stage counts, direction and elevation facts in a measured route.
 * @responsibility coordinator
 * @returns {void} Completes after complete technical association is verified.
 */ () => {
  const text='route Measured\nmetadata entrance_elevation=100m exit_elevation=85m\nstart\nrappel R1 height=20m rope=40m stages=8m+12m redirection=10m:left station=left\nclimb C1 height=5m station=right\nexit';
  const value=scene(text), actual=[];
  for (const row of value.rows) if (row.technical!==null) actual.push([row.technical.segment.element.id,row.technical.segment.direction,row.technical.stages.length,row.technical.redirections.length]);
  assert.deepEqual([actual,textInventory(value).join("|").includes("Elevation: 85m")],[[["R1","down",2,1],["C1","up",0,0]],true]);
});
test("an unmeasured technical section retains its unknown physical delta", /**
 * Preserve absence of measurements as explicit uncertainty in the row's text and canonical record.
 * @responsibility coordinator
 * @returns {void} Completes after exact unknown-height wording is verified.
 */ () => { assert.deepEqual(textInventory(scene('route Unknown\ndownclimb D1')), ["Downclimb D1Physical height: unknownVertical change: unknown"]); });
test("default symbols and legend suppression serialize without inventing pictograms", /**
 * Exercise the opt-in row mode without selecting icons or a legend, preserving its explicit flow marker.
 * @responsibility coordinator
 * @returns {void} Completes after the public serialized behavior is checked.
 */ () => {
  const state=createDiagramState(source,{flow:"rows",style:"soft-terrain",legend:false,layout:{width:320}});
  assert.deepEqual([state.ok,state.svg.includes('data-vrl-flow="rows"'),state.svg.includes("data-vrl-icon="),state.svg.includes("Reading the rows")],[true,true,false,false]);
});
test("many rows retain unique continuation pairs after alphabet rollover", /**
 * Inspect complete outgoing and incoming sequences on a route longer than the first alphabet cycle.
 * @responsibility coordinator
 * @returns {void} Completes after codes and pairing counts are verified independently.
 */ () => {
  const value=scene(`route Many\n${"walk distance=1m\n".repeat(28)}`), codes=[];
  for(const row of value.rows) if(row.outgoing!==null) codes.push(row.outgoing.code);
  assert.deepEqual([value.rows.length,new Set(codes).size,codes.at(-1),value.rows.at(-1).incoming.code],[28,27,"AA","AA"]);
});
test("explicit continuous flow preserves the existing default SVG bytes", /**
 * Guard the compatibility path so opting into the new flow enum cannot alter existing exports.
 * @responsibility coordinator
 * @returns {void} Completes after default and explicit continuous serialization match exactly.
 */ () => {
  const result=compileRoute(source);
  assert.equal(renderTopoSvg(result.model,result.layout,{flow:"continuous"}),renderTopoSvg(result.model,result.layout));
});
test("a complete but excessively tall row document fails before SVG export", /**
 * Grow an otherwise valid route title beyond the supported fitted height without exceeding the input text budget.
 * @responsibility coordinator
 * @returns {void} Completes after the actual public render rejects excessive total height.
 */ () => {
  const result=compileRoute('route Tall\nstart', {layout:{width:320}});
  const model={...result.model,name:"X".repeat(50000)};
  assert.throws(/**
   * Render a large but valid text value to exercise complete-scene resource enforcement.
   * @responsibility coordinator
   * @returns {string} Returns only if the height limit regresses.
   */ () => renderTopoSvg(model,result.layout,defaults), /50000-unit height/);
});
for (const [name, field, value] of [["missing index","elementIndex",undefined],["duplicate index","elementIndex",1],["wrong identity","id","wrong"],["wrong kind","type","walk"]]) {
  test(`row node inventory rejects ${name}`, /**
   * Reject missing, duplicate or contradictory source ownership before using physical node metadata.
   * @responsibility coordinator
   * @returns {void} Completes after the exact node ownership failure.
   */ () => {
    const result=compileRoute(source), layout=structuredClone(result.layout);
    layout.nodes[0]={...layout.nodes[0]};
    if(name==="duplicate index") layout.nodes[1]={...layout.nodes[0]};
    else if(field==="elementIndex") layout.nodes[0][field]=value;
    else layout.nodes[0].element[field]=value;
    assert.throws(/**
     * Submit the malformed source-node association.
     * @responsibility coordinator
     * @returns {Object} Returns only if ownership rejection regresses.
     */ () => computeTopoScene(result.model,layout,defaults), /nodes must identify/);
  });
}
test("contradictory physical point ownership is rejected", /**
 * Prevent a caller-built boundary from silently changing the canonical endpoint identity.
 * @responsibility coordinator
 * @returns {void} Completes after the point ownership guard rejects the mismatch.
 */ () => {
  const result=compileRoute(source),layout=structuredClone(result.layout);
  layout.points[0].elementIndex=99;
  assert.throws(/**
   * Submit a point identity unrelated to the core traversal.
   * @responsibility coordinator
   * @returns {Object} Returns only if point validation regresses.
   */ () => computeTopoScene(result.model,layout,defaults), /point ownership/);
});

for (const [language, labels] of [["en", ["Station: left", "Station: right"]], ["es", ["Reunion: izquierda", "Reunion: derecha"]]]) {
  test(`row stations retain localized sides and owning endpoints: ${language}`, /**
   * Verify left descent and right ascent marks stay beside their owning station and retain localized facts.
   * @responsibility coordinator
   * @returns {void} Completes after exact side offsets and station labels match the declared route.
   */ () => {
    const value = scene('route Stations\nrappel R1 height=10m rope=20m station=left\nclimb C1 height=5m station=right', 320, { language });
    const sides = [], texts = [];
    for (const row of value.rows) {
      const anchorX = row.technical.segment.direction === "up" ? row.technical.geometry.bottomX : row.technical.geometry.dropX;
      const offsets = [];
      for (const path of row.geometry.paths) if (path.kind === "station") offsets.push(Number(path.path.split(" ")[1]) - anchorX);
      sides.push(offsets);
      for (const line of row.details.lines) if (labels.includes(line.text)) texts.push(line.text);
    }
    assert.deepEqual([sides, texts], [[[-8, -12], [8, 12]], labels]);
  });
}
