import { posix } from "node:path";

const COMPUTATIONS = new Set([
  "row-policy.js", "row-text.js", "row-facts.js", "row-geometry.js", "row-scene.js", "annotation-icons.js", "anchor-presentation.js", "badge-style.js", "detail-content.js", "detail-layout.js",
  "element-formatters.js", "locale.js", "node-scene.js", "panel-scene.js", "presentation.js",
  "render-options.js", "route-data.js", "scene-bounds.js", "scene-path.js", "segment-scene.js", "symbol-registry.js", "svg-identifiers.js", "soft-terrain-geometry.js", "soft-terrain-text.js", "topo-scene.js"
]);
const ENCODING = new Set(["attributes.js", "badge-style.js", "paint.js", "xml.js"]);

/**
 * Inspect renderer imports for forbidden reverse dependencies and serialization/geometry boundary violations.
 * Enforce the computation/encoding boundary, including re-exports.
 * @responsibility computation
 * @param {string} file - Repository-relative source path used in discovery or diagnostics.
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
 * @returns {unknown} The violations value selected or validated above.
 */

export function rendererDependencyViolations(file, source) {
  const violations = [];
  if (/\b(?:import|require)\s*\(/.test(source)) violations.push(`${file}: runtime module loading`);
  const imports = source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/g);
  for (const [, specifier] of imports) {
    const target = posix.normalize(posix.join(posix.dirname(file), specifier));
    const internal = specifier.startsWith("./") && !target.includes("/");
    const allowed = file === "icon-serializer.js" ? specifier === "@subvertic/vrl-icons/svg" || internal && target === "attributes.js"
      : (file === "svg-serializer.js" || file === "row-serializer.js") ? internal && (ENCODING.has(target) || target === "icon-serializer.js")
      : COMPUTATIONS.has(file) ? specifier === "@subvertic/vrl-core" || specifier === "@subvertic/vrl-icons/semantics" || internal && COMPUTATIONS.has(target)
      : specifier === "@subvertic/vrl-core" || internal;
    if (!allowed) violations.push(`${file} -> ${specifier}`);
  }
  return violations;
}
