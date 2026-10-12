import { compileRoute, type RoutePhase, type RouteElement, type CommonFields } from "@subvertic/vrl-core";
const phase: RoutePhase = "approach";
const walk: RouteElement = {type:"walk",id:"W1",label:null,attributes:{phase},extensions:{},sourceLocation:undefined};
const result=compileRoute('route Example\nwalk W1 phase=return');
if(result.ok) for(const element of result.model.elements) {
  const membership:RoutePhase|undefined=element.attributes.phase;
  void membership;
}
// @ts-expect-error Absence is represented by omission, not an unknown sentinel.
const unknown: RoutePhase="unknown";
// @ts-expect-error Metadata does not own typed phase membership.
const metadata: CommonFields={phase:"approach"};
// @ts-expect-error Null is not an optional phase value.
const nullPhase: RouteElement={...walk,attributes:{phase:null}};
void [walk,unknown,metadata,nullPhase];
