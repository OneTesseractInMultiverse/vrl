import { compileRoute } from "@subvertic/vrl-core";
import type { ElementType, RouteElement, Measurement, RouteElementAst } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
const type:ElementType="swim";
const distance:Measurement={value:12,unit:"m",meters:12};
const element:RouteElement={type,id:"SW1",label:null,sourceLocation:undefined,attributes:{distance,flow:"low"},extensions:{note:"Literal"}};
const absent:RouteElement={...element,attributes:{}};
const ast:RouteElementAst={type,id:null,label:null,attributes:{distance:"12m"},sourceLocation:{line:2,column:1}};
const result=compileRoute('route Example\nswim SW1 distance=12m');
if(result.ok) {
  renderTopoSvg(result.model,result.layout);
  for(const entry of result.model.elements) if(entry.type==="swim") {
    const meters:number|undefined=entry.attributes.distance?.meters;
    void meters;
  }
}
// @ts-expect-error Optional swimming distance must be metric when supplied.
const invalid:RouteElement={...element,attributes:{distance:"unknown"}};
// @ts-expect-error Depth is pool-only; swimming depth remains an extension.
const wrongScope:RouteElement={...element,attributes:{depth:distance}};
void [absent,ast,invalid,wrongScope];
