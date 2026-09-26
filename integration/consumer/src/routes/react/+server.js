import React from "react";
import { renderToString } from "react-dom/server";
import { View } from "../../../react-view.js";
import { requestProps } from "$lib/cases.js";


export function GET({ url }) {
  const props = requestProps(url);
  const markup = renderToString(React.createElement(View, props));
  const serialized = JSON.stringify(props).replaceAll("<", "\\u003c");
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>React consumer</title></head><body><section id="diagram">${markup}</section><script id="props" type="application/json">${serialized}</script><script>window.ssrImage = document.querySelector('[role="img"]'); window.ssrMarkerIds = [...document.querySelectorAll("svg marker")].map(marker => marker.id);</script><script type="module" src="/react-client.js"></script></body></html>`, { headers: { "content-type": "text/html" } });
}
