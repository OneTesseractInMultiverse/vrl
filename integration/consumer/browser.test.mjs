import assert from "node:assert/strict";
import test, { before, after, describe } from "node:test";
import { chromium } from "playwright";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { SOURCES } from "./src/lib/cases.js";
import { startApplication, openPage, snapshot } from "./browser-support.mjs";

describe("production framework consumers", /**
 * Register isolated server/browser lifecycle hooks and cross-framework SSR, hydration, update and failure
 * scenarios.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  let application, browser;
  before(/**
   * Start the owned consumer application and browser before registering observable scenarios.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */ async () => { application = await startApplication(); browser = await chromium.launch(); });
  after(/**
   * Close the owned browser and stop the application after the consumer suite, including partial setup
   * failures.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */ async () => { await browser?.close(); await application?.stop(); });

  /**
   * Compute the shared-state baseline for framework parity checks; independent compiler correctness is tested
   * in the domain suites.
   * @responsibility coordinator
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Object} A record containing svg, title, warning, diagnostics.
   */
  function expected(name) {
    const state = createDiagramState(SOURCES[name], { legend: false });
    return { svg: state.ok ? 1 : 0, title: state.ok ? `${state.model.name} topo` : null,
      warning: state.ok ? state.diagnosticsText : "", diagnostics: state.ok ? [] : [state.diagnosticsText] };
  }

  for (const surface of ["react", "svelte", "sveltekit"]) {
    for (const width of [320, 736]) for (const hydrated of [false, true]) {
      test(`${surface} ${hydrated ? "hydrated" : "SSR"} selective icons preserve meaning and clearance at ${width}`, /**
       * Verify the current fixture the current fixture selective icons preserve meaning and clearance at the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
       * @responsibility coordinator
       * @param {unknown} t - Supplied fixture or presentation value consumed by the documented operation.
       * @returns {Promise<void>} Resolves after the single browser assertion succeeds; setup and assertion failures reject.
       */ async t => {
        const context = await openPage(browser, application.origin, surface, "icons", hydrated, { style: "soft-terrain", symbols: "annotations", width: String(width) });
        t.after(/**
         * Close the test-owned browser context after the scenario.
         * @responsibility coordinator
         * @returns {Promise<void>} Resolves after pages and their resources are released.
         */ () => context.close());
        assert.deepEqual([await annotationSnapshot(context.page), context.errors], [{ ids: ["start", "bolt", "tree", "slippery", "finish"], hidden: true, collisions: [], hasFacts: true }, []]);
      });
    }
    test(`${surface} toggles decorative icons without moving labels after hydration`, /**
     * Verify the current fixture toggles decorative icons without moving labels after hydration using explicit fixture expectations; setup and assertion failures propagate to the runner.
     * @responsibility coordinator
     * @param {unknown} t - Supplied fixture or presentation value consumed by the documented operation.
     * @returns {Promise<void>} Resolves after the single browser assertion succeeds; setup and assertion failures reject.
     */ async t => {
      const context = await openPage(browser, application.origin, surface, "icons", true, { style: "soft-terrain", symbols: "annotations" });
      t.after(/**
       * Close the test-owned browser context after the scenario.
       * @responsibility coordinator
       * @returns {Promise<void>} Resolves after pages and their resources are released.
       */ () => context.close());
      const before = await context.page.locator("#diagram svg text").evaluateAll(/**
       * Project or check elements.map(element for the enclosing contract assertion.
       * @responsibility computation
       * @param {unknown} elements - Supplied fixture or presentation value consumed by the documented operation.
       * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
       */ elements => elements.map(/**
       * Project or check [element.textContent, element.getAttribute("x"), element.getAttribute("y")] for the enclosing contract assertion.
       * @responsibility computation
       * @param {Object|null|undefined} element - Optional presentation record with type and explicit attribute values.
       * @returns {Array} Ordered comparison or mapping tuple.
       */ element => [element.textContent, element.getAttribute("x"), element.getAttribute("y")]));
      await context.page.evaluate(/**
       * Dispatch a minimal-mode update through the mounted framework fixture.
       * @responsibility coordinator
       * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
       */ () => window.fixture.update({ options: { style: "soft-terrain", symbols: "minimal", legend: false } }));
      const after = await context.page.locator("#diagram svg text").evaluateAll(/**
       * Project or check elements.map(element for the enclosing contract assertion.
       * @responsibility computation
       * @param {unknown} elements - Supplied fixture or presentation value consumed by the documented operation.
       * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
       */ elements => elements.map(/**
       * Project or check [element.textContent, element.getAttribute("x"), element.getAttribute("y")] for the enclosing contract assertion.
       * @responsibility computation
       * @param {Object|null|undefined} element - Optional presentation record with type and explicit attribute values.
       * @returns {Array} Ordered comparison or mapping tuple.
       */ element => [element.textContent, element.getAttribute("x"), element.getAttribute("y")]));
      assert.deepEqual([before, await context.page.locator(".vrl-annotation-icon").count(), context.errors], [after, 0, []]);
    });
    for (const hydrated of [false, true]) {
      test(`${surface} ${hydrated ? "hydration" : "SSR"} preserves soft terrain and route facts`, /**
       * Verify ${surface} ${hydrated ? "hydration" : "SSR"} preserves soft terrain and route facts; arrange the
       * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @param {unknown} t - Test-runner context used to register fixture cleanup.
       * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
       */ async (t) => {
        const context = await openPage(browser, application.origin, surface, "valid", hydrated, { style: "soft-terrain" });
        t.after(/**
         * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
         * @responsibility coordinator
         * @returns {unknown} The result returned by context.close.
         */ () => context.close());
        const retained = hydrated ? await context.page.evaluate(/**
         * Compute window.ssrImage === document.querySelector('[role="img"]').
         * @responsibility computation
         * @returns {boolean} The result of the documented comparison or calculation.
         */ () => window.ssrImage === document.querySelector('[role="img"]')) : true;
        assert.deepEqual([await styleSnapshot(context.page), context.errors, retained], [
          ["Good route topo", 1, 1, 0, ["R1"], true, true], [], true
        ]);
      });
    }
    test(`${surface} switches styles after hydration while retaining technical facts`, /**
     * Verify ${surface} switches styles after hydration while retaining technical facts; arrange the scenario and
     * make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @param {unknown} t - Test-runner context used to register fixture cleanup.
     * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
     */ async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true, { style: "soft-terrain" });
      t.after(/**
       * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility coordinator
       * @returns {unknown} The result returned by context.close.
       */ () => context.close());
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by window.fixture.update.
       */ () => window.fixture.update({ options: { style: "classic", legend: false } }));
      const classic = await context.page.evaluate(/**
       * Project the current entry into an ordered tuple for context.page.evaluate.
       * @responsibility computation
       * @returns {Array} The ordered records or values assembled above.
       */ () => [
        document.querySelectorAll(".vrl-terrain-contour").length,
        document.querySelectorAll(".vrl-drop-rung").length > 0,
        document.querySelector("#diagram svg").textContent.includes("R1, 10m")
      ]);
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by window.fixture.update.
       */ () => window.fixture.update({ options: { style: "soft-terrain", legend: false } }));
      assert.deepEqual([classic, await styleSnapshot(context.page), context.errors], [
        [0, true, true], ["Good route topo", 1, 1, 0, ["R1"], true, true], []
      ]);
    });
    for (const hydrated of [false, true]) {
      test(`${surface} ${hydrated ? "hydration" : "SSR"} keeps same-route marker references local across themes`, /**
       * Verify ${surface} ${hydrated ? "hydration" : "SSR"} keeps same-route marker references local across themes;
       * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
       * test runner.
       * @responsibility coordinator
       * @param {unknown} t - Test-runner context used to register fixture cleanup.
       * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
       */ async (t) => {
        const context = await openPage(browser, application.origin, surface, "valid", hydrated, { multiple: "true" });
        t.after(/**
         * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
         * @responsibility coordinator
         * @returns {unknown} The result returned by context.close.
         */ () => context.close());
        const output = await markerSnapshot(context.page);
        const retained = hydrated ? await context.page.evaluate(/**
         * Compare marker identities and the image-wrapper DOM node with their pre-hydration observations.
         * @responsibility computation
         * @returns {unknown} The result of the documented comparison or calculation.
         */ () =>
          JSON.stringify(window.ssrMarkerIds) === JSON.stringify([...document.querySelectorAll("svg marker")].map(/**
           * Project marker.id from the current record.
           * @responsibility computation
           * @param {unknown} marker - Prepared or parsed symbol/marker record.
           * @returns {unknown} The marker.id value selected or validated above.
           */ marker => marker.id)) &&
          window.ssrImage === document.querySelector('[role="img"]')) : true;
        assert.deepEqual([output, context.errors, retained], [[
          ["left-arrow", "#111111", "rgb(17, 17, 17)", 1, true],
          ["right-arrow", "#c3ccd4", "rgb(195, 204, 212)", 1, true]
        ], [], true]);
      });
    }
    test(`${surface} changes one namespace after hydration without altering its neighbor`, /**
     * Verify ${surface} changes one namespace after hydration without altering its neighbor; arrange the scenario
     * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @param {unknown} t - Test-runner context used to register fixture cleanup.
     * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
     */ async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true, { multiple: "true" });
      t.after(/**
       * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility coordinator
       * @returns {unknown} The result returned by context.close.
       */ () => context.close());
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by window.fixture.update.
       */ () => window.fixture.update({ options: { legend: false, idPrefix: "updated" } }));
      assert.deepEqual([await markerSnapshot(context.page), context.errors], [[
        ["updated-arrow", "#111111", "rgb(17, 17, 17)", 1, true],
        ["right-arrow", "#c3ccd4", "rgb(195, 204, 212)", 1, true]
      ], []]);
    });
    test(`${surface} duplicate caller prefixes demonstrate the document-wide collision`, /**
     * Verify ${surface} duplicate caller prefixes demonstrate the document-wide collision; arrange the scenario
     * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @param {unknown} t - Test-runner context used to register fixture cleanup.
     * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
     */ async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true, { multiple: "true" });
      t.after(/**
       * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility coordinator
       * @returns {unknown} The result returned by context.close.
       */ () => context.close());
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by window.fixture.update.
       */ () => window.fixture.update({ options: { legend: false, idPrefix: "right" } }));
      const collisions = await context.page.evaluate(/**
       * Project a diagram's marker ID and whether its arrow resolves inside that same SVG.
       * @responsibility computation
       * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
       */ () => [...document.querySelectorAll("#diagram svg")].map(/**
        * Project a diagram's marker ID and whether its arrow resolves inside that same SVG.
        * @responsibility computation
        * @param {unknown} svg - Renderer-produced SVG string; precomputed consumer markup is trusted.
        * @returns {Array} The ordered records or values assembled above.
        */ svg => {
        const marker = svg.querySelector("marker");
        const path = svg.querySelector("path[marker-end]");
        return [marker.id, svg.contains(document.getElementById(path.getAttribute("marker-end").slice(5, -1)))];
      }));
      assert.deepEqual([collisions, context.errors], [[["right-arrow", true], ["right-arrow", false]], []]);
    });
    for (const name of Object.keys(SOURCES)) {
      for (const hydrated of [false, true]) {
        test(`${surface} ${hydrated ? "hydration" : "SSR"} preserves ${name} output`, /**
         * Verify ${surface} ${hydrated ? "hydration" : "SSR"} preserves ${name} output; arrange the scenario and make
         * its single direct assertion. Assertion and setup failures propagate to the test runner.
         * @responsibility coordinator
         * @param {unknown} t - Test-runner context used to register fixture cleanup.
         * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
         */ async (t) => {
          const context = await openPage(browser, application.origin, surface, name, hydrated);
          t.after(/**
           * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
           * @responsibility coordinator
           * @returns {unknown} The result returned by context.close.
           */ () => context.close());
          const retained = hydrated ? await context.page.evaluate(/**
           * Compute window.ssrImage === document.querySelector('[role="img"]').
           * @responsibility computation
           * @returns {boolean} The result of the documented comparison or calculation.
           */ () => window.ssrImage === document.querySelector('[role="img"]')) : true;
          assert.deepEqual([await snapshot(context.page), context.errors, retained], [expected(name), [], true]);
        });
      }
    }
    test(`${surface} responds to source changes through warning, error, and recovery states`, /**
     * Verify ${surface} responds to source changes through warning, error, and recovery states; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @param {unknown} t - Test-runner context used to register fixture cleanup.
     * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
     */ async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true);
      t.after(/**
       * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility coordinator
       * @returns {unknown} The result returned by context.close.
       */ () => context.close());
      const states = [];
      for (const name of ["warning", "invalid", "changed"]) {
        await context.page.evaluate(/**
         * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
         * @responsibility computation
         * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
         * @returns {unknown} The result returned by window.fixture.update.
         */ source => window.fixture.update({ source }), SOURCES[name]);
        states.push(await snapshot(context.page));
      }
      assert.deepEqual([states, context.errors], [[expected("warning"), expected("invalid"), expected("changed")], []]);
    });
    test(`${surface} responds to option changes after hydration`, /**
     * Verify ${surface} responds to option changes after hydration; arrange the scenario and make its single
     * direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @param {unknown} t - Test-runner context used to register fixture cleanup.
     * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
     */ async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true);
      t.after(/**
       * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility coordinator
       * @returns {unknown} The result returned by context.close.
       */ () => context.close());
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by window.fixture.update.
       */ () => window.fixture.update({ options: { language: "es", theme: "dark", legend: false } }));
      const presentation = await context.page.evaluate(/**
       * Project the current entry into an ordered tuple for context.page.evaluate.
       * @responsibility computation
       * @returns {Array} The ordered records or values assembled above.
       */ () => [document.querySelector("#diagram svg desc").textContent, document.querySelector("#diagram svg > rect").getAttribute("fill")]);
      assert.deepEqual([presentation, context.errors], [["Esquema VRL para Good route.", "#14171a"], []]);
    });
    test(`${surface} toggles warning presentation without losing the SVG`, /**
     * Verify ${surface} toggles warning presentation without losing the SVG; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @param {unknown} t - Test-runner context used to register fixture cleanup.
     * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
     */ async (t) => {
      const context = await openPage(browser, application.origin, surface, "warning", true);
      t.after(/**
       * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility coordinator
       * @returns {unknown} The result returned by context.close.
       */ () => context.close());
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by window.fixture.update.
       */ () => window.fixture.update({ showWarnings: false }));
      const hidden = await snapshot(context.page);
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @returns {unknown} The result returned by window.fixture.update.
       */ () => window.fixture.update({ showWarnings: true }));
      assert.deepEqual([hidden, await snapshot(context.page), context.errors], [{ ...expected("warning"), warning: "" }, expected("warning"), []]);
    });
    test(`${surface} supplied state bypasses invalid source and preserves escaped diagnostics`, /**
     * Verify ${surface} supplied state bypasses invalid source and preserves escaped diagnostics; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @param {unknown} t - Test-runner context used to register fixture cleanup.
     * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
     */ async (t) => {
      const context = await openPage(browser, application.origin, surface, "valid", true);
      t.after(/**
       * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility coordinator
       * @returns {unknown} The result returned by context.close.
       */ () => context.close());
      const diagram = createDiagramState(SOURCES.warning);
      diagram.diagnostics[0].message = '<img src="invalid" onerror="window.injected=true"> & note';
      await context.page.evaluate(/**
       * Apply window.fixture.update to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @param {unknown} diagram - Precomputed trusted diagram state, including renderer-produced SVG.
       * @returns {unknown} The result returned by window.fixture.update.
       */ diagram => window.fixture.update({ source: null, options: null, diagram }), diagram);
      const state = await context.page.evaluate(/**
       * Project the current entry into an ordered tuple for context.page.evaluate.
       * @responsibility computation
       * @returns {Array} The ordered records or values assembled above.
       */ () => [document.querySelectorAll("#diagram svg").length,
        document.querySelector('[role="status"]').textContent.includes('<img src="invalid" onerror="window.injected=true"> & note'),
        document.querySelectorAll("#diagram img").length, window.injected ?? false]);
      assert.deepEqual([state, context.errors], [[1, true, 0, false], []]);
    });
  }

  test("SvelteKit client navigation consumes new asynchronous load data without a full reload", /**
   * Verify SvelteKit client navigation consumes new asynchronous load data without a full reload; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @param {unknown} t - Test-runner context used to register fixture cleanup.
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */ async (t) => {
    const context = await openPage(browser, application.origin, "sveltekit", "valid", true);
    t.after(/**
     * Apply context.close to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility coordinator
     * @returns {unknown} The result returned by context.close.
     */ () => context.close());
    await context.page.evaluate(/**
     * Set a browser-global navigation sentinel so the test can distinguish client navigation from a full reload.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => { window.navigationMarker = "retained"; });
    await context.page.click("#warning-route");
    await context.page.waitForFunction(/**
     * Compute document.querySelector('[role="status"]') !== null.
     * @responsibility computation
     * @returns {boolean} The result of the documented comparison or calculation.
     */ () => document.querySelector('[role="status"]') !== null);
    assert.deepEqual([await snapshot(context.page), await context.page.evaluate(/**
     * Project window.navigationMarker from the current record.
     * @responsibility computation
     * @returns {unknown} The window.navigationMarker value selected or validated above.
     */ () => window.navigationMarker), context.errors], [expected("warning"), "retained", []]);
  });
});

