import assert from "node:assert/strict";
import test, { before, after, describe } from "node:test";
import { chromium } from "playwright";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { SOURCES } from "./src/lib/cases.js";
import { startApplication, openPage, snapshot } from "./browser-support.mjs";

describe("production framework consumers", () => {
  let application, browser;
  before(async () => { application = await startApplication(); browser = await chromium.launch(); });
  after(async () => { await browser?.close(); await application?.stop(); });

  function expected(name) {
    const state = createDiagramState(SOURCES[name], { legend: false });
    return { svg: state.ok ? 1 : 0, title: state.ok ? `${state.model.name} topo` : null,
      warning: state.ok ? state.diagnosticsText : "", diagnostics: state.ok ? [] : [state.diagnosticsText] };
  }

  for (const surface of ["react", "svelte", "sveltekit"]) {
    for (const hydrated of [false, true]) {
      test(`${surface} ${hydrated ? "hydration" : "SSR"} keeps same-route marker references local across themes`, async (t) => {
        const context = await openPage(browser, application.origin, surface, "valid", hydrated, { multiple: "true" });
        t.after(() => context.close());
        const output = await markerSnapshot(context.page);
        const retained = hydrated ? await context.page.evaluate(() =>
          JSON.stringify(window.ssrMarkerIds) === JSON.stringify([...document.querySelectorAll("svg marker")].map(marker => marker.id)) &&
          window.ssrImage === document.querySelector('[role="img"]')) : true;
        assert.deepEqual([output, context.errors, retained], [[
          ["left-arrow", "#111111", "rgb(17, 17, 17)", 1, true],
          ["right-arrow", "#c3ccd4", "rgb(195, 204, 212)", 1, true]
        ], [], true]);
      });
    }
    test(`${surface} changes one namespace after hydration without altering its neighbor`, async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true, { multiple: "true" });
      t.after(() => context.close());
      await context.page.evaluate(() => window.fixture.update({ options: { legend: false, idPrefix: "updated" } }));
      assert.deepEqual([await markerSnapshot(context.page), context.errors], [[
        ["updated-arrow", "#111111", "rgb(17, 17, 17)", 1, true],
        ["right-arrow", "#c3ccd4", "rgb(195, 204, 212)", 1, true]
      ], []]);
    });
    test(`${surface} duplicate caller prefixes demonstrate the document-wide collision`, async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true, { multiple: "true" });
      t.after(() => context.close());
      await context.page.evaluate(() => window.fixture.update({ options: { legend: false, idPrefix: "right" } }));
      const collisions = await context.page.evaluate(() => [...document.querySelectorAll("#diagram svg")].map(svg => {
        const marker = svg.querySelector("marker");
        const path = svg.querySelector("path[marker-end]");
        return [marker.id, svg.contains(document.getElementById(path.getAttribute("marker-end").slice(5, -1)))];
      }));
      assert.deepEqual([collisions, context.errors], [[["right-arrow", true], ["right-arrow", false]], []]);
    });
    for (const name of Object.keys(SOURCES)) {
      for (const hydrated of [false, true]) {
        test(`${surface} ${hydrated ? "hydration" : "SSR"} preserves ${name} output`, async (t) => {
          const context = await openPage(browser, application.origin, surface, name, hydrated);
          t.after(() => context.close());
          const retained = hydrated ? await context.page.evaluate(() => window.ssrImage === document.querySelector('[role="img"]')) : true;
          assert.deepEqual([await snapshot(context.page), context.errors, retained], [expected(name), [], true]);
        });
      }
    }
    test(`${surface} responds to source changes through warning, error, and recovery states`, async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true);
      t.after(() => context.close());
      const states = [];
      for (const name of ["warning", "invalid", "changed"]) {
        await context.page.evaluate(source => window.fixture.update({ source }), SOURCES[name]);
        states.push(await snapshot(context.page));
      }
      assert.deepEqual([states, context.errors], [[expected("warning"), expected("invalid"), expected("changed")], []]);
    });
    test(`${surface} responds to option changes after hydration`, async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true);
      t.after(() => context.close());
      await context.page.evaluate(() => window.fixture.update({ options: { language: "es", theme: "dark", legend: false } }));
      const presentation = await context.page.evaluate(() => [document.querySelector("#diagram svg desc").textContent, document.querySelector("#diagram svg > rect").getAttribute("fill")]);
      assert.deepEqual([presentation, context.errors], [["Esquema VRL para Good route.", "#14171a"], []]);
    });
    test(`${surface} toggles warning presentation without losing the SVG`, async (t) => {
      const context = await openPage(browser, application.origin, surface, "warning", true);
      t.after(() => context.close());
      await context.page.evaluate(() => window.fixture.update({ showWarnings: false }));
      const hidden = await snapshot(context.page);
      await context.page.evaluate(() => window.fixture.update({ showWarnings: true }));
      assert.deepEqual([hidden, await snapshot(context.page), context.errors], [{ ...expected("warning"), warning: "" }, expected("warning"), []]);
    });
    test(`${surface} supplied state bypasses invalid source and preserves escaped diagnostics`, async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true);
      t.after(() => context.close());
      const diagram = createDiagramState(SOURCES.warning);
      diagram.diagnostics[0].message = '<img src="invalid" onerror="window.injected=true"> & note';
      await context.page.evaluate(diagram => window.fixture.update({ source: null, options: null, diagram }), diagram);
      const state = await context.page.evaluate(() => [document.querySelectorAll("#diagram svg").length,
        document.querySelector('[role="status"]').textContent.includes('<img src="invalid" onerror="window.injected=true"> & note'),
        document.querySelectorAll("#diagram img").length, window.injected ?? false]);
      assert.deepEqual([state, context.errors], [[1, true, 0, false], []]);
    });
  }

  test("SvelteKit client navigation consumes new asynchronous load data without a full reload", async (t) => {
    const context = await openPage(browser, application.origin, "sveltekit", "valid", true);
    t.after(() => context.close());
    await context.page.evaluate(() => { window.navigationMarker = "retained"; });
    await context.page.click("#warning-route");
    await context.page.waitForFunction(() => document.querySelector('[role="status"]') !== null);
    assert.deepEqual([await snapshot(context.page), await context.page.evaluate(() => window.navigationMarker), context.errors], [expected("warning"), "retained", []]);
  });
});

async function markerSnapshot(page) {
  return page.evaluate(() => [...document.querySelectorAll("#diagram svg")].map(svg => {
    const marker = svg.querySelector("marker");
    const paint = marker.querySelector("path");
    const paths = [...svg.querySelectorAll("path[marker-end]")];
    return [marker.id, paint.getAttribute("fill"), getComputedStyle(paint).fill, paths.length,
      document.querySelectorAll(`[id="${marker.id}"]`).length === 1 && paths.every(path =>
        document.getElementById(path.getAttribute("marker-end").slice(5, -1)) === marker &&
        path.getAttribute("stroke") === paint.getAttribute("fill"))];
  }));
}
