import type { RouteElement, JumpHeightDeclaration } from "@subvertic/vrl-core";
const height: JumpHeightDeclaration = "unknown";
const jump: Extract<RouteElement, { type: "jump" }> = {type:"jump",id:"J1",label:null,attributes:{height,landing:"pool",flow:"low",phase:"canyon"},extensions:{rope:"text"},sourceLocation:undefined};
// @ts-expect-error A jump requires an explicit height declaration.
const missing: typeof jump.attributes = {};
// @ts-expect-error Rope is an extension, not typed jump rigging.
const rope: typeof jump.attributes = {height,rope:{meters:3,value:3,unit:"m"}};
// @ts-expect-error Inclination cannot scale a jump's vertical height.
const inclination: typeof jump.attributes = {height,inclination:{percent:50}};
// @ts-expect-error Pool references are currently swim-only.
const association: typeof jump.attributes = {height,pool_ref:"P1"};
void [jump, missing, rope, inclination, association];
