const ALLOWED = {
  "vrl-diagram/src/index.js": ["./composition/diagram-state.js", "./application/diagram-warnings.js"],
  "vrl-diagram/src/application/create-diagram-state.js": ["./diagram-state.js"],
  "vrl-diagram/src/application/diagram-state.js": ["@subvertic/core"],
  "vrl-diagram/src/application/diagram-warnings.js": ["@subvertic/core"],
  "vrl-diagram/src/composition/diagram-state.js": ["../application/create-diagram-state.js", "@subvertic/core", "@subvertic/render-svg"],
  "vrl-react/src/index.js": ["@subvertic/diagram"],
  "vrl-svelte/src/index.js": ["@subvertic/diagram", "@subvertic/render-svg"],
  "vrl-svelte/src/VrlDiagram.svelte": ["./index.js", "@subvertic/diagram"],
  "vrl-sveltekit/src/index.js": ["@subvertic/diagram"],
  "vrl-sveltekit/src/VrlDiagram.svelte": ["@subvertic/svelte/VrlDiagram.svelte"]
};

export function diagramDependencyViolations(file, source) {
  const violations = [];
  if (/\b(?:import|require)\s*\(/.test(source)) violations.push(`${file}: runtime module loading`);
  for (const [statement, specifier] of source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/g)) {
    if (!(ALLOWED[file] ?? []).includes(specifier)) violations.push(`${file} -> ${specifier}`);
    else if (["vrl-diagram/src/application/diagram-state.js", "vrl-diagram/src/application/diagram-warnings.js"].includes(file) && !/^import\s*\{\s*formatDiagnostic\s*\}\s*from/.test(statement)) violations.push(`${file}: only domain diagnostic formatting may be imported`);
    else if (file === "vrl-svelte/src/index.js" && specifier === "@subvertic/render-svg" && !/^import\s*\{\s*escapeXml\s*\}\s*from/.test(statement)) violations.push(`${file}: only wrapper encoding may be imported`);
  }
  return violations;
}
