import * as React from "react";
import type { ComponentProps } from "svelte";
import {
  compileRoute, compileRouteWithDependencies, computeElevationLayout, computeVerticalLayout,
  createDiagnostic, createEmptyRoute, createRouteCompiler, createRouteElement, exportRouteJson,
  formatDiagnostic, normalizeRoute, parseMeasurementToken, parseVrl, validateGeometry, validateRoute
} from "@subvertic/vrl-core";
import type { CompilerPorts, CompileResult, RouteAst, RouteModel, RouteLayout, RouteElement, ProcessingLimits } from "@subvertic/vrl-core";
import { computeTopoScene, dropLadderGeometry, renderTopoSvg, resolveTheme, renderNode } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import type { DiagramState } from "@subvertic/vrl-diagram";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData, createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";
import SvelteDiagram from "@subvertic/vrl-svelte/VrlDiagram.svelte";
import KitDiagram from "@subvertic/vrl-sveltekit/VrlDiagram.svelte";

const source = 'route Contract\nstart\nrappel pitch height=12m rope=24m\nexit';
const result: CompileResult = compileRoute(source, { limits: { maxElements: 100 }, layout: { width: 600 } });
if (result.ok) {
  const model: RouteModel = result.model;
  const layout: RouteLayout = result.layout;
  const text: string = exportRouteJson(model);
  const svg: string = renderTopoSvg(model, layout, { theme: "dark", language: "es-CR", themeTokens: { terrain: "#fff" } });
  const scene = computeTopoScene(model, layout);
  const bounds: number = scene.viewBox.width;
  for (const segment of layout.segments) {
    if (segment.kind === "technical") {
      const owner: string | null = segment.element.id;
      const signedDistance: number | null = segment.verticalDeltaMeters;
      const delta: number = segment.technicalDeltaY;
      dropLadderGeometry(segment.start, segment.end, segment.element, segment);
      void [owner, signedDistance, delta];
    } else {
      const owner: null = segment.element;
      void owner;
    }
  }
  for (const element of model.elements) {
    if (element.type === "rappel") {
      const rope: number = element.attributes.rope.meters;
      const height: number = element.attributes.height.meters;
      void [rope, height];
    }
  }
  for (const node of layout.nodes) renderNode(node, resolveTheme());
  void [text, svg, bounds];
} else {
  const absent: null = result.model;
  // @ts-expect-error Failed compilation has no usable model.
  result.model.summary;
  void absent;
}

const parsed = parseVrl(source);
const syntax: RouteAst = parsed.ast;
const model = normalizeRoute(syntax);
computeVerticalLayout(model);
computeElevationLayout(model); // Geometry preconditions are checked at runtime.
validateRoute(syntax);
const point = { line: 1, column: 1 };
const diagnostic = createDiagnostic("validation", "warning", "Custom warning", point, "", [], { code: "CUSTOM" });
formatDiagnostic(diagnostic);
createRouteElement("walk", { distance: "10m" }, undefined);
createRouteElement("start", {});
createEmptyRoute();
const measurement = parseMeasurementToken("12m");
if (measurement.ok) { const unit: "m" = measurement.value.unit; void unit; }
else { const reason: string = measurement.reason; void reason; }

const defaultPorts: CompilerPorts = {
  parse: parseVrl, validate: validateRoute, normalize: normalizeRoute,
  validateGeometry, layout: computeVerticalLayout, exportJson: exportRouteJson
};
createRouteCompiler(defaultPorts)(source);
createRouteCompiler({ validateGeometry: null })(source);
compileRouteWithDependencies(source, undefined, defaultPorts);
const customPorts: CompilerPorts<RouteAst, { name: string }, { count: number }, { spacing: number }> = {
  parse: (text, options) => {
    const limits: Readonly<ProcessingLimits> = options.limits;
    // @ts-expect-error The resolved budget snapshot is immutable.
    limits.maxElements = 1;
    return parseVrl(text, options);
  },
  validate: () => [], normalize: () => ({ name: "Custom" }), validateGeometry: () => [],
  layout: (route, options) => ({ count: route.name.length * (options?.spacing ?? 1) }), exportJson: (route) => route.name
};
const customResult = createRouteCompiler(customPorts)(source, { layout: { spacing: 7 } });
if (customResult.ok) { const count: number = customResult.layout.count; void count; }
compileRouteWithDependencies(source, {}, customPorts);

