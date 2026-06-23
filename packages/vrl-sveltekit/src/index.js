import { createVrlSvelteDiagramState } from "@subvertic/svelte";

export function createVrlSvelteKitData(source, options = {}) {
  return createVrlSvelteDiagramState(source, options);
}

export function createVrlSvelteKitLoad({ source, options = {}, key = "vrl" } = {}) {
  if (typeof key !== "string" || key === "") {
    throw new TypeError("createVrlSvelteKitLoad requires a non-empty string key.");
  }

  if (typeof source !== "string" && typeof source !== "function") {
    throw new TypeError("createVrlSvelteKitLoad requires source to be a string or function.");
  }

  return async function load(event) {
    const resolvedSource = await resolveInput(source, event);
    const resolvedOptions = await resolveInput(options, event);

    return {
      [key]: createVrlSvelteKitData(resolvedSource, resolvedOptions)
    };
  };
}

function resolveInput(value, event) {
  return typeof value === "function" ? value(event) : value;
}
