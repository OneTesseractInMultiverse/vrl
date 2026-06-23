import { resolveTheme } from "./theme.js";
import {
  elementColorToken,
  formatElementDetail,
  formatElementTitle
} from "./element-formatters.js";
import { symbolCode, symbolKind } from "./symbol-registry.js";
import { escapeXml } from "./xml.js";

export function renderTopoSvg(route, layout, options = {}) {
  const theme = resolveTheme(options.theme, options.themeTokens);
  const nodes = layout.nodes.map((node) => renderNode(node, theme, options.symbology)).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${layout.width} ${layout.height}" width="100%" height="auto">
  <title>${escapeXml(route.name)} topo</title>
  <desc>Vertical Route Language schematic for ${escapeXml(route.name)}.</desc>
  <rect width="${layout.width}" height="${layout.height}" fill="${theme.background}"/>
  <line x1="${layout.spine.x}" y1="${layout.spine.y1}" x2="${layout.spine.x}" y2="${layout.spine.y2}" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round"/>
  ${nodes}
</svg>`;
}

export function renderNode(node, theme, symbology = "federation") {
  const element = node.element;
  const color = theme[elementColorToken(element)];
  const title = formatElementTitle(element);
  const detail = formatElementDetail(element);
  const marker = renderSymbolMarker(node, element, color, symbology);

  return `<g class="vrl-node vrl-node-${element.type}" aria-label="${escapeXml(title)}">
    ${marker}
    <text x="${node.x + 28}" y="${node.y - 2}" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${theme.text}">${escapeXml(title)}</text>
    <text x="${node.x + 28}" y="${node.y + 17}" font-family="system-ui, sans-serif" font-size="12" fill="${theme.mutedText}">${escapeXml(detail)}</text>
  </g>`;
}

export function renderSymbolMarker(node, element, color, symbology = "federation") {
  const code = escapeXml(symbolCode(element, symbology));

  if (symbolKind(element) === "snake") {
    return `<g class="vrl-symbol vrl-symbol-snake" aria-label="Snake hazard">
      <path d="M ${node.x - 9} ${node.y + 8} C ${node.x - 2} ${node.y - 10}, ${node.x + 4} ${node.y + 10}, ${node.x + 10} ${node.y - 8}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <text x="${node.x}" y="${node.y + 20}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${color}">${code}</text>
    </g>`;
  }

  if (symbolKind(element) === "hazard") {
    return `<text class="vrl-symbol vrl-symbol-hazard" x="${node.x}" y="${node.y + 6}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="${color}">${code}</text>`;
  }

  return `<text class="vrl-symbol vrl-symbol-standard" x="${node.x}" y="${node.y + 5}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="${color}">${code}</text>`;
}
