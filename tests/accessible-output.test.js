import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute } from "@subvertic/vrl-core";
import { describeRoute, renderRouteText, renderTopoSvg, computeTopoScene } from "@subvertic/vrl-render-svg";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";
import { DESCRIPTION_EN, DESCRIPTION_ES } from "./helpers/description-fixtures.js";
const source = readFileSync(new URL("../examples/soft-terrain-canyon.vrl", import.meta.url), "utf8");
const compiled = compileRoute(source, {layout:{width:320}});
const rows = {flow:"rows",style:"soft-terrain",symbols:"annotations"};

for (const [language, expected] of [["en",DESCRIPTION_EN],["es",DESCRIPTION_ES]]) {
  test(`ordered route description preserves independent facts: ${language}`, /**
   * Compare the entire ordered alternative with an independently authored inventory, including uncertainty and association.
   * @responsibility coordinator
   * @returns {void} Completes after exact factual equivalence is established.
   */ () => { assert.equal(describeRoute(compiled.model,{language}).text,expected); });
  for (const options of [{}, {...rows}, {...rows,symbols:"minimal",theme:"dark"}, {...rows,monochrome:true}, {...rows,symbols:"icons",monochrome:true,theme:"dark"}]) {
    test(`SVG description is invariant across presentation ${language}/${JSON.stringify(options)}`, /**
     * Verify standalone SVG uses the same complete facts despite symbol, theme, flow and monochrome differences.
     * @responsibility coordinator
     * @returns {void} Completes after the independent text assertion succeeds.
     */ () => {
      const document = documentFor(renderTopoSvg(compiled.model,compiled.layout,{...options,language}));
      assert.equal(document.getElementsByTagName("desc")[0].textContent, expected);
    });
  }
}
for (const width of [320,736]) {
  test(`description stays complete and readable at ${width}`, /**
   * Retain exact facts and complete primitive bounds when row wrapping changes.
   * @responsibility coordinator
   * @returns {void} Completes after ordered text and independent bounds match.
   */ () => {
    const result = compileRoute(source,{layout:{width}});
    const document = documentFor(renderTopoSvg(result.model,result.layout,{...rows,monochrome:true,symbols:"minimal"}));
    assert.deepEqual([document.getElementsByTagName("desc")[0].textContent,clippedPrimitives(document)],[DESCRIPTION_EN,[]]);
  });
}
test("SVG accessible references resolve locally and never hide the image", /**
 * Verify actual title/description relationships and visibility independently of the namespace implementation.
 * @responsibility coordinator
 * @returns {void} Completes after each explicit relationship resolves to the expected text.
 */ () => {
  const actual=[];
  for(const idPrefix of ["left","right"]) {
    const document=documentFor(renderTopoSvg(compiled.model,compiled.layout,{...rows,idPrefix})), svg=document.documentElement;
    actual.push([svg.getAttribute("role"),svg.getAttribute("aria-hidden"),svg.getAttribute("aria-labelledby"),svg.getAttribute("aria-describedby"),document.getElementById(svg.getAttribute("aria-labelledby"))?.textContent ?? null,document.getElementById(svg.getAttribute("aria-describedby"))?.textContent ?? null]);
  }
  assert.deepEqual(actual,[["img",null,"left-title","left-description","Synthetic two-rappel canyon topo",DESCRIPTION_EN],["img",null,"right-title","right-description","Synthetic two-rappel canyon topo",DESCRIPTION_EN]]);
});
test("HTML alternative is visible, escaped and ordered with an independent namespace", /**
 * Verify a native HTML alternative can accompany an external image without duplicate SVG metadata IDs or hidden facts.
 * @responsibility coordinator
 * @returns {void} Completes after HTML text, identity and visibility are checked independently.
 */ () => {
  const document=documentFor(renderRouteText(compiled.model,{idPrefix:"external"})), root=document.documentElement, titles=[];
  for(const p of document.getElementsByTagName("p")) titles.push(p.textContent);
  assert.deepEqual([root.getAttribute("id"),root.getAttribute("aria-hidden"),root.getAttribute("hidden"),root.getAttribute("aria-label"),titles], ["external-text",null,null,"Synthetic two-rappel canyon topo",[DESCRIPTION_EN.split("\n")[0],"Start S1 (Entry)","Rappel R1","Pool P1","Walk W1","Rappel R2","Hazard H1","Exit E1 (Exit)"]]);
});
test("empty routes have an explicit empty alternative without invented entries", /**
 * Preserve absence of progression and state it once in adjacent HTML.
 * @responsibility coordinator
 * @returns {void} Completes after exact empty-list semantics are checked.
 */ () => {
  const route=compileRoute("route Empty").model, description=describeRoute(route), document=documentFor(renderRouteText(route));
  assert.deepEqual([description.entries,description.empty,document.getElementsByTagName("p").length,document.getElementsByTagName("li").length],[[],"No route elements.",2,0]);
});
test("unmeasured movement remains unknown and annotation-only routes remain unattached", /**
 * Compare missing height/distance and canonical annotation attachment against explicit expectations.
 * @responsibility coordinator
 * @returns {void} Completes after unknowns remain distinct from zero and physical progression.
 */ () => {
  const route=compileRoute('route Unknown\ndownclimb D\nwalk W').model;
  const detached=describeRoute(compileRoute('route Notes\nnote "Only note"').model);
  assert.deepEqual([describeRoute(route).entries[0].facts,describeRoute(route).entries[1].facts,detached.entries[0].facts],[['Movement: descent','Vertical change: unknown','Physical height: unknown'],['Walking distance: unknown'],['No physical boundary','Text: Only note']]);
});
test("metadata and unfamiliar extensions retain literal supplied values", /**
 * Retain all route fields without promoting an unfamiliar depth extension into a measured pool depth.
 * @responsibility coordinator
 * @returns {void} Completes after exact metadata and unknown extension labels are verified.
 */ () => {
  const route=compileRoute('route Fields\nmetadata entrance_elevation=100m exit_elevation=100m country=CR\npool P type=deep depth="2m?" strange="<&>"').model;
  assert.deepEqual([describeRoute(route).metadata,describeRoute(route).entries[0].facts],[['Additional field "country": CR','Entrance elevation: 100m','Exit elevation: 100m'],['Measured pool depth: unknown','Additional field "depth": 2m?','Additional field "strange": <&>','Type: deep']]);
});
test("HTML alternative preserves markup-bearing prose without creating elements", /**
 * Observe decoded authored text in an independent XML parser and require no injected script element.
 * @responsibility coordinator
 * @returns {void} Completes after literal text and safe encoding are verified.
 */ () => {
  const route=compileRoute('route "<&>"\nnote "<script>alert(1)</script> &amp;"').model;
  const document=documentFor(renderRouteText(route));
  assert.deepEqual([document.getElementsByTagName("script").length,document.getElementsByTagName("li")[2].textContent],[0,"Text: <script>alert(1)</script> &amp;"]);
});
for (const station of ["center","floor","tree","natural","unknown"]) {
  test(`non-lateral station ${station} remains explicit without an invented left tick`, /**
   * Preserve station categories as text and avoid converting every non-right value into a left-side drawing.
   * @responsibility coordinator
   * @returns {void} Completes after the declared station and absence of false lateral marks are verified.
   */ () => {
    const result=compileRoute(`route Station\nrappel R height=10m rope=20m station=${station}`,{layout:{width:320}});
    const row=computeTopoScene(result.model,result.layout,rows).rows[0], marks=[];let text="";
    for(const path of row.geometry.paths) if(path.kind==="station") marks.push(path);
    for(const line of row.details.lines) text+=line.text;
    assert.deepEqual([marks,text.includes(`Station: ${station}`)],[[],true]);
  });
}
test("row non-color cues retain contours, water, directed rope, stations, hazards and continuations", /**
 * Inspect essential shape/stroke/text cues so removing a water wave or direction mark cannot pass as an equivalent monochrome export.
 * @responsibility coordinator
 * @returns {void} Completes after independent cue counts, shape attributes and hazard text are verified.
 */ () => {
  const document=documentFor(renderTopoSvg(compiled.model,compiled.layout,{...rows,monochrome:true,symbols:"minimal"}));
  const counts={};let dashed=0,arrows=0;
  for(const path of document.getElementsByTagName("path")) {
    const name=path.getAttribute("class");counts[name]=(counts[name]??0)+1;
    if(name==="vrl-row-contour" && path.getAttribute("stroke-dasharray")==="4 3") dashed++;
    if(path.hasAttribute("marker-end")) arrows++;
  }
  assert.deepEqual([counts["vrl-row-water"],counts["vrl-row-pool"],counts["vrl-row-station"],counts["vrl-row-distance-break"],dashed,arrows,document.documentElement.textContent.includes("Slippery landing")],[1,1,2,1,2,3,true]);
});
for (const options of [{monochrome:null},{monochrome:"true"},{monochrome:true},{...rows,flow:"continuous",monochrome:true},{...rows,style:"classic",symbols:"classic",monochrome:true},{...rows,monochrome:true,themeTokens:{text:"red"}}]) {
  test(`invalid monochrome configuration fails: ${JSON.stringify(options)}`, /**
   * Reject unsupported policy or override combinations instead of silently producing colored or unreadable output.
   * @responsibility coordinator
   * @returns {void} Completes after the documented configuration failure.
   */ () => { assert.throws(/**
    * Submit the deliberately unsupported render configuration through the public facade.
    * @responsibility coordinator
    * @returns {string} Returns only if rejection regresses.
    */ () => renderTopoSvg(compiled.model,compiled.layout,options),TypeError); });
}
for(const theme of ["light","dark"]) for(const monochrome of [false,true]) {
  test(`supported row contrast and readable strokes: ${theme}/${monochrome}`, /**
   * Independently calculate sRGB contrast from actual emitted paint values and inspect fixed text/stroke sizes.
   * @responsibility coordinator
   * @returns {void} Completes after text meets 4.5:1 and essential strokes meet 3:1 against the supported canvas.
   */ () => {
    const document=documentFor(renderTopoSvg(compiled.model,compiled.layout,{...rows,theme,monochrome}));
    const paper=document.getElementsByTagName("rect")[0].getAttribute("fill"), failures=[];
    for(const text of document.getElementsByTagName("text")) if(contrast(text.getAttribute("fill"),paper)<4.5 || Number(text.getAttribute("font-size"))<14) failures.push("text");
    for(const path of document.getElementsByTagName("path")) if(path.getAttribute("class")?.startsWith("vrl-row-") && path.getAttribute("class")!=="vrl-row-wash") {
      if(contrast(path.getAttribute("stroke"),paper)<3 || Number(path.getAttribute("stroke-width"))<2) failures.push("stroke");
    }
    assert.deepEqual(failures,[]);
  });
}
/**
 * Compute the reference sRGB relative luminance for a six-digit hexadecimal fixture paint.
 * @responsibility computation
 * @param {string} hex - Actual resolved SVG paint in #rrggbb form.
 * @returns {number} Relative luminance using the WCAG sRGB transform.
 */
