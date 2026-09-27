/**
 * Format a stable test-case name containing replay seed and case identity.
 * @responsibility computation
 * @param {string} name - Reviewed mutation or exact test name used for diagnostic/probe matching.
 * @param {number} index - Zero-based position in the current ordered collection; defaults to 0.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
const caseName = (name, index = 0) => `${name}: seed=1448234018 case=${index}`;

/** Small, reviewed faults tied to observable contracts, not a mutation-score target. */
export const MUTATIONS = [
  { name: "finite-number guard", file: "packages/vrl-core/src/domain/numeric-policy.js",
    before: "return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;", after: "return true;",
    testFile: "tests/invariants-domain.test.js", testName: "nonfinite custom layout blocks export: NaN" },
  { name: "future explicit identifier reservation", file: "packages/vrl-core/src/domain/element-identifiers.js",
    before: "(element) => element.id", after: "(element) => undefined",
    testFile: "tests/invariants-domain.test.js", testName: caseName("unique identifiers") },
  { name: "climb direction", file: "packages/vrl-core/src/domain/traversal.js",
    before: 'direction: elementIndex === null ? null : element.type === "climb" ? "up" : "down",', after: 'direction: elementIndex === null ? null : "down",',
    testFile: "tests/invariants-domain.test.js", testName: caseName("technical event conservation", 2) },
  { name: "exit endpoint", file: "packages/vrl-core/src/layout/vertical-layout.js",
    before: "elevation = profile.exitMeters;", after: "elevation = profile.exitMeters + 1;",
    testFile: "tests/invariants-layout.test.js", testName: caseName("exact route endpoints and technical deltas") },
  { name: "annotation attachment", file: "packages/vrl-core/src/domain/traversal.js",
    before: "annotations.push({ elementIndex, pointIndex });", after: "void elementIndex;",
    testFile: "tests/invariants-layout.test.js", testName: caseName("supplied annotations survive model and layout") },
  { name: "XML ampersand encoding", file: "packages/vrl-render-svg/src/xml.js",
    before: '.replaceAll("&", "&amp;")', after: '.replaceAll("&", "&")',
    testFile: "tests/invariants-serialization.test.js", testName: caseName("strict XML preserves supplied title and notes") },
  { name: "right scene extent", file: "packages/vrl-render-svg/src/scene-bounds.js",
    before: "const right = Math.ceil(Math.max(minimumWidth, content.maxX + 12));", after: "const right = minimumWidth;",
    testFile: "tests/invariants-serialization.test.js", testName: caseName("scene bounds enclose content and panels") },
  { name: "rope stage preservation", file: "packages/vrl-render-svg/src/segment-scene.js",
    before: "stages: stagePlacements(geometry, element, pointAt),", after: "stages: [],",
    testFile: "tests/invariants-serialization.test.js", testName: caseName("scene contains all supplied stage and redirection facts") },
  { name: "duplicate field rejection", file: "packages/vrl-core/src/parser/attribute-parser.js",
    before: "if (firstLocation !== undefined) {", after: "if (false && firstLocation !== undefined) {",
    testFile: "tests/invariants-parsing.test.js", testName: caseName("malformed input blocks downstream") + " duplicate-field" },
  { name: "soft curve traversal direction", file: "packages/vrl-render-svg/src/soft-terrain-geometry.js",
    before: 'return scenePath`M ${geometry.dropX} ${geometry.startY} C ${first.x} ${first.y} ${second.x} ${second.y} ${geometry.bottomX} ${geometry.bottomY}`;',
    after: 'return scenePath`M ${geometry.bottomX} ${geometry.bottomY} C ${second.x} ${second.y} ${first.x} ${first.y} ${geometry.dropX} ${geometry.startY}`;',
    testFile: "tests/soft-terrain.test.js", testName: "emitted curve arrows follow descent, ascent and descent in source order" },
  { name: "soft curve stage preservation", file: "packages/vrl-render-svg/src/segment-scene.js",
    before: "stages: stagePlacements(geometry, element, pointAt),", after: 'stages: shape === "curve" ? [] : stagePlacements(geometry, element, pointAt),',
    testFile: "tests/soft-terrain.test.js", testName: "stages and redirections lie on the curve, preserving labels and counts" },
  { name: "soft style anchor quantity", file: "packages/vrl-render-svg/src/detail-content.js",
    before: "const count = anchorSummary(element, language);", after: 'const count = anchorSummary({ ...element, attributes: { ...element.attributes, anchor_count: "1" } }, language);',
    testFile: "tests/soft-terrain.test.js", testName: "soft terrain displays exact measurements, anchor types/counts, uncertainty and hazard ownership" },
  { name: "soft pool uncertainty", file: "packages/vrl-render-svg/src/soft-terrain-text.js",
    before: 'poolUnknown: "pool depth unknown"', after: 'poolUnknown: "pool depth 2m"',
    testFile: "tests/soft-terrain.test.js", testName: "soft terrain displays exact measurements, anchor types/counts, uncertainty and hazard ownership" },
  { name: "missing row continuation partner", file: "packages/vrl-render-svg/src/row-scene.js",
    before: 'const incoming = index === 0 ? null : rowContinuation(index - 1, "in", index, top, words);', after: 'const incoming = null;',
    testFile: "tests/row-layout.test.js", testName: "continuation pairs are unique, complete and point forward in logical order" },
  { name: "duplicate row continuation codes", file: "packages/vrl-render-svg/src/row-policy.js",
    before: 'let value = index + 1, code = "";', after: 'let value = 1, code = "";',
    testFile: "tests/row-layout.test.js", testName: "continuation pairs are unique, complete and point forward in logical order" },
  { name: "reversed row progression", file: "packages/vrl-render-svg/src/row-scene.js",
    before: 'for (const [index, section] of sections.entries())', after: 'for (const [index, section] of [...sections].reverse().entries())',
    testFile: "tests/row-layout.test.js", testName: "row width changes preserve the complete ordered fact inventory" },
  { name: "clipped row text", file: "packages/vrl-render-svg/src/row-serializer.js",
    before: '${svgAttribute(v.width)} ${svgAttribute(v.height)}"', after: '${svgAttribute(v.width - 200)} ${svgAttribute(v.height)}"',
    testFile: "tests/row-layout.test.js", testName: "row SVG retains complete bounds for long multilingual" },
  { name: "lost compressed distance", file: "packages/vrl-render-svg/src/row-facts.js",
    before: '${words.distance}: ${formatMeasurement(element.attributes.distance) || words.unknown}', after: '${words.distance}: ${words.unknown}',
    testFile: "tests/row-layout.test.js", testName: "walking compression retains the declared distance and explicit break" },
  { name: "pilot anchor mapping", file: "packages/vrl-render-svg/src/annotation-icons.js",
    before: 'return id === "bolt" || id === "tree" ? id : null;', after: 'return id === "bolt" || id === "tree" ? "tree" : null;',
    testFile: "tests/annotation-icons.test.js", testName: "pilot icons retain exact access, anchor and slippery ownership" },
  { name: "annotation icon gutter", file: "packages/vrl-render-svg/src/annotation-icons.js",
    before: "const x = placement.labelX - 32;", after: "const x = placement.labelX;",
    testFile: "tests/annotation-icons.test.js", testName: "annotation slots include full stroke clearance beside labels" },
  { name: "pilot hazard text", file: "packages/vrl-render-svg/src/node-scene.js",
    before: 'const kind = elementAttribute(element, "type");', after: 'const kind = undefined;',
    testFile: "tests/annotation-icons.test.js", testName: "pilot text preserves physical drops, declared ropes, full count, unknown pool and slippery note" }

];

