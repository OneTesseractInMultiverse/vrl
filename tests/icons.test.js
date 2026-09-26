import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import * as icons from "@subvertic/vrl-icons";
import * as registry from "@subvertic/vrl-icons/registry";
import * as semantics from "@subvertic/vrl-icons/semantics";
import * as svg from "@subvertic/vrl-icons/svg";

/**
 * Read a repository fixture as UTF-8 text for a deterministic asset comparison.
 * @responsibility coordinator
 * @param {string} path - Repository-relative fixture path resolved against this test module.
 * @returns {string} File contents; filesystem errors propagate.
 */
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const manifest = icons.iconManifest;

test("catalog covers all nine poster categories", /**
 * Verify catalog covers all nine poster categories using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(manifest.categories.map(/**
   * Project or check id for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {string} input1.id - Exact canonical icon registry identifier.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ ({ id }) => id), ["vertical-progression", "aquatic-obstacles", "terrain-features", "anchors-equipment", "hazards-warnings", "environment-conditions", "route-information", "difficulty", "diagram-line-styles"]);
});

test("poster concepts and six VRL extensions have explicit provenance", /**
 * Verify poster concepts and six VRL extensions have explicit provenance using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual([icons.listIcons().filter(/**
   * Project or check icon.origin === "poster-taxonomy" for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ (icon) => icon.origin === "poster-taxonomy").length, icons.listIcons().filter(/**
   * Project or check icon.origin === "vrl-extension" for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ (icon) => icon.origin === "vrl-extension").length], [57, 6]);
});

test("canonical IDs are unique", /**
 * Verify canonical IDs are unique using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(new Set(icons.iconIds).size, 63);
});

test("catalog metadata uses stable IDs and known categories", /**
 * Verify catalog metadata uses stable IDs and known categories using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(icons.listIcons().filter(/**
   * Project or check !/^[a-z]+(?:-[a-z]+)*$/.test(icon.id) || !icon.label || !icon.description || !manifest.categories.some(({ id }) for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ (icon) => !/^[a-z]+(?:-[a-z]+)*$/.test(icon.id) || !icon.label || !icon.description || !manifest.categories.some(/**
   * Project or check id === icon.category for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {string} input1.id - Exact canonical icon registry identifier.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ ({ id }) => id === icon.category) || icon.asset !== `svg/${icon.id}.svg`), []);
});

test("geometry contains only finite SVG path data", /**
 * Verify geometry contains only finite SVG path data using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(icons.listIcons().filter(/**
   * Project or check icon.paths.length === 0 || icon.paths.some(({ d }) for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ (icon) => icon.paths.length === 0 || icon.paths.some(/**
   * Project or check !/^M[\d\s.,+\-MmLlHhVvCcSsQqTtAaZz]+$/.test(d) || /NaN|Infinity/.test(d) for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {string} input1.d - Original trusted SVG path data.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ ({ d }) => !/^M[\d\s.,+\-MmLlHhVvCcSsQqTtAaZz]+$/.test(d) || /NaN|Infinity/.test(d))), []);
});

test("each icon has distinct geometry or line semantics", /**
 * Verify each icon has distinct geometry or line semantics using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(new Set(icons.listIcons().map(/**
   * Project or check JSON.stringify({ paths, lineStyle }) for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {Object[]} input1.paths - Original path records in drawing order.
   * @param {Object} input1.lineStyle - Destructured input or member retained by the surrounding projection.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ ({ paths, lineStyle }) => JSON.stringify({ paths, lineStyle }))).size, 63);
});

test("manifest export exactly matches authoring data", /**
 * Verify manifest export exactly matches authoring data using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(JSON.parse(readFileSync(new URL(import.meta.resolve("@subvertic/vrl-icons/manifest.json")), "utf8")), manifest);
});

test("registry and subpath exports share immutable definitions", /**
 * Verify registry and subpath exports share immutable definitions using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(registry.getIcon("rappel"), icons.iconRegistry.rappel);
});

test("semantic subpath is available", /**
 * Verify semantic subpath is available using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(semantics.resolveElementIconId({ type: "rappel" }), "rappel");
});

test("SVG subpath is available", /**
 * Verify SVG subpath is available using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(svg.renderIcon("rappel"), icons.renderIcon("rappel"));
});

/**
 * Inspect every nested object in a trusted catalog to verify immutable shared definitions.
 * @responsibility computation
 * @param {unknown} value - Candidate or captured fixture value inspected by this operation.
 * @returns {boolean} Whether the record and all nested objects are frozen.
 */
function isDeeplyFrozen(value) {
  return typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(isDeeplyFrozen));
}