/**
 * Read rendered style primitives in the browser to verify the actual client output.
 * @responsibility coordinator
 * @param {unknown} page - Owned Playwright page.
 * @returns {Promise<unknown>} Resolves with the result returned by page.evaluate. Rejects when the awaited operation fails.
 */
async function styleSnapshot(page) {
  return page.evaluate(/**
   * Observe emitted soft-style contour/curve/rung counts, ownership and retained height/rope text from the
   * browser DOM.
   * @responsibility computation
   * @returns {Array} The ordered records or values assembled above.
   */ () => {
    const svg = document.querySelector("#diagram svg");
    return [svg.querySelector("title").textContent, svg.querySelectorAll(".vrl-terrain-contour").length,
      svg.querySelectorAll(".vrl-drop-curve").length, svg.querySelectorAll(".vrl-drop-rung").length,
      [...svg.querySelectorAll(".vrl-drop-curve")].map(/**
       * Apply group.getAttribute to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @param {unknown} group - Parsed SVG group selected for the observation.
       * @returns {unknown} The result returned by group.getAttribute.
       */ group => group.getAttribute("data-owner-id")),
      svg.textContent.includes("R1, 10m"), svg.textContent.includes("declared rope: 20m")];
  });
}

/**
 * Read SVG marker definitions and references from the browser to detect namespace collisions.
 * @responsibility coordinator
 * @param {unknown} page - Owned Playwright page.
 * @returns {Promise<unknown>} Resolves with the result returned by page.evaluate. Rejects when the awaited operation fails.
 */
