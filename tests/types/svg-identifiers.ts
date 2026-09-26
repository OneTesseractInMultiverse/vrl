import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg, renderRouteSegments, renderDirectTechnicalSegment, renderDropLadderSegment, resolveTheme, type RenderOptions } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";

const source = "route Typed\nrappel height=10m rope=20m\nexit";
const options: RenderOptions = { idPrefix: "typed-instance" };
createDiagramState(source, options);
createVrlReactDiagramState(source, options);
createVrlSvelteDiagramState(source, options);
createVrlSvelteKitLoad({ source, options });
const result = compileRoute(source);
if (result.ok) {
  const arrow: string = computeTopoScene(result.model, result.layout, options).identifiers.arrow;
  renderTopoSvg(result.model, result.layout, options);
  renderRouteSegments(result.layout, resolveTheme(), "en", "typed-instance");
  const node = result.layout.nodes[0]!;
  renderDirectTechnicalSegment(node, node, resolveTheme(), node.element, result.layout, "en", "typed-instance");
  renderDropLadderSegment(node, node, resolveTheme(), node.element, "en", result.layout, "typed-instance");
  // @ts-expect-error Namespace values must be strings.
  renderTopoSvg(result.model, result.layout, { idPrefix: 2 });
  // @ts-expect-error Null is not an omitted namespace.
  createDiagramState(source, { idPrefix: null });
  // @ts-expect-error Fragment helpers apply the same namespace type.
  renderRouteSegments(result.layout, resolveTheme(), "en", false);
  void arrow;
}
