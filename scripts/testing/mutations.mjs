const caseName = (name, index = 0) => `${name}: seed=1448234018 case=${index}`;

/** Small, reviewed faults tied to observable contracts, not a mutation-score target. */
export const MUTATIONS = [
  { name: "finite-number guard", file: "packages/vrl-core/src/domain/numeric-policy.js",
    before: "return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;", after: "return true;",
    testFile: "tests/invariants-domain.test.js", testName: "nonfinite custom layout blocks export: NaN" },
  { name: "future explicit identifier reservation", file: "packages/vrl-core/src/domain/element-identifiers.js",
    before: "const reservedIds = new Set(elements.map((element) => element.id));", after: "const reservedIds = new Set();",
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
    before: "stages: stagePlacements(geometry, element),", after: "stages: [],",
    testFile: "tests/invariants-serialization.test.js", testName: caseName("scene contains all supplied stage and redirection facts") },
  { name: "duplicate field rejection", file: "packages/vrl-core/src/parser/attribute-parser.js",
    before: "if (firstLocation !== undefined) {", after: "if (false && firstLocation !== undefined) {",
    testFile: "tests/invariants-parsing.test.js", testName: caseName("malformed input blocks downstream") + " duplicate-field" }
];

export function applyMutation(source, { name, before, after }) {
  if (source.split(before).length !== 2) throw new Error(`Mutation target must occur exactly once: ${name}`);
  return source.replace(before, () => after);
}

export function escapePattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A crash, timeout, missing test, or unrelated error does not demonstrate detection. */
export function probeOutcome(result, name) {
  if (result.error || result.signal || !/^# tests 1$/m.test(result.stdout)) return "invalid";
  const test = escapePattern(name);
  if (result.status === 0 && new RegExp(`^ok \\d+ - ${test}$`, "m").test(result.stdout) && /^# pass 1$/m.test(result.stdout)) return "passed";
  if (result.status === 1 && new RegExp(`^not ok \\d+ - ${test}$`, "m").test(result.stdout)
    && /^# fail 1$/m.test(result.stdout) && /code: 'ERR_ASSERTION'/.test(result.stdout)) return "detected";
  return "invalid";
}