async function markerSnapshot(page) {
  return page.evaluate(/**
   * Observe marker identity, attribute and computed paint, arrow counts and unique in-document ownership
   * independently of serializer internals.
   * @responsibility computation
   * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
   */ () => [...document.querySelectorAll("#diagram svg")].map(/**
    * Observe marker identity, attribute and computed paint, arrow counts and unique in-document ownership
    * independently of serializer internals.
    * @responsibility computation
    * @param {unknown} svg - Renderer-produced SVG string; precomputed consumer markup is trusted.
    * @returns {Array} The ordered records or values assembled above.
    */ svg => {
    const marker = svg.querySelector("marker");
    const paint = marker.querySelector("path");
    const paths = [...svg.querySelectorAll("path[marker-end]")];
    return [marker.id, paint.getAttribute("fill"), getComputedStyle(paint).fill, paths.length,
      document.querySelectorAll(`[id="${marker.id}"]`).length === 1 && paths.every(/**
       * Evaluate the selection condition document.getElementById(path.getAttribute("marker-end").slice(5, -1)) ===
       * marker && path.getAttribute("stroke") === paint.getAttribute("fill").
       * @responsibility computation
       * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
       * @returns {unknown} The result of the documented comparison or calculation.
       */ path =>
        document.getElementById(path.getAttribute("marker-end").slice(5, -1)) === marker &&
        path.getAttribute("stroke") === paint.getAttribute("fill"))];
  }));
}

