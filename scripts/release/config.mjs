export const REPOSITORY = "OneTesseractInMultiverse/vrl";
export const REGISTRY = "https://registry.npmjs.org";
export const WORKSPACES = ["core", "icons", "render-svg", "diagram", "react", "svelte", "sveltekit"].map(/**
 * Resolve canonical package identities and paths in dependency publication order.
 * @responsibility computation
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {Object} A record containing name, directory, path.
 */ name => ({
  name: `@subvertic/vrl-${name}`, directory: `packages/vrl-${name}`, path: `packages/vrl-${name}/package.json`
}));
export const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
