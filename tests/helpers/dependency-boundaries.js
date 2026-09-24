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

/** Focused check for core's static ESM modules; runtime module loading is prohibited. */
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
