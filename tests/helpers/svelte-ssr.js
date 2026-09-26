import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { compile } from "svelte/compiler";

/**
 * Register the isolated Svelte loader and import compiled diagram components for server-rendering tests.
 * Compile the real package entry points; leave their imports and implementation unchanged.
 * @responsibility coordinator
 * @returns {Promise<Object>} Resolves with a record containing svelte, kit. Rejects when the awaited operation fails.
 */

export async function loadSvelteDiagrams() {
  const hook = registerHooks({ load: loadComponent });
  try {
    const svelte = await import("@subvertic/vrl-svelte/VrlDiagram.svelte");
    const kit = await import("@subvertic/vrl-sveltekit/VrlDiagram.svelte");
    return { svelte: svelte.default, kit: kit.default };
  } finally {
    hook.deregister();
  }
}

/**
 * Compile owned Svelte component modules for SSR and delegate other module loads to the next loader.
 * @responsibility coordinator
 * @param {unknown} url - Request URL used to resolve the allowlisted consumer scenario.
 * @param {unknown} context - Per-invocation parsing or browser context; mutation is owned by the enclosing workflow.
 * @param {unknown} nextLoad - Next module-loader hook for files outside the owned Svelte source.
 * @returns {unknown} The result returned by nextLoad. A record containing format, source, shortCircuit.
 */
function loadComponent(url, context, nextLoad) {
  if (!url.endsWith(".svelte")) return nextLoad(url, context);
  const result = compile(readFileSync(new URL(url), "utf8"), { filename: fileURLToPath(url), generate: "ssr" });
  return { format: "module", source: result.js.code, shortCircuit: true };
}
