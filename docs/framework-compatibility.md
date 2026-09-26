# Framework and runtime compatibility

Published VRL packages declare Node `>=20.0.0`, React `>=18.0.0`, Svelte `>=4.0.0`, and SvelteKit `>=2.0.0` where those peers apply. Repository development tooling requires Node `>=25.0.0`. These are different boundaries: the consuming applications do not install the root development dependencies or use its test loader.

The CI workflow tests the following fixed combinations. A passing row verifies that combination, not every version admitted by the open peer ranges or an unreleased framework major. Dependency updates must change the reviewed profile and lock together and pass the same checks. Node 20 is retained here to verify the existing package floor; it is end of life, so use a maintained Node release for deployed applications. See the [Node release schedule](https://nodejs.org/en/about/previous-releases).

| CI job | Node | React / React DOM | Svelte | SvelteKit | Vite / Svelte plugin | Node adapter |
| --- | --- | --- | --- | --- | --- | --- |
| Minimum consumer | 20.0.0 | 18.0.0 | 4.0.0 | 2.0.0 | 5.0.3 / 3.0.0 | 2.0.0 |
| Current consumer, LTS runtime | 24.21.0 | 19.3.0 | 5.57.1 | 2.70.3 | 8.3.1 / 7.3.1 | 5.5.7 |
| Current consumer, current runtime | 26.10.0 | 19.3.0 | 5.57.1 | 2.70.3 | 8.3.1 / 7.3.1 | 5.5.7 |
| Workspace quality gate | 25.0.0, 26.10.0 | 18.3.1 | 4.2.20 | Helpers and component only | No application build | None |

Profiles pin all direct third-party dependencies; their committed npm locks pin transitive dependencies. Playwright 1.63.0 selects the Chromium revision. The minimum profile uses TypeScript 5.3.3 and esbuild 0.19.12; current uses TypeScript 6.0.3 and esbuild 0.28.2. Tool versions must satisfy the selected frameworks' peer and engine requirements, independently of VRL's package minimum.

## Evidence at each boundary

`make check` retains workspace imports, public TypeScript examples, framework server rendering, behavior tests, selected mutation probes, and the 100% line/branch/function thresholds for configured `packages/**/*.js` files. Its packed consumer checks exported declarations and runtime roots independently of workspace symlinks. The root `.npmrc` and that type fixture retain their existing peer-relaxed development install; they are not evidence of framework peer compatibility.

The separate consumer CI jobs use [`integration/consumer`](../integration/consumer) with the [`minimum`](../integration/profiles/minimum/package.json) or [`current`](../integration/profiles/current/package.json) profile. Preparation packs all six first-party workspaces, installs them as tarballs under ignored `.consumers/<profile>`, and enables `strict-peer-deps`, disables `legacy-peer-deps`, and enables `engine-strict`. Registry packages remain locked; preparation only refreshes the first-party tarball integrity and manifest metadata for the current checkout. No first-party workspace links enter these applications.

Each consumer builds a real SvelteKit application with the Node adapter and a React browser bundle. Vite compiles both `.svelte` component exports for server and client. React uses `renderToString` on the server and `hydrateRoot` in the browser. A local production server supplies the built application; Chromium observes the DOM with JavaScript both disabled and enabled.

The checks establish:

- Valid, warning, invalid and escaped-title output through React, the direct Svelte component, and the SvelteKit wrapper; blocking failures retain diagnostics and suppress SVG.
- Hydration retains the server image node, reports no browser errors or hydration warnings, and updates source through warning, failure and recovery states.
- Language/theme changes, warning visibility, supplied-state precedence and escaped diagnostic text work after hydration.
- Same-route diagrams with different themes retain unique marker IDs and local references across SSR/hydration; a namespace update leaves its neighbor unchanged. A deliberate duplicate-prefix control demonstrates document-wide ID resolution. See [SVG namespaces](svg-identifiers.md).
- A real asynchronous SvelteKit server load with a custom data key survives serialization and client navigation without a full document reload.
- All six package roots resolve inside the installed consumer. Private exports and a missing public component entry fail with the expected resolution/build errors.
- Offline strict installations of actual React 17 and Svelte 3 packages fail with peer-resolution errors against the corresponding packed adapters. These are unsupported examples, not an exhaustive rejection matrix.

The browser checks use the neutral state factory as the expected adapter-output contract; independent domain and rendering oracles remain in the workspace suites. Each test has one direct assertion. The same convention checker inspects the consumer `.test.mjs` files, while their execution stays in the separate applications.

These jobs are behavioral compatibility evidence, not visual regression or browser accessibility certification. They cover Chromium on Linux in CI, production builds, and the combinations above. They do not cover Firefox/WebKit, development-mode hot reload, every deployment adapter, or every intermediate framework release. `.svelte` execution and browser code are verified by these scenarios, not included in the package JavaScript coverage percentage. The minimum Svelte plugin also reports the existing legacy `svelte` field/export-condition warning; explicit documented component imports build and run successfully.

## Reproduce locally

Use the Node version for the selected profile. Preparation and browser installation may access package registries and browser downloads. Neither step needs secrets. On Linux, add `--with-deps` to the browser install command to install required system libraries.

```sh
node scripts/prepare-consumers.mjs minimum
node .consumers/minimum/node_modules/playwright/cli.js install chromium
node scripts/check-consumers.mjs minimum

node scripts/prepare-consumers.mjs current
node .consumers/current/node_modules/playwright/cli.js install chromium
node scripts/check-consumers.mjs current
```

The equivalent root shortcuts are `npm run prepare:consumers -- minimum` and `npm run check:consumers -- minimum`. Checking requires a prepared profile and installed browser; missing prerequisites fail instead of skipping tests. It builds and tests with npm offline mode. Negative peer checks recover the exact unsupported-version tarballs from the cache populated during setup and explicitly disable registry access. Browser contexts reject requests outside the owned loopback server and block service workers. Tests use fresh contexts, dynamically allocated ports, fixed source cases and no external services, accounts or machine-specific browser state.

To run a selected regression after building:

```sh
cd .consumers/current
node --test --test-name-pattern='source changes' browser.test.mjs
```

Edit shared fixtures in `integration/consumer`, then prepare again to copy them and repack changes. Preparation recreates the selected generated directory from scratch; do not edit generated applications. To intentionally update framework/tool versions, edit its profile manifest and run:

```sh
node scripts/prepare-consumers.mjs current --refresh-lock
```

Review the resulting committed lock, update this matrix if needed, and run the complete workspace and consumer CI jobs before merging. Normal preparation never rewrites the checked-in locks. First-party integrity values in those locks are templates replaced from freshly packed contents; third-party resolutions and integrity remain unchanged.

The fixtures follow the framework entry points documented for [React hydration](https://react.dev/reference/react-dom/client/hydrateRoot), [Svelte compilation](https://svelte.dev/docs/svelte/svelte-compiler), [SvelteKit's Node adapter](https://svelte.dev/docs/kit/adapter-node), and [Playwright request routing](https://playwright.dev/docs/network).
