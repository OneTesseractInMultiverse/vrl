export const REPOSITORY = "OneTesseractInMultiverse/vrl";
export const REGISTRY = "https://registry.npmjs.org";
export const WORKSPACES = ["core", "render-svg", "diagram", "react", "svelte", "sveltekit"].map(name => ({
  name: `@subvertic/${name}`, directory: `packages/vrl-${name}`, path: `packages/vrl-${name}/package.json`
}));
export const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
