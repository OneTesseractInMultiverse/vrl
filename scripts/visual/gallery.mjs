import { readFileSync } from "node:fs";
import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg, renderRouteText, escapeXml } from "@subvertic/vrl-render-svg";

/**
 * Read the reviewed fixture inventory and render each explicitly selected presentation through public APIs.
 * @responsibility coordinator
 * @param {URL} root - Trusted repository root URL; fixture paths are repository-owned data.
 * @returns {Map<string, string>} Deterministic SVG and index artifacts, without writing files or updating approved facts.
 * @throws {Error} Propagates unreadable fixtures, compilation failure and unsupported rendering configurations.
 */
export function visualArtifacts(root) {
  const catalog = JSON.parse(readFileSync(new URL("tests/fixtures/visual/catalog.json", root), "utf8"));
  const files = new Map(), cards = [];
  for (const item of catalog.cases) {
    const fixture = catalog.fixtures[item.fixture];
    const source = readFileSync(new URL(fixture.source, root), "utf8");
    const result = compileRoute(source, { layout: { width: item.width } });
    if (!result.ok) throw new Error(`Invalid visual fixture: ${item.id}`);
    const options = { ...item.render, idPrefix: item.id };
    files.set(`${item.id}.svg`, renderTopoSvg(result.model, result.layout, options) + "\n");
    const warnings = [];
    for (const diagnostic of result.diagnostics) warnings.push(`${diagnostic.code}: ${diagnostic.message}`);
    cards.push(galleryCard(item, fixture, renderRouteText(result.model, options), warnings));
  }
  files.set("index.html", galleryPage(catalog, cards));
  return files;
}

/**
 * Encode one expandable comparison with a named external image and its visible complete HTML alternative.
 * @responsibility computation
 * @param {Object} item - Reviewed case identity, selected width and renderer settings.
 * @param {Object} fixture - Source path and independently reviewed SHA-256 fingerprint.
 * @param {string} alternative - Already encoded HTML from the public route-text serializer.
 * @param {string[]} warnings - Actual nonblocking compiler warnings, retained beside the image.
 * @returns {string} Review card preserving original intrinsic image width inside a scrollable viewport.
 */
function galleryCard(item, fixture, alternative, warnings) {
  const id = escapeXml(item.id);
  return `<details><summary>${id}</summary><p>Source: ${escapeXml(fixture.source)} · SHA-256: <code>${escapeXml(fixture.sha256)}</code></p><p>Warnings: ${escapeXml(warnings.length === 0 ? "none" : warnings.join("; "))}</p><p>Options: <code>${escapeXml(JSON.stringify(item.render))}</code></p><p><a href="${id}.svg">Open standalone SVG</a></p><div class="viewport"><img src="${id}.svg" alt="${id} fictional route diagram" aria-describedby="${id}-text"></div>${alternative}</details>`;
}

/**
 * Encode the gallery shell and provenance without embedding unescaped fixture content or changing rendering defaults.
 * @responsibility computation
 * @param {Object} catalog - Reviewed inventory revision, baseline commit and evidence limitations.
 * @param {string[]} cards - Already encoded cards in explicit comparison order.
 * @returns {string} Complete static HTML suitable for offline inspection with adjacent SVG files.
 */
function galleryPage(catalog, cards) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>VRL visual specification gallery</title><style>body{max-width:90rem;margin:2rem auto;padding:0 1rem;font:16px/1.5 system-ui;color:#111;background:#fff}details{border:1px solid #777;padding:1rem;margin:1rem 0}summary{font-size:1.2rem;font-weight:700;cursor:pointer}.viewport{overflow:auto;max-height:70vh}img{display:block;max-width:none}section{max-width:75ch}code{overflow-wrap:anywhere}a{color:#0645ad}</style><h1>VRL visual specification gallery</h1><p>All routes here are fictional. Compare facts before appearance; geometry is schematic, and rope declarations are not equipment requirements.</p><p>Inventory revision ${catalog.revision}; renderer/icon baseline <code>${escapeXml(catalog.baselineCommit)}</code>. Current generated artifacts are pinned by their enclosing Git commit. ${escapeXml(catalog.review)}</p><p>Each card retains the intrinsic diagram size and a complete visible text alternative. Expand the selected case and scroll instead of shrinking labels. Start with the canyon cases to compare only one visual choice at a time.</p>${cards.join("\n")}</html>\n`;
}
