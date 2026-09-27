import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg, type RowTopoScene, type RenderOptions } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
const source = "route Rows\nstart\nrappel height=10m rope=20m\nexit";
const result = compileRoute(source, { layout: { width: 320 } });
if (result.ok) {
  const rows: RowTopoScene = computeTopoScene(result.model, result.layout, { flow: "rows", style: "soft-terrain" });
  const target: number | undefined = rows.rows[0]?.outgoing?.sectionNumber;
  const options: RenderOptions = { flow: "rows", style: "soft-terrain" };
  const dynamic = computeTopoScene(result.model, result.layout, options);
  if ("rows" in dynamic) dynamic.rows[0]?.elementIndexes;
  else dynamic.nodes[0]?.node;
  createDiagramState(source, { ...options, layout: { width: 320 } });
  renderTopoSvg(result.model, result.layout, options);
  // @ts-expect-error Unsupported flow must fail the public declaration contract.
  createDiagramState(source, { flow: "auto" });
  void target;
}
