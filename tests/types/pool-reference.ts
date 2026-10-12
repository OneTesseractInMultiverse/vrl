import { compileRoute, type RouteElement, type CommonFields } from "@subvertic/vrl-core";
const swim:RouteElement={type:"swim",id:"SW1",label:null,attributes:{pool_ref:"P1"},extensions:{},sourceLocation:undefined};
const result=compileRoute('route Example\npool P1\nswim SW1 pool_ref=P1');
if(result.ok) for(const element of result.model.elements) if(element.type==="swim") {
  const reference:string|undefined=element.attributes.pool_ref;
  void reference;
}
// @ts-expect-error A pool cannot own the swim-only typed association.
const pool:RouteElement={type:"pool",id:"P1",label:null,attributes:{pool_ref:"SW1"},extensions:{},sourceLocation:undefined};
// @ts-expect-error Metadata does not own typed associations.
const metadata:CommonFields={pool_ref:"P1"};
// @ts-expect-error Reference identity cannot be a number or an array index.
const numeric:RouteElement={...swim,attributes:{pool_ref:1}};
// @ts-expect-error Absence is omission, not null.
const nullReference:RouteElement={...swim,attributes:{pool_ref:null}};
void [swim,pool,metadata,numeric,nullReference];
