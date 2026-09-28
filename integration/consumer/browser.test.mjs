import { DESCRIPTION_EN } from "./description-fixtures.js";
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

  test("hidden SVG negative control removes the image from the accessibility tree", /**
   * Demonstrate that the browser oracle detects hidden essential content instead of only inspecting metadata strings.
   * @responsibility coordinator
   * @param {Object} t - Test context owning cleanup.
   * @returns {Promise<void>} Resolves after hiding the image changes actual accessible exposure.
   */ async t => {
    const context=await openPage(browser,application.origin,"react","icons",true);
    t.after(/**
     * Close the controlled browser context.
     * @responsibility coordinator
     * @returns {Promise<void>} Resolves after cleanup.
     */ () => context.close());
    const before=await accessibleImages(context.page);
    await context.page.locator("#diagram svg").evaluate(/**
     * Inject the deliberately hidden-image failure into this owned test page.
     * @responsibility coordinator
     * @param {SVGElement} svg - Mounted test image.
     * @returns {void} Completes after visibility metadata is changed.
     */ svg => svg.setAttribute("aria-hidden","true"));
    assert.deepEqual([before.length,(await accessibleImages(context.page)).length],[1,0]);
  });
  test("monochrome print retains essential cues with background fills suppressed", /**
   * Exercise print media and disabled decorative fills while observing actual visible strokes and route description.
   * @responsibility coordinator
   * @param {Object} t - Test context owning cleanup.
   * @returns {Promise<void>} Resolves after independent cue and accessibility checks in print media.
   */ async t => {
    const context=await openPage(browser,application.origin,"react","icons",true,{flow:"rows",style:"soft-terrain",monochrome:"true",width:"736",symbols:"minimal"});
    t.after(/**
     * Close the controlled print fixture context.
     * @responsibility coordinator
     * @returns {Promise<void>} Resolves after cleanup.
     */ () => context.close());
    await context.page.emulateMedia({media:"print"});
    await context.page.addStyleTag({content:"svg > rect, .vrl-row-wash { fill: none !important; }"});
    const cues=await context.page.locator("#diagram svg").evaluate(/**
     * Inspect non-color path strokes after print styles suppress background fills.
     * @responsibility computation
     * @param {SVGElement} svg - Mounted monochrome row document.
     * @returns {Object} Visible cue counts and the retained slippery hazard wording.
     */ svg => {
      const counts={};
      for(const kind of ["water","pool","station","distance-break","technical","contour"]) {
        counts[kind]=0;
        for(const path of svg.querySelectorAll(`.vrl-row-${kind}`)) if(getComputedStyle(path).stroke!=="none" && parseFloat(getComputedStyle(path).strokeWidth)>=2) counts[kind]++;
      }
      return {counts,hazard:svg.textContent.includes("Slippery landing")};
    });
    assert.deepEqual([cues,await accessibleImages(context.page)],[{counts:{water:1,pool:1,station:2,"distance-break":1,technical:2,contour:2},hazard:true},[["Synthetic two-rappel canyon topo",DESCRIPTION_EN.replace(/\s+/g," ")]]]);
  });
  for (const surface of ["react", "svelte", "sveltekit"]) {
    for (const query of [{}, {style:"soft-terrain",flow:"rows",monochrome:"true",width:"320"}]) {
      test(`${surface} preserves unknown rope in its hydrated accessible image: ${JSON.stringify(query)}`, /**
       * Verify the packaged framework exposes the exact independent unknown-rope description in Chromium.
       * @responsibility coordinator
       * @param {Object} t - Test context that owns browser cleanup.
       * @returns {Promise<void>} Resolves after accessible facts, warning presence and client errors are checked.
       */ async t => {
        const context=await openPage(browser,application.origin,surface,"unknownRope",true,query);
        t.after(/**
         * Close the browser context created for this single scenario.
         * @responsibility coordinator
         * @returns {Promise<void>} Resolves when the owned browser resources are released.
         */ () => context.close());
        const expectedText="Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements. 1. Rappel R1. Movement: descent. Vertical change: -12m. Anchor type: bolts. Anchor count: unknown. Physical height: 12m. Declared rope: unknown.";
        const state=await snapshot(context.page);
        assert.deepEqual([await accessibleImages(context.page),state.warning.includes("explicitly unknown"),context.errors],[[["Synthetic unknown rope topo",expectedText]],true,[]]);
      });
    }

    for (const query of [{}, {style:"soft-terrain",flow:"rows",monochrome:"true",width:"320"}]) {
      test(`${surface} preserves unknown height in its hydrated accessible image: ${JSON.stringify(query)}`, /**
       * Verify the packaged framework exposes the exact independent unknown-height description in Chromium.
       * @responsibility coordinator
       * @param {Object} t - Test context that owns browser cleanup.
       * @returns {Promise<void>} Resolves after accessible facts, warning presence and client errors are checked.
       */ async t => {
        const context=await openPage(browser,application.origin,surface,"unknownHeight",true,query);
        t.after(/**
         * Close the browser context created for this single scenario.
         * @responsibility coordinator
         * @returns {Promise<void>} Resolves when the owned browser resources are released.
         */ () => context.close());
        const expectedText="Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements. 1. Rappel R1. Movement: descent. Vertical change: unknown. Anchor type: bolts. Anchor count: unknown. Physical height: unknown. Declared rope: 20m.";
        const state=await snapshot(context.page);
        assert.deepEqual([await accessibleImages(context.page),state.warning.includes("explicitly unknown"),context.errors],[[["Synthetic unknown height topo",expectedText]],true,[]]);
      });
    }

    for (const query of [{}, {style:"soft-terrain",flow:"rows",monochrome:"true",width:"320"}]) {
      test(`${surface} preserves supplied pool depth in its hydrated accessible image: ${JSON.stringify(query)}`, /**
       * Verify the packaged framework exposes one exact depth fact without an invented unknown or motion.
       * @responsibility coordinator
       * @param {Object} t - Test context that owns browser cleanup.
       * @returns {Promise<void>} Resolves after independent accessible facts, empty warnings and client errors are checked.
       */ async t => {
        const context=await openPage(browser,application.origin,surface,"poolDepth",true,query);
        t.after(/**
         * Close the browser context created for this single pool-depth scenario.
         * @responsibility coordinator
         * @returns {Promise<void>} Resolves when the owned browser resources are released.
         */ () => context.close());
        const expectedText="Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements. 1. Pool P1. Measured pool depth: 2.5m.";
        const state=await snapshot(context.page);
        assert.deepEqual([await accessibleImages(context.page),state.warning,context.errors],[[["Synthetic pool depth topo",expectedText]],"",[]]);
      });
    }

    for (const hydrated of [false,true]) for (const query of [{}, {style:"soft-terrain",symbols:"annotations"}, {style:"soft-terrain",flow:"rows",monochrome:"true",width:"320"}, {style:"soft-terrain",flow:"rows",monochrome:"true",symbols:"minimal",theme:"dark",width:"736"}]) {
      test(`${surface} ${hydrated ? "hydrated" : "SSR"} exposes one named image with complete route facts: ${JSON.stringify(query)}`, /**
       * Inspect the real Chromium accessibility tree, requiring one image and an independently specified complete description.
       * @responsibility coordinator
       * @param {Object} t - Test context owning cleanup of the isolated consumer page.
       * @returns {Promise<void>} Resolves after accessible name, description and absence of duplicate image roles are verified.
       */ async t => {
        const context=await openPage(browser,application.origin,surface,"icons",hydrated,query);
        t.after(/**
         * Release the isolated consumer browser context after accessibility inspection.
         * @responsibility coordinator
         * @returns {Promise<void>} Resolves when browser resources are released.
         */ () => context.close());
        assert.deepEqual([await accessibleImages(context.page),context.errors],[[["Synthetic two-rappel canyon topo",DESCRIPTION_EN.replace(/\s+/g," ")]],[]]);
      });
    }

    for (const width of [320, 736]) for (const hydrated of [false, true]) {
      test(`${surface} ${hydrated ? "hydrated" : "SSR"} row flow keeps readable text and paired continuations at ${width}`, /**
       * Inspect actual browser bounds, fonts and logical continuation ordering from each packed framework consumer.
       * @responsibility coordinator
       * @param {Object} t - Test context owning cleanup for its isolated browser context.
       * @returns {Promise<void>} Resolves after the single browser behavior assertion succeeds.
       */ async t => {
        const context = await openPage(browser, application.origin, surface, "icons", hydrated, { style:"soft-terrain", flow:"rows", symbols:"annotations", width:String(width) });
        t.after(/**
         * Release the isolated pages and browser resources after this scenario.
         * @responsibility coordinator
         * @returns {Promise<void>} Resolves after context closure.
         */ () => context.close());
        assert.deepEqual([await rowSnapshot(context.page), context.errors], [{ width, minFont:14, clipped:[], pairs:["A:out:2","A:in:1","B:out:3","B:in:2","C:out:4","C:in:3","D:out:5","D:in:4","E:out:6","E:in:5"], walk:true, owners:["0","1","2","3","4,5","6"] }, []]);
      });
    }
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
         * Compute (window.ssrContainer === document.querySelector(".vrl-diagram") && window.ssrSvgMarkup === document.querySelector("#diagram svg")?.outerHTML).
         * @responsibility computation
         * @returns {boolean} The result of the documented comparison or calculation.
         */ () => (window.ssrContainer === document.querySelector(".vrl-diagram") && window.ssrSvgMarkup === document.querySelector("#diagram svg")?.outerHTML)) : true;
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
          (window.ssrContainer === document.querySelector(".vrl-diagram") && window.ssrSvgMarkup === document.querySelector("#diagram svg")?.outerHTML)) : true;
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
           * Compute (window.ssrContainer === document.querySelector(".vrl-diagram") && window.ssrSvgMarkup === document.querySelector("#diagram svg")?.outerHTML).
           * @responsibility computation
           * @returns {boolean} The result of the documented comparison or calculation.
           */ () => (window.ssrContainer === document.querySelector(".vrl-diagram") && window.ssrSvgMarkup === document.querySelector("#diagram svg")?.outerHTML)) : true;
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
      assert.deepEqual([presentation, context.errors], [["Ruta esquematica, sin escala. Lea los elementos en orden. Las cuerdas son longitudes declaradas, no requisitos de equipo.\n1. Inicio S1.\n2. Rapel R1. Movimiento: descenso. Cambio vertical: -10m. Tipo de anclaje: desconocido. Cantidad de anclajes: desconocido. Altura fisica: 10m. Cuerda declarada: 20m.\n3. Salida E1.", "#14171a"], []]);
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