test("all public registry data is deeply immutable", /**
 * Verify all public registry data is deeply immutable using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal([manifest, icons.iconRegistry, icons.iconIds].every(isDeeplyFrozen), true);
});

test("modifying a list cannot mutate the registry", /**
 * Verify modifying a list cannot mutate the registry using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  const list = icons.listIcons();
  list.pop();
  assert.equal(icons.listIcons().length, 63);
});

test("category filtering selects only matching definitions", /**
 * Verify category filtering selects only matching definitions using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(icons.listIcons("diagram-line-styles").map(/**
   * Project or check id for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {string} input1.id - Exact canonical icon registry identifier.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ ({ id }) => id), ["rappel-line", "water-flow-line", "approach-trail-line", "escape-route-line"]);
});

test("unknown categories return an empty list", /**
 * Verify unknown categories return an empty list using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(icons.listIcons("unsupported"), []);
});

for (const id of ["missing", "toString", "__proto__", "constructor", "Rappel", undefined, null]) {
  test(`unknown or prototype icon ID ${String(id)} returns null`, /**
   * Verify unknown or prototype icon ID the current fixture returns null using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(icons.getIcon(id), null);
  });
}

test("line styles can be applied directly to route strokes", /**
 * Verify line styles can be applied directly to route strokes using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(icons.getLineStyle("rappel-line"), { strokeWidth: 2, strokeDasharray: "6 3", strokeLinecap: "butt" });
});

for (const id of ["pool", "unknown"]) {
  test(`line style lookup for ${id} returns null`, /**
   * Verify line style lookup for the current fixture returns null using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(icons.getLineStyle(id), null);
  });
}

test("line styles remain distinguishable in monochrome", /**
 * Verify line styles remain distinguishable in monochrome using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(new Set(icons.listIcons("diagram-line-styles").map(/**
   * Project or check lineStyle.strokeDasharray for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {Object} input1.lineStyle - Destructured input or member retained by the surrounding projection.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ ({ lineStyle }) => lineStyle.strokeDasharray)).size, 4);
});

test("illustrative difficulty uses five distinct levels", /**
 * Verify illustrative difficulty uses five distinct levels using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(icons.listIcons("difficulty").map(/**
   * Project or check illustrativeLevel for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {Object} input1.illustrativeLevel - Destructured input or member retained by the surrounding projection.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ ({ illustrativeLevel }) => illustrativeLevel), [1, 2, 3, 4, 5]);
});

for (const [type, expected] of Object.entries(manifest.semanticMappings.elements)) {
  test(`maps normalized ${type} elements without attributes`, /**
   * Verify maps normalized the current fixture elements without attributes using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(icons.resolveElementIconId({ type }), expected);
  });
}

for (const [type, subtypes] of Object.entries(manifest.semanticMappings.subtypes)) {
  for (const [value, expected] of Object.entries(subtypes)) {
    test(`maps ${type} subtype ${value}`, /**
     * Verify maps the current fixture subtype the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
     * @responsibility coordinator
     * @returns {void} Completes after its single correctness or failure assertion succeeds.
     */ () => {
      assert.equal(icons.resolveElementIconId({ type, attributes: { type: value } }), expected);
    });
  }
}

