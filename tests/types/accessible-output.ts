import { compileRoute } from "@subvertic/vrl-core";
import { describeRoute, renderRouteText, renderTopoSvg, type RouteDescription } from "@subvertic/vrl-render-svg";
const result=compileRoute("route Text\nwalk distance=120m",{layout:{width:320}});
if(result.ok) {
  const description: RouteDescription=describeRoute(result.model,{language:"es"});
  const facts: string[] | undefined=description.entries[0]?.facts;
  const html: string=renderRouteText(result.model,{idPrefix:"external",language:"es"});
  renderTopoSvg(result.model,result.layout,{flow:"rows",style:"soft-terrain",monochrome:true});
  // @ts-expect-error Monochrome must be a boolean.
  renderTopoSvg(result.model,result.layout,{monochrome:"yes"});
  void facts;void html;
}