/**
 * Observe actual emitted row text/icon bounds, font sizes and continuation ownership in the browser.
 * @responsibility coordinator
 * @param {Object} page - Playwright page for a real packed framework consumer.
 * @returns {Promise<Object>} Independently observed browser contract values.
 */
async function rowSnapshot(page) {
  return page.locator("#diagram svg").evaluate(/**
   * Project rendered geometry and explicit pairing attributes without invoking production layout helpers.
   * @responsibility computation
   * @param {SVGElement} svg - The mounted row SVG root.
   * @returns {Object} Width, minimum font, escaped primitives, exact pairs, distance and source order.
   */ svg => {
    const outer=svg.getBoundingClientRect(), clipped=[], pairs=[], owners=[];
    let minFont=Infinity;
    for(const text of svg.querySelectorAll("text")) minFont=Math.min(minFont,parseFloat(getComputedStyle(text).fontSize));
    for(const item of svg.querySelectorAll("text,.vrl-annotation-icon,path:not(defs path)")) {
      const box=item.getBoundingClientRect();
      if(box.left<outer.left-0.1 || box.right>outer.right+0.1 || box.top<outer.top-0.1 || box.bottom>outer.bottom+0.1) clipped.push(item.tagName);
    }
    for(const marker of svg.querySelectorAll(".vrl-continuation")) pairs.push(`${marker.dataset.code}:${marker.dataset.role}:${marker.dataset.section}`);
    for(const row of svg.querySelectorAll(".vrl-row")) owners.push(row.dataset.elements);
    const walk=svg.querySelectorAll(".vrl-row")[3].textContent.replace(/\s+/g," ").includes("120m") && svg.querySelectorAll(".vrl-row-distance-break").length===1;
    return {width:outer.width,minFont,clipped,pairs,walk,owners};
  });
}

/**
 * Read Chromium's accessibility tree rather than approximating accessible semantics from DOM attributes.
 * @responsibility coordinator
 * @param {Object} page - Owned real browser consumer page.
 * @returns {Promise<Array>} Exposed image names and complete normalized descriptions, in tree order.
 */
async function accessibleImages(page) {
  const session=await page.context().newCDPSession(page);
  try {
    const tree=await session.send("Accessibility.getFullAXTree"), images=[];
    for(const node of tree.nodes) if(!node.ignored && node.role?.value==="image") images.push([node.name?.value,node.description?.value?.replace(/\s+/g," ")]);
    return images;
  } finally { await session.detach(); }
}
