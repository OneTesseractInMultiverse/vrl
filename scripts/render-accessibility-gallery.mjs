import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg, renderRouteText } from "@subvertic/vrl-render-svg";
const root=new URL("../",import.meta.url), destination=new URL("docs/assets/accessibility/",root), check=process.argv.includes("--check");
const source=readFileSync(new URL("examples/soft-terrain-canyon.vrl",root),"utf8"), files=new Map();
let cards="";
for(const [name,width,theme,symbols,monochrome] of [["color-320",320,"light","annotations",false],["monochrome-320",320,"light","annotations",true],["monochrome-736",736,"light","minimal",true],["monochrome-dark-320",320,"dark","annotations",true]]) {
  const result=compileRoute(source,{layout:{width}});
  if(!result.ok) throw new Error("The accessibility gallery fixture must compile.");
  const svg=renderTopoSvg(result.model,result.layout,{flow:"rows",style:"soft-terrain",symbols,monochrome,theme,idPrefix:name});
  files.set(`${name}.svg`,svg+"\n");
  cards+=`<article><h2>${name}</h2><p><a href="${name}.svg">Standalone SVG</a></p>${svg}</article>`;
}
const route=compileRoute(source).model;
files.set("index.html",`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>VRL accessible canyon comparisons</title><style>body{margin:24px;font:16px/1.5 system-ui;color:#111;background:#fff}main{display:flex;align-items:flex-start;gap:32px;flex-wrap:wrap}article{max-width:100%;overflow:auto}h1,h2{line-height:1.2}a{color:#0645ad}section{max-width:70ch}li{margin-block:8px}</style><h1>Fictional canyon: color and monochrome</h1><p>Identical ordered route facts. Dashed contours, directed ropes, pool waves, station ticks and explicit hazard text retain meaning without hue. Geometry is schematic; declared ropes are not equipment requirements. Assistive-technology and practitioner review remain pending.</p><main>${cards}</main><h2>External image with adjacent route text</h2><p>This image uses an HTML description relationship; its internal SVG metadata is not relied on as the HTML alternative.</p><img src="monochrome-736.svg" width="736" alt="Synthetic two-rappel canyon topo" aria-describedby="external-text">${renderRouteText(route,{idPrefix:"external"})}</html>\n`);
for(const [name,contents] of files) {
  const path=new URL(name,destination);
  if(check) {if(readFileSync(path,"utf8")!==contents) throw new Error(`Stale accessibility gallery: ${name}`);}
  else {mkdirSync(destination,{recursive:true});writeFileSync(path,contents);}
}
console.log(`${check?"Checked":"Generated"} ${files.size} accessibility comparisons.`);