/**
 * Replace exactly one reviewed source target with a deliberate fault; reject absent or ambiguous targets.
 * @responsibility computation
 * @param {string} source - Exact source text inspected or transformed without execution.
 * @param {Object} input2 - Input record destructured into the separately documented members below.
 * @param {string} input2.name - Reviewed mutation or exact test name used for diagnostic/probe matching.
 * @param {string} input2.before - Unique exact source substring identifying the mutation target.
 * @param {string} input2.after - Replacement source text for the deliberate fault.
 * @returns {string} The result returned by source.replace.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function applyMutation(source, { name, before, after }) {
  if (source.split(before).length !== 2) throw new Error(`Mutation target must occur exactly once: ${name}`);
  return source.replace(before, /**
   * Return the selected after binding unchanged.
   * @responsibility computation
   * @returns {unknown} The after value selected or validated above.
   */ () => after);
}

/**
 * Escape regular-expression metacharacters so a test name is matched literally.
 * @responsibility computation
 * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @returns {string} The result returned by text.replace.
 */
export function escapePattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Classify exactly one named TAP test as passed, assertion-detected or invalid; crashes and unrelated failures
 * never count as detection. A crash, timeout, missing test, or unrelated error does not demonstrate detection.
 * @responsibility computation
 * @param {Object} result - Captured process status, streams and optional error/signal.
 * @param {string} name - Reviewed mutation or exact test name used for diagnostic/probe matching.
 * @returns {string} The literal "invalid" for this branch. The literal "passed" for this branch. The literal "detected" for this branch.
 */

export function probeOutcome(result, name) {
  if (result.error || result.signal || !/^# tests 1$/m.test(result.stdout)) return "invalid";
  const test = escapePattern(name);
  if (result.status === 0 && new RegExp(`^ok \\d+ - ${test}$`, "m").test(result.stdout) && /^# pass 1$/m.test(result.stdout)) return "passed";
  if (result.status === 1 && new RegExp(`^not ok \\d+ - ${test}$`, "m").test(result.stdout)
    && /^# fail 1$/m.test(result.stdout) && /code: 'ERR_ASSERTION'/.test(result.stdout)) return "detected";
  return "invalid";
}