for (const [field, values] of Object.entries(manifest.semanticMappings.attributes)) {
  for (const [value, expected] of Object.entries(values)) {
    test(`maps explicit ${field} value ${value}`, /**
     * Verify maps explicit the current fixture value the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
     * @responsibility coordinator
     * @returns {void} Completes after its single correctness or failure assertion succeeds.
     */ () => {
      assert.equal(icons.resolveAttributeIconId(field, value), expected);
    });
  }
}

for (const element of [undefined, null, {}, { type: "jump" }, { type: "toString" }, { type: "__proto__" }]) {
  test(`unmapped semantic element ${JSON.stringify(element)} returns null`, /**
   * Verify unmapped semantic element the current fixture returns null using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(icons.resolveElementIconId(element), null);
  });
}

for (const value of [undefined, "future-hazard", "constructor", "toString", "__proto__"]) {
  test(`unknown hazard subtype ${String(value)} remains a generic warning`, /**
   * Verify unknown hazard subtype the current fixture remains a generic warning using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(icons.resolveElementIconId({ type: "hazard", attributes: { type: value } }), "warning");
  });
}

for (const [field, value] of [["difficulty", "V3 A2 III"], ["severity", "high"], ["anchor", "unknown"], ["anchor", "fixed"], ["anchor", "constructor"], ["constructor", "x"]]) {
  test(`does not infer an icon for ${field}=${value}`, /**
   * Verify does not infer an icon for the current fixture=the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(icons.resolveAttributeIconId(field, value), null);
  });
}

test("every semantic target names an existing icon", /**
 * Verify every semantic target names an existing icon using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  const mappings = manifest.semanticMappings;
  const ids = [...Object.values(mappings.elements), ...Object.values(mappings.subtypes).flatMap(Object.values), ...Object.values(mappings.attributes).flatMap(Object.values)];
  assert.deepEqual(ids.filter(/**
   * Project or check icons.getIcon(id) === null for the enclosing contract assertion.
   * @responsibility computation
   * @param {string} id - Exact canonical icon registry identifier.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ (id) => icons.getIcon(id) === null), []);
});

test("asset directory exactly matches the public registry", /**
 * Verify asset directory exactly matches the public registry using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(readdirSync(new URL("../packages/vrl-icons/svg/", import.meta.url)).sort(), icons.iconIds.map(/**
   * Project or check `${id}.svg` for the enclosing contract assertion.
   * @responsibility computation
   * @param {string} id - Exact canonical icon registry identifier.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ (id) => `${id}.svg`).sort());
});

for (const id of icons.iconIds) {
  test(`${id} standalone asset matches its programmatic export`, /**
   * Verify the current fixture standalone asset matches its programmatic export using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(readFileSync(new URL(import.meta.resolve(`@subvertic/vrl-icons/svg/${id}.svg`)), "utf8"), `${icons.renderIcon(id)}\n`);
  });
}

test("all SVG assets are portable vectors without references or embedded content", /**
 * Verify all SVG assets are portable vectors without references or embedded content using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.doesNotMatch(icons.iconIds.map(/**
   * Project or check icons.renderIcon(id) for the enclosing contract assertion.
   * @responsibility computation
   * @param {string} id - Exact canonical icon registry identifier.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ (id) => icons.renderIcon(id)).join(""), /<(?:image|script|style|foreignObject|text|use)\b|\b(?:href|id|on\w+)=|data:|url\(/i);
});

test("standalone icons have a shared canvas and stroke weight", /**
 * Verify standalone icons have a shared canvas and stroke weight using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(icons.iconIds.every(/**
   * Project or check /viewBox="0 0 32 32"/.test(icons.renderIcon(id)) && /stroke-width="2"/.test(icons.renderIcon(id)) for the enclosing contract assertion.
   * @responsibility computation
   * @param {string} id - Exact canonical icon registry identifier.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ (id) => /viewBox="0 0 32 32"/.test(icons.renderIcon(id)) && /stroke-width="2"/.test(icons.renderIcon(id))), true);
});

test("default SVG has a non-focusable accessible image name", /**
 * Verify default SVG has a non-focusable accessible image name using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.match(icons.renderIcon("rappel"), /focusable="false" role="img" aria-label="Rappel" aria-description="Rope descent past a vertical edge\."/);
});

test("default SVG includes native title and description", /**
 * Verify default SVG includes native title and description using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.match(icons.renderIcon("rappel"), /<title>Rappel<\/title><desc>Rope descent past a vertical edge\.<\/desc>/);
});

test("decorative icons are hidden from accessibility APIs", /**
 * Verify decorative icons are hidden from accessibility APIs using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.match(icons.renderIcon("rappel", { decorative: true }), /aria-hidden="true"/);
});

test("decorative icons omit competing accessible names", /**
 * Verify decorative icons omit competing accessible names using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.doesNotMatch(icons.renderIcon("rappel", { decorative: true }), /<title>|<desc>|role=|aria-label=|aria-description=/);
});

test("custom labels and colors cannot inject XML", /**
 * Verify custom labels and colors cannot inject XML using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.match(icons.renderIcon("pool", { title: '<&"\'>', description: '<&"\'>', color: 'red" onload="alert(1)' }), /color="red&quot; onload=&quot;alert\(1\)"[^>]+aria-label="&lt;&amp;&quot;&apos;&gt;" aria-description="&lt;&amp;&quot;&apos;&gt;"/);
});

test("size and color customize output while preserving geometry", /**
 * Verify size and color customize output while preserving geometry using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.match(icons.renderIcon("pool", { size: 48, color: "#123456" }), /width="48" height="48" color="#123456"/);
});

test("fractional positive sizes are supported", /**
 * Verify fractional positive sizes are supported using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.match(icons.renderIcon("pool", { size: 16.5 }), /width="16.5"/);
});

for (const size of [0, -1, Infinity, NaN, "32", null]) {
  test(`rejects invalid icon size ${String(size)}`, /**
   * Verify rejects invalid icon size the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.throws(/**
     * Invoke the deliberate failure scenario so the enclosing assertion observes the expected exception.
     * @responsibility coordinator
     * @returns {unknown} Result only if rejection regresses; intended exceptions propagate unchanged.
     */ () => icons.renderIcon("pool", { size }), TypeError);
  });
}

