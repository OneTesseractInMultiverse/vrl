import { createVrlSvelteKitLoad } from "@subvertic/sveltekit";
import { requestProps } from "$lib/cases.js";

export async function load(event) {
  const props = requestProps(event.url);
  const loadDiagram = createVrlSvelteKitLoad({ source: async () => props.source, options: props.options, key: "route" });
  return { ...props, ...await loadDiagram(event), surface: event.url.searchParams.get("surface") ?? "svelte" };
}
