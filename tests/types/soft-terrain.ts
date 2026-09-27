import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg, type RenderOptions } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";

const source = "route Typed\nrappel height=10m rope=20m\npool type=unknown\nexit";
const options: RenderOptions = { style: "soft-terrain" };
createDiagramState(source, options);
createVrlReactDiagramState(source, options);
createVrlSvelteDiagramState(source, options);
createVrlSvelteKitLoad({ source, options });
const result = compileRoute(source);
if (result.ok) {
  const scene = computeTopoScene(result.model, result.layout, { ...options, flow: "continuous" });
  const contour: string | undefined = scene.terrain?.contour;
  const dry: boolean | undefined = scene.pools[0]?.dry;
  renderTopoSvg(result.model, result.layout, { style: "classic" });
  renderTopoSvg(result.model, result.layout, { style: undefined });
  // @ts-expect-error Only the documented styles are accepted.
  renderTopoSvg(result.model, result.layout, { style: "soft" });
  // @ts-expect-error Null is not an omitted style.
  createDiagramState(source, { style: null });
  void [contour, dry];
}