for (const options of [{ decorative: "false" }, { title: "" }, { title: "  " }, { title: null }, { description: 5 }]) {
  test(`rejects invalid accessibility options ${JSON.stringify(options)}`, /**
   * Verify rejects invalid accessibility options the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.throws(/**
     * Invoke the deliberate failure scenario so the enclosing assertion observes the expected exception.
     * @responsibility coordinator
     * @returns {unknown} Result only if rejection regresses; intended exceptions propagate unchanged.
     */ () => icons.renderIcon("pool", options), TypeError);
  });
}

test("rendering an unknown icon fails explicitly", /**
 * Verify rendering an unknown icon fails explicitly using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.throws(/**
   * Invoke the deliberate failure scenario so the enclosing assertion observes the expected exception.
   * @responsibility coordinator
   * @returns {unknown} Result only if rejection regresses; intended exceptions propagate unchanged.
   */ () => icons.renderIcon("missing"), /Unknown VRL icon: missing/);
});

test("rendering unknown geometry fails explicitly", /**
 * Verify rendering unknown geometry fails explicitly using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.throws(/**
   * Invoke the deliberate failure scenario so the enclosing assertion observes the expected exception.
   * @responsibility coordinator
   * @returns {unknown} Result only if rejection regresses; intended exceptions propagate unchanged.
   */ () => icons.renderIconGeometry("missing"), RangeError);
});

test("geometry-only export has no nested SVG or accessibility ownership", /**
 * Verify geometry-only export has no nested SVG or accessibility ownership using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.doesNotMatch(icons.renderIconGeometry("rappel"), /<svg|aria-|role=|<title|<desc/);
});
