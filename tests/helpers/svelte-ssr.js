import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { compile } from "svelte/compiler";

/** Compile the real package entry points; leave their imports and implementation unchanged. */
export async function loadSvelteDiagrams() {
  const hook = registerHooks({ load: loadComponent });
  try {
    const svelte = await import("@subvertic/svelte/VrlDiagram.svelte");
    const kit = await import("@subvertic/sveltekit/VrlDiagram.svelte");
    return { svelte: svelte.default, kit: kit.default };
  } finally {
    hook.deregister();
  }
}

function loadComponent(url, context, nextLoad) {
  if (!url.endsWith(".svelte")) return nextLoad(url, context);
  const result = compile(readFileSync(new URL(url), "utf8"), { filename: fileURLToPath(url), generate: "ssr" });
  return { format: "module", source: result.js.code, shortCircuit: true };
}
