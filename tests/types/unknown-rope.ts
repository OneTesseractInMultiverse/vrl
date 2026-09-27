import { compileRoute, summarizeRouteMeasurements } from "@subvertic/vrl-core";
import type { CommonFields, Measurement, RopeDeclaration, RouteElement, ElementView } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";

const known: Measurement = {value:12,unit:"m",meters:12};
const declaration: RopeDeclaration = "unknown";
const rappel: RouteElement = {type:"rappel",id:"R1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:known,rope:declaration}};
const view: ElementView = rappel;
const numeric: number|null = summarizeRouteMeasurements([view]).maximumDeclaredRopeMeters;
const result = compileRoute('route Example\nrappel R1 height=12m rope=unknown');
if (result.ok) {
  renderTopoSvg(result.model,result.layout);
  for (const element of result.model.elements) if (element.type === "rappel") {
    const rope: RopeDeclaration = element.attributes.rope;
    if (rope !== "unknown") { const meters: number = rope.meters; void meters; }
    // @ts-expect-error A revision-2 rope must be narrowed before numeric access.
    element.attributes.rope.meters;
  }
}
// @ts-expect-error Required declarations still cannot be omitted.
const missing: RouteElement = {type:"rappel",id:"R1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:known}};
// @ts-expect-error The sentinel belongs to rappel ropes, not to known height fields.
const height: RouteElement = {type:"rappel",id:"R1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:"unknown",rope:known}};
// @ts-expect-error Unknown rope remains forbidden on other normalized element kinds.
const walk: RouteElement = {type:"walk",id:"W1",label:null,sourceLocation:undefined,extensions:{},attributes:{rope:"unknown"}};
// @ts-expect-error Metadata retains strict metric measurements.
const metadata: CommonFields = {rope:"unknown"};
void [numeric,missing,height,walk,metadata];
