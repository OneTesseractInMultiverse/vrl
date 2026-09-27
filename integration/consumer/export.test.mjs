import assert from "node:assert/strict";
import test, { before, after, describe } from "node:test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { compileRoute } from "@subvertic/vrl-core";
import { renderRouteText } from "@subvertic/vrl-render-svg";
import { SOURCES } from "./src/lib/cases.js";
import { DESCRIPTION_HTML_EN } from "./description-fixtures.js";
import { startApplication } from "./browser-support.mjs";
import { observeExports } from "./export-support.mjs";
const catalog = JSON.parse(readFileSync(new URL("./visual-fixtures/catalog.json", import.meta.url), "utf8"));
const clean = {clipped:[],hidden:[],overlaps:[],references:[],duplicates:[],small:[]};

describe("standalone and embedded visual exports", /**
 * Coordinate an owned production server and browser for deterministic gallery export and failure observations.
 * @responsibility coordinator
 * @returns {void} Registers the bounded export cases and cleanup hooks.
 */ () => {
  let application, browser;
  before(/**
   * Start the owned application and Chromium before observing artifacts from its static directory.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves when both resources are ready; startup failures propagate.
   */ async () => { application = await startApplication(); browser = await chromium.launch(); mkdirSync("export-evidence",{recursive:true}); });
  after(/**
   * Close browser and server resources even when an export assertion fails.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves after resource cleanup.
   */ async () => { await browser?.close(); await application?.stop(); });

  for (const item of catalog.cases) {
    test(`standalone ${item.id} has complete visible bounds and local accessible references`, /**
     * Navigate to an actual standalone SVG response and independently observe browser layout and XML/ARIA relationships.
     * @responsibility coordinator
     * @param {Object} t - Test context owning the isolated browser context.
     * @returns {Promise<void>} Resolves after the single export-integrity assertion succeeds.
     */ async t => {
      const page = await exportPage(browser, application.origin, t);
      const response = await page.goto(`${application.origin}/visual/${item.id}.svg`);
      assert.deepEqual([response.status(),await page.evaluate(observeExports)],[200,clean]);
    });
  }

  for (const name of ["canyon-mono-320","canyon-mono-736"]) {
    test(`external image ${name} retains structural raster output and exposes its HTML alternative`, /**
     * Decode the actual external SVG, compare structural raster bands with inline output, and inspect its accessibility description.
     * @responsibility coordinator
     * @param {Object} t - Test context owning the isolated browser context.
     * @returns {Promise<void>} Resolves after equivalent pixels and complete independently specified accessible facts are verified.
     */ async t => {
      const page = await exportPage(browser, application.origin, t);
      const svg = readFileSync(new URL(`./static/visual/${name}.svg`, import.meta.url), "utf8");
      const model = compileRoute(SOURCES.icons).model, alternative = renderRouteText(model,{idPrefix:"external"});
      await page.setContent(`<style>body{margin:0}img{display:block}</style><img src="${application.origin}/visual/${name}.svg" alt="Synthetic two-rappel canyon topo" aria-describedby="external-text">${alternative}`);
      await page.locator("img").evaluate(/**
       * Wait for the external SVG image decoder to complete rather than accepting an unloaded placeholder.
       * @responsibility coordinator
       * @param {HTMLImageElement} image - External image mounted in the owned page.
       * @returns {Promise<void>} Resolves after successful decode; broken image data rejects.
       */ image => image.decode());
      const external = await page.locator("img").screenshot(), session = await page.context().newCDPSession(page);
      const tree = await session.send("Accessibility.getFullAXTree"), images = [];
      await session.detach();
      for (const node of tree.nodes) if (!node.ignored && node.role?.value === "image") images.push([node.name?.value,node.description?.value?.replace(/\s+/g," ")]);
      await page.setContent(`<style>body{margin:0}svg{display:block}</style>${svg}`);
      const inline = await page.locator("svg").screenshot();
      const bands = await page.evaluate(structuralBands), inlineBands = [], externalBands = [];
      for (const clip of bands) inlineBands.push(createHash("sha256").update(await page.screenshot({clip,fullPage:true})).digest("hex"));
      await page.setContent(`<style>body{margin:0}img{display:block}</style><img src="${application.origin}/visual/${name}.svg" alt="Geometry comparison">`);
      await page.locator("img").evaluate(decodeExternalImage);
      for (const clip of bands) externalBands.push(createHash("sha256").update(await page.screenshot({clip,fullPage:true})).digest("hex"));
      writeFileSync(`export-evidence/${name}-external.png`,external);
      writeFileSync(`export-evidence/${name}-inline.png`,inline);
      assert.deepEqual([externalBands,images,bands.length],[inlineBands,[["Synthetic two-rappel canyon topo",DESCRIPTION_HTML_EN]],4]);
    });
  }

  test("neighboring inline exports keep all description and marker references local", /**
   * Compose differently themed same-route diagrams in one actual document and require local identity resolution.
   * @responsibility coordinator
   * @param {Object} t - Test context owning cleanup.
   * @returns {Promise<void>} Resolves after the complete document reference and layout observation passes.
   */ async t => {
    const page = await exportPage(browser, application.origin, t);
    const first = readFileSync(new URL("./static/visual/canyon-color-320.svg", import.meta.url),"utf8");
    const second = readFileSync(new URL("./static/visual/canyon-mono-736.svg", import.meta.url),"utf8");
    await page.setContent(first + second);
    assert.deepEqual(await page.evaluate(observeExports),clean);
  });

  for (const [name, change, key] of [
    ["clipped label",'svg.setAttribute("viewBox","0 0 100 3474"); svg.setAttribute("width","100")',"clipped"],
    ["hidden annotation",'document.querySelector("text[data-element]").style.visibility="hidden"',"hidden"],
    ["lost description",'svg.setAttribute("aria-describedby","absent")',"references"],
    ["colliding marker",'const other=svg.cloneNode(true); document.body.append(other)',"duplicates"]
  ]) {
    test(`export oracle rejects ${name}`, /**
     * Introduce one deliberate output fault and require the corresponding independent browser observation to report it.
     * @responsibility coordinator
     * @param {Object} t - Test context owning cleanup.
     * @returns {Promise<void>} Resolves only when the selected failure is observable.
     */ async t => {
      const page = await exportPage(browser, application.origin, t);
      await page.setContent(readFileSync(new URL("./static/visual/canyon-mono-320.svg", import.meta.url),"utf8"));
      await page.evaluate(`{const svg=document.querySelector("svg");${change}}`);
      const observed = await page.evaluate(observeExports);
      assert.equal(observed[key].length > 0,true);
    });
  }
  test("standalone malformed XML fails browser parsing", /**
   * Serve a deliberately damaged SVG and verify a parser error instead of accepting its surviving title or screenshot.
   * @responsibility coordinator
   * @param {Object} t - Test context owning cleanup.
   * @returns {Promise<void>} Resolves after the browser rejects malformed entity markup.
   */ async t => {
    const page = await exportPage(browser, application.origin, t);
    await page.route(`${application.origin}/damaged.svg`,/**
     * Supply the owned malformed SVG response without contacting an external service.
     * @responsibility coordinator
     * @param {Object} request - Playwright route for the local negative-control URL.
     * @returns {Promise<void>} Resolves after the deliberate malformed response is supplied.
     */ request => request.fulfill({contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg"><text>bad & text</text></svg>'}));
    await page.goto(`${application.origin}/damaged.svg`);
    assert.equal(await page.locator("parsererror").count(),1);
  });
});

/**
 * Create an isolated page, reject external requests and register unconditional context cleanup.
 * @responsibility coordinator
 * @param {Object} browser - Owned Chromium instance.
 * @param {string} origin - Only allowed network origin, provided by the owned server.
 * @param {Object} t - Test context that owns cleanup even after assertion failure.
 * @returns {Promise<Object>} Ready Playwright page without access to external services.
 */
async function exportPage(browser, origin, t) {
  const context = await browser.newContext({viewport:{width:1200,height:900},deviceScaleFactor:1,serviceWorkers:"block"});
  t.after(/**
   * Release the context after each independent export case.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves after context closure.
   */ () => context.close());
  await context.route("**/*",/**
   * Permit only the owned loopback application and abort all other network destinations.
   * @responsibility coordinator
   * @param {Object} request - Intercepted browser request.
   * @returns {Promise<void>} Resolves after continuing or aborting the request.
   */ request => new URL(request.request().url()).origin === origin ? request.continue() : request.abort());
  return context.newPage();
}

/**
 * Wait for the mounted external SVG image to finish decoding before collecting pixels.
 * @responsibility coordinator
 * @param {HTMLImageElement} image - External SVG image in the owned page.
 * @returns {Promise<void>} Resolves after decoding, or rejects for invalid image data.
 */
function decodeExternalImage(image) { return image.decode(); }

/**
 * Locate full-width structural drawing bands while excluding text, whose rasterization differs across image and inline contexts.
 * @responsibility computation
 * @returns {Object[]} Integer CSS-pixel screenshot clips around each row's paths, including stroke/arrowhead clearance.
 */
function structuralBands() {
  const svg = document.querySelector("svg"), outer = svg.getBoundingClientRect(), bands = [];
  for (const row of svg.querySelectorAll(".vrl-row")) {
    let top = Infinity, bottom = -Infinity;
    for (const path of row.querySelectorAll("path.vrl-row-technical,path.vrl-row-pool,path.vrl-row-water,path.vrl-row-distance-break,path.vrl-row-wash")) {
      const box = path.getBoundingClientRect(); top = Math.min(top,box.top); bottom = Math.max(bottom,box.bottom);
    }
    if (top < Infinity) bands.push({x:Math.floor(outer.left + window.scrollX),y:Math.floor(top + window.scrollY)-8,width:Math.ceil(outer.width),height:Math.ceil(bottom)-Math.floor(top)+16});
  }
  return bands;
}