/**
 * Inspect actual emitted pictogram paths, adjacent text and structural strokes in the browser.
 * @responsibility coordinator
 * @param {Object} page - Loaded production framework page.
 * @returns {Promise<Object>} Pilot identities, decorative semantics, retained facts and observed collisions.
 */
async function annotationSnapshot(page) {
  return page.evaluate(/**
   * Read emitted DOM identities, text and transformed path points to detect lost facts and visible collisions.
   * @responsibility coordinator
   * @returns {Object} Independent browser observations; no DOM content is changed.
   */ () => {
    const icons = [...document.querySelectorAll("#diagram .vrl-node .vrl-annotation-icon")];
    const texts = [...document.querySelectorAll("#diagram .vrl-node text")];
    const paths = [...document.querySelectorAll("#diagram .vrl-terrain-contour, #diagram .vrl-technical-curve")];
    const collisions = [];
    for (const icon of icons) {
      const box = icon.getBoundingClientRect();
      for (const text of texts) {
        const other = text.getBoundingClientRect();
        if (box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top) collisions.push([icon.dataset.vrlIcon, text.textContent]);
      }
      for (const path of paths) {
        const length = path.getTotalLength(), matrix = path.getScreenCTM();
        for (let offset = 0; offset <= length; offset += 1) {
          const point = path.getPointAtLength(offset).matrixTransform(matrix);
          if (point.x >= box.left - 1 && point.x <= box.right + 1 && point.y >= box.top - 1 && point.y <= box.bottom + 1) { collisions.push([icon.dataset.vrlIcon, path.getAttribute("class")]); break; }
        }
      }
    }
    const text = [...document.querySelectorAll("#diagram .vrl-node text")].map(/**
     * Project or check element.textContent for the enclosing contract assertion.
     * @responsibility computation
     * @param {Object|null|undefined} element - Optional presentation record with type and explicit attribute values.
     * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
     */ element => element.textContent).join(" ").replace(/\s+/g, " ");
    return { ids: icons.map(/**
     * Project or check icon.dataset.vrlIcon for the enclosing contract assertion.
     * @responsibility computation
     * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
     * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
     */ icon => icon.dataset.vrlIcon), hidden: icons.every(/**
     * Project or check icon.getAttribute("aria-hidden") === "true" for the enclosing contract assertion.
     * @responsibility computation
     * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
     * @returns {boolean} Whether the documented comparison or selection condition holds.
     */ icon => icon.getAttribute("aria-hidden") === "true"), collisions,
      hasFacts: ["18m", "12m", "declared rope: 40m", "declared rope: 30m", "2 anchors", "tree", "pool depth unknown", "120m", "Slippery landing"].every(/**
       * Project or check text.includes(fact) for the enclosing contract assertion.
       * @responsibility computation
       * @param {unknown} fact - Supplied fixture or presentation value consumed by the documented operation.
       * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
       */ fact => text.includes(fact)) };
  });
}