function luminance(hex) {
  const weights=[0.2126,0.7152,0.0722];let result=0;
  for(let i=0;i<3;i++) {const channel=parseInt(hex.slice(1+i*2,3+i*2),16)/255;result+=weights[i]*(channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4);}
  return result;
}
/**
 * Calculate independent foreground/background contrast without production theme or geometry helpers.
 * @responsibility computation
 * @param {string} ink - Foreground hexadecimal paint.
 * @param {string} paper - Background hexadecimal paint.
 * @returns {number} WCAG luminance contrast ratio, at least one for valid fixture paints.
 */
function contrast(ink,paper) {const a=luminance(ink),b=luminance(paper);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);}

test("description fallback is deterministic and never mutates route records", /**
 * Exercise the public compatible-view fallback while preserving caller records and exact source order.
 * @responsibility coordinator
 * @returns {void} Completes after fallback and stored traversal descriptions agree without mutation.
 */ () => {
  const route=structuredClone(compiled.model), before=structuredClone(route);delete route.traversal;
  const first=describeRoute(route);describeRoute(route,{language:"es"});
  assert.deepEqual([first,describeRoute(route),route.elements],[describeRoute(before),first,before.elements]);
});
test("description preserves typed stages, direction, inclination and non-lateral redirections", /**
 * Independently specify complete technical text for a staged ascent with center and unknown sides.
 * @responsibility coordinator
 * @returns {void} Completes after typed measurements and all side values remain explicit.
 */ () => {
  const route=compileRoute('route Ascent\nclimb C height=10m inclination=80% stages=4m+6m redirections=3m:center,8m:unknown station=center').model;
  assert.deepEqual(describeRoute(route,{language:"es"}).entries[0].facts,['Movimiento: ascenso','Cambio vertical: 8m','Altura fisica: 10m','Inclinacion (100% = vertical): 80%','Desviadores: 3m centro; 8m desconocido','Tramos de cuerda: 4m; 6m','Reunion: centro']);
});
test("compatible extension records remain literal serialized data", /**
 * Retain unfamiliar caller-view records without inventing supported field semantics.
 * @responsibility coordinator
 * @returns {void} Completes after the compatible view's literal value remains present.
 */ () => {
  const route={name:"Legacy",extensions:{survey:{certainty:"?"}},elements:[]};
  assert.deepEqual(describeRoute(route).metadata,['Additional field "survey": {"certainty":"?"}']);
});
for(const options of [null,[],42]) {
  test(`invalid description options fail: ${JSON.stringify(options)}`, /**
   * Validate options at the text boundary using the same plain-record policy as other public APIs.
   * @responsibility coordinator
   * @returns {void} Completes after the explicit boundary failure.
   */ () => {assert.throws(/**
    * Submit a malformed description option value.
    * @responsibility coordinator
    * @returns {Object} Returns only if validation regresses.
    */ () => describeRoute(compiled.model,options),TypeError);});
}
test("long authored notes are retained without truncation in both text representations", /**
 * Verify the accessible alternative retains a long Unicode note in plain text and decoded HTML.
 * @responsibility coordinator
 * @returns {void} Completes after exact long-text fidelity is established.
 */ () => {
  const note="岩 & < > ".repeat(1000), route=compileRoute(`route Long\nnote "${note}"`).model;
  const value=describeRoute(route), document=documentFor(renderRouteText(route));
  assert.deepEqual([value.entries[0].facts.at(-1),document.getElementsByTagName("li")[2].textContent],[`Text: ${note}`,`Text: ${note}`]);
});
test("empty monochrome overrides retain the exact default achromatic SVG", /**
 * Permit an explicitly empty theme record without changing the supported monochrome palette.
 * @responsibility coordinator
 * @returns {void} Completes after omitted and empty override configurations agree.
 */ () => {assert.equal(renderTopoSvg(compiled.model,compiled.layout,{...rows,monochrome:true,themeTokens:{}}),renderTopoSvg(compiled.model,compiled.layout,{...rows,monochrome:true}));});

test("compatible metadata prose remains explicit when the typed metadata bag is absent", /**
 * Preserve supported prose from a compatible caller view without requiring an empty typed metadata record.
 * @responsibility coordinator
 * @returns {void} Completes after authored text and unfamiliar measured extensions retain their distinct labels.
 */ () => {
  const route={name:"Legacy",extensions:{note:"Survey pending",height:"10m?"},elements:[]};
  assert.deepEqual(describeRoute(route).metadata,['Additional field "height": 10m?','Note: Survey pending']);
});
test("adjacent HTML preserves declared metadata and literal extensions", /**
 * Require the visible alternative to retain supplied route metadata even when there are no route elements.
 * @responsibility coordinator
 * @returns {void} Completes after native list text retains the exact supplied facts.
 */ () => {
  const route=compileRoute('route Metadata\nmetadata total_distance=250m country="CR & nearby"').model;
  const document=documentFor(renderRouteText(route)), facts=[];
  for(const item of document.getElementsByTagName("li")) facts.push(item.textContent);
  assert.deepEqual(facts,['Additional field "country": CR & nearby','Declared total distance: 250m']);
});
