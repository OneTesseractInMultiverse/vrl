import { compileRoute } from "@subvertic/vrl-core";
import type { CommonFields, Measurement, PoolDepthDeclaration, RouteElement, ElementView } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";

const measured: Measurement={value:0,unit:"m",meters:0};
const declaration: PoolDepthDeclaration="unknown";
const pool:RouteElement={type:"pool",id:"P1",label:null,sourceLocation:undefined,extensions:{},attributes:{depth:declaration}};
const view:ElementView=pool;
const zero:RouteElement={...pool,attributes:{depth:measured}};
const result=compileRoute('route Example\npool P1 depth=2m');
if(result.ok) {
  renderTopoSvg(result.model,result.layout);
  for(const element of result.model.elements) if(element.type==="pool") {
    const depth:PoolDepthDeclaration|undefined=element.attributes.depth;
    if(depth!==undefined && depth!=="unknown") { const meters:number=depth.meters; void meters; }
    // @ts-expect-error Optional unknown depths must be narrowed before numeric access.
    element.attributes.depth.meters;
  }
}
// @ts-expect-error Non-pool depth is literal extension text, not a known attribute.
const walk:RouteElement={type:"walk",id:"W1",label:null,sourceLocation:undefined,extensions:{},attributes:{depth:measured}};
// @ts-expect-error Metadata depth remains in string extensions, not common known fields.
const metadata:CommonFields={depth:measured};
// @ts-expect-error Null cannot stand for absent or explicitly unknown depth.
const invalid:PoolDepthDeclaration=null;
void [view,zero,walk,metadata,invalid];
