import { compileRoute } from "@subvertic/vrl-core";
import type { CommonFields, Measurement, RappelHeightDeclaration, RouteElement, ElementView } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";

const known: Measurement={value:12,unit:"m",meters:12};
const declaration: RappelHeightDeclaration="unknown";
const rappel: RouteElement={type:"rappel",id:"R1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:declaration,rope:"unknown"}};
const view: ElementView=rappel;
const result=compileRoute('route Example\nrappel R1 height=unknown rope=20m');
if(result.ok) {
  renderTopoSvg(result.model,result.layout);
  for(const element of result.model.elements) if(element.type==="rappel") {
    const height:RappelHeightDeclaration=element.attributes.height;
    if(height!=="unknown") { const meters:number=height.meters; void meters; }
    // @ts-expect-error Revision-3 heights must be narrowed before numeric access.
    element.attributes.height.meters;
  }
}
// @ts-expect-error Height remains required even when it may be explicitly unknown.
const missing:RouteElement={type:"rappel",id:"R1",label:null,sourceLocation:undefined,extensions:{},attributes:{rope:known}};
// @ts-expect-error Stages cannot be positioned against an unknown height.
const stages:RouteElement={type:"rappel",id:"R1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:"unknown",rope:known,stages:[known,known]}};
// @ts-expect-error Redirections cannot be positioned against an unknown height.
const redirect:RouteElement={type:"rappel",id:"R1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:"unknown",rope:known,redirection:[{distance:known,side:"left"}]}};
// @ts-expect-error Climb height stays numeric.
const climb:RouteElement={type:"climb",id:"C1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:"unknown"}};
// @ts-expect-error Downclimb may omit height but cannot use the rappel sentinel.
const downclimb:RouteElement={type:"downclimb",id:"D1",label:null,sourceLocation:undefined,extensions:{},attributes:{height:"unknown"}};
// @ts-expect-error Metadata remains strictly metric.
const metadata:CommonFields={height:"unknown"};
void [view,missing,stages,redirect,climb,downclimb,metadata];
