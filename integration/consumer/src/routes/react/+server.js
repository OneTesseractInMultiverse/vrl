import React from "react";
import { renderToString } from "react-dom/server";
import { View } from "../../../react-view.js";
import { requestProps } from "$lib/cases.js";


/**
 * Resolve the React consumer case, render server HTML and serialize client props into the response.
 * @responsibility coordinator
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {unknown} input1.url - Request URL used to resolve the allowlisted consumer scenario.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function GET({ url }) {
  const props = requestProps(url);
  const markup = renderToString(React.createElement(View, props));
  const serialized = JSON.stringify(props).replaceAll("<", "\\u003c");
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>React consumer</title></head><body><section id="diagram">${markup}</section><script id="props" type="application/json">${serialized}</script><script>window.ssrImage = document.querySelector('[role="img"]'); window.ssrMarkerIds = [...document.querySelectorAll("svg marker")].map(marker => marker.id);</script><script type="module" src="/react-client.js"></script></body></html>`, { headers: { "content-type": "text/html" } });
}
