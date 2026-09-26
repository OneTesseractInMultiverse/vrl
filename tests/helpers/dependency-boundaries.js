import { posix } from "node:path";

const ALLOWED = {
  domain: ["domain"],
  application: ["application", "domain"],
  parser: ["parser", "domain"],
  validation: ["validation", "domain"],
  layout: ["layout", "domain", "validation"],
  adapters: ["adapters", "application", "domain"],
  composition: ["composition", "application", "domain", "parser", "validation", "layout", "adapters"],
  "index.js": ["composition", "application", "domain", "parser", "validation", "layout", "adapters"]
};

/**
 * Inspect static imports against the core's allowed inward dependency boundaries. Focused check for core's
 * static ESM modules; runtime module loading is prohibited.
 * @responsibility computation
 * @param {string} file - Repository-relative source path used in discovery or diagnostics.
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
 * @returns {unknown} The violations value selected or validated above.
 */

export function dependencyViolations(file, source) {
  const allowed = ALLOWED[file.split("/")[0]] ?? [];
  const violations = [];
  if (/\b(?:import|require)\s*\(/.test(source)) violations.push(`${file}: runtime module loading`);
  const imports = source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/g);
  for (const [, specifier] of imports) {
    const target = posix.normalize(posix.join(posix.dirname(file), specifier));
    if (!specifier.startsWith(".") || !(allowed.includes(target.split("/")[0]) || (file.startsWith("parser/") && target === "application/route-ast.js"))) violations.push(`${file} -> ${specifier}`);
  }
  return violations;
}