const state: DiagramState = createDiagramState(source, { legend: false, layout: { width: 600 } });
createVrlReactDiagramState(source);
createVrlSvelteDiagramState(source);
createVrlSvelteKitData(source);
renderVrlSvelteMarkup(source, {}, { diagram: state });
const Component = createVrlDiagramComponent(React, { source });
const element: React.ReactElement = React.createElement(Component, { diagram: state });
const svelteProps: ComponentProps<SvelteDiagram> = { source, diagram: state };
const kitProps: ComponentProps<KitDiagram> = { data: { route: state }, diagramKey: "route" };
const load = createVrlSvelteKitLoad({
  source: async (event: { params: { id: string } }) => `route ${event.params.id}`,
  options: event => ({ legend: event.params.id !== "brief" }), key: "route"
});
const data = await load({ params: { id: "Contract" } });
const loaded: DiagramState = data.route;
const defaultData = await createVrlSvelteKitLoad({ source })(undefined);
const defaultState: DiagramState = defaultData.vrl;
void [element, svelteProps, kitProps, loaded, defaultState];

// @ts-expect-error Source must be text.
compileRoute(12);
// @ts-expect-error Unknown layout options are rejected by the runtime boundary.
compileRoute(source, { layout: { horizontalScael: 2 } });
// @ts-expect-error Processing limits cannot be null.
parseVrl(source, { limits: null });
// @ts-expect-error Incorrect units cannot masquerade as normalized measurements.
const wrongUnit: RouteElement = { type: "walk", id: "W1", label: null, extensions: {}, sourceLocation: undefined, attributes: { distance: { value: 1, unit: "ft", meters: 1 } } };
// @ts-expect-error A normalized rappel needs a rope value.
const missingRope: RouteElement = { type: "rappel", id: "R1", label: null, extensions: {}, sourceLocation: undefined, attributes: { height: { value: 1, unit: "m", meters: 1 } } };
// @ts-expect-error Known attributes do not accept extension text.
model.elements[0]!.attributes.custom = "text";
// @ts-expect-error A partial replacement cannot change the default model shape.
createRouteCompiler({ normalize: () => ({ name: "Incomplete" }) });
// @ts-expect-error Async validators violate synchronous port contracts.
createRouteCompiler({ validate: async () => [] });
// @ts-expect-error Async models cannot replace plain synchronous records.
createRouteCompiler({ normalize: async () => model });
// @ts-expect-error Even complete custom wiring must return synchronous records.
createRouteCompiler({ ...customPorts, normalize: async () => ({ name: "Async" }) });
// @ts-expect-error A stage cannot require fields absent from its upstream AST contract.
const narrowerValidator: CompilerPorts = { ...defaultPorts, validate: (ast: RouteAst & { requiredTag: string }) => [] };
// @ts-expect-error Complete dependency wiring is required.
compileRouteWithDependencies(source, {}, { parse: parseVrl });
// @ts-expect-error Diagnostic severities are error or warning.
createDiagnostic("custom", "info", "message", point);
// @ts-expect-error Unknown themes fail at runtime.
renderTopoSvg(model, computeVerticalLayout(model), { theme: "automatic" });
// @ts-expect-error Theme token names are closed.
resolveTheme("light", { terrainColor: "#fff" });
// @ts-expect-error Failed shared state has an empty SVG.
const failedState: DiagramState = { ...state, ok: false, model: null, layout: null, json: null, svg: "<svg/>" };
// @ts-expect-error Framework wrappers accept the same validated options.
renderVrlSvelteMarkup(source, { legend: "yes" });
// @ts-expect-error The component requires a factory with createElement.
createVrlDiagramComponent({});
// @ts-expect-error Loader source providers resolve to text.
createVrlSvelteKitLoad({ source: async () => 123 });
// @ts-expect-error Custom keys do not also create a default vrl property.
data.vrl;
// @ts-expect-error Svelte component options retain the shared type contract.
const badProps: ComponentProps<SvelteDiagram> = { options: { theme: "sepia" } };
void [wrongUnit, missingRope, failedState, badProps, narrowerValidator];
