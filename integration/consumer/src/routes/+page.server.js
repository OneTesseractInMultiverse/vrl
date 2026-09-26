import { createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";
import { requestProps } from "$lib/cases.js";

/**
 * Resolve source and options for a request and return the configured diagram data; resolver and compilation
 * exceptions propagate.
 * @responsibility coordinator
 * @param {unknown} event - SvelteKit request event or independently specified technical event.
 * @returns {Promise<Object>} Resolves with a record containing the supplied fields, the supplied fields, surface. Rejects when the awaited operation fails.
 */
export async function load(event) {
  const props = requestProps(event.url);
  const loadDiagram = createVrlSvelteKitLoad({ /**
   * Project props.source from the current record.
   * @responsibility computation
   * @returns {Promise<unknown>} Resolves with the props.source value selected or validated above. Rejects when the awaited operation fails.
   */ source: async () => props.source, options: props.options, key: "route" });
  return { ...props, ...await loadDiagram(event), surface: event.url.searchParams.get("surface") ?? "svelte" };
}
