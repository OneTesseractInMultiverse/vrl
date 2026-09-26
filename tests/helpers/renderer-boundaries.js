import { posix } from "node:path";

const COMPUTATIONS = new Set([
  "anchor-presentation.js", "badge-style.js", "detail-content.js", "detail-layout.js",
  "element-formatters.js", "locale.js", "node-scene.js", "panel-scene.js", "presentation.js",
  "render-options.js", "route-data.js", "scene-bounds.js", "scene-path.js", "segment-scene.js", "symbol-registry.js", "topo-scene.js"
]);
const ENCODING = new Set(["attributes.js", "badge-style.js", "paint.js", "xml.js"]);

/** Enforce the computation/encoding boundary, including re-exports. */
export function rendererDependencyViolations(file, source) {
  const violations = [];
  if (/\b(?:import|require)\s*\(/.test(source)) violations.push(`${file}: runtime module loading`);
  const imports = source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/g);
  for (const [, specifier] of imports) {
    const target = posix.normalize(posix.join(posix.dirname(file), specifier));
    const internal = specifier.startsWith("./") && !target.includes("/");
    const allowed = file === "svg-serializer.js" ? internal && ENCODING.has(target)
      : COMPUTATIONS.has(file) ? specifier === "@subvertic/vrl-core" || internal && COMPUTATIONS.has(target)
      : specifier === "@subvertic/vrl-core" || internal;
    if (!allowed) violations.push(`${file} -> ${specifier}`);
  }
  return violations;
}
