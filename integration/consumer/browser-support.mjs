import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";

/**
 * Start an owned localhost consumer server, poll bounded readiness and return its origin plus a cleanup
 * function; stop the process on startup failure.
 * @responsibility coordinator
 * @returns {Promise<Object>} Resolves with a record containing origin, stop. Rejects when the awaited operation fails.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export async function startApplication() {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["build/index.js"], { env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), ORIGIN: origin }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  /**
   * Append child-process output to a bounded invocation-local diagnostic buffer.
   * @responsibility computation
   * @param {unknown} chunk - Child-process output chunk appended to the bounded diagnostic buffer.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */
  const record = chunk => { output = (output + chunk).slice(-20_000); };
  server.stdout.on("data", record); server.stderr.on("data", record);
  /**
   * Terminate the owned server gracefully, escalate after the deadline and clear the cleanup timer after exit.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */
  const stop = async () => {
    if (server.exitCode !== null || server.signalCode !== null) return;
    const exited = new Promise(/**
     * Apply server.once to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility coordinator
     * @param {Function} resolve - Promise fulfillment callback for the owned asynchronous operation.
     * @returns {unknown} The result returned by server.once.
     */ resolve => server.once("exit", resolve));
    server.kill("SIGTERM");
    const timer = globalThis.setTimeout(/**
     * Apply server.kill to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility coordinator
     * @returns {unknown} The result returned by server.kill.
     */ () => server.kill("SIGKILL"), 5_000);
    try { await exited; } finally { clearTimeout(timer); }
  };
  try {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (server.exitCode !== null || server.signalCode !== null) throw new Error(`Consumer server exited:\n${output}`);
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(1_000) })).ok) return { origin, stop }; } catch { /* Wait for the owned local process. */ }
      await setTimeout(50);
    }
    throw new Error(`Consumer server did not start:\n${output}`);
  } catch (error) { await stop(); throw error; }
}

/**
 * Ask localhost for an unused ephemeral port and close the probe socket before resolving; socket failures
 * reject.
 * @responsibility coordinator
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function availablePort() {
  return new Promise(/**
   * Open an ephemeral localhost socket and resolve its port only after closing it; socket and close errors
   * reject the promise.
   * @responsibility coordinator
   * @param {Function} resolve - Promise fulfillment callback for the owned asynchronous operation.
   * @param {Function} reject - Promise rejection callback for the owned asynchronous operation.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (resolve, reject) => {
    const server = createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", /**
     * Read the bound port and settle the promise after socket cleanup, rejecting a close error instead of
     * leaking it.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => { const port = server.address().port; server.close(/**
      * Read the bound port and settle the promise after socket cleanup, rejecting a close error instead of
      * leaking it.
      * @responsibility coordinator
      * @param {unknown} error - Failure propagated by the observed operation.
      * @returns {unknown} The selected result, including the documented absent-value fallback.
      */ error => error ? reject(error) : resolve(port)); });
  });
}

/**
 * Create an isolated browser context, block external requests, capture browser errors and navigate to a
 * consumer case; close on failure.
 * @responsibility coordinator
 * @param {unknown} browser - Owned Playwright browser instance.
 * @param {string} origin - Allowed localhost origin of the consumer server.
 * @param {string} surface - React, Svelte or SvelteKit surface under test.
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @param {boolean} hydrated - Whether browser JavaScript and hydration are enabled.
 * @param {unknown} query - Additional fixture query parameters; defaults to {}.
 * @returns {Promise<Object>} Resolves with a record containing page, errors, close. Rejects when the awaited operation fails.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export async function openPage(browser, origin, surface, name, hydrated, query = {}) {
  const context = await browser.newContext({ javaScriptEnabled: hydrated, serviceWorkers: "block" });
  const errors = [];
  await context.route("**/*", /**
   * Allow only requests to the owned localhost origin; record and abort every external request.
   * @responsibility coordinator
   * @param {unknown} route - Normalized route or compatible route view used by this operation.
   * @returns {unknown} The result returned by route.abort. The result returned by route.continue.
   */ route => {
    if (new URL(route.request().url()).origin !== origin) { errors.push(`External request: ${route.request().url()}`); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", /**
   * Apply errors.push to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} error - Failure propagated by the observed operation.
   * @returns {unknown} The result returned by errors.push.
   */ error => errors.push(error.message));
  page.on("console", /**
   * Record console errors and hydration mismatch messages for the enclosing browser assertion.
   * @responsibility coordinator
   * @param {string} message - Human-readable diagnostic or process message.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ message => { if (message.type() === "error" || /hydration|mismatch/i.test(message.text())) errors.push(message.text()); });
  const path = surface === "react" ? "/react" : "/";
  try {
    await page.goto(`${origin}${path}?${new URLSearchParams({ surface, case: name, ...query })}`);
    if (hydrated) await page.waitForFunction(/**
     * Compute document.documentElement.dataset.hydrated === "true".
     * @responsibility computation
     * @returns {boolean} The result of the documented comparison or calculation.
     */ () => document.documentElement.dataset.hydrated === "true");
    return { page, errors, /**
     * Close the owned browser context and release its pages and network interception state.
     * @responsibility coordinator
     * @returns {unknown} The result returned by context.close.
     */ close: () => context.close() };
  } catch (error) { await context.close(); throw error; }
}

/**
 * Evaluate an independent DOM observation in the browser for SVG, warning and diagnostic assertions.
 * @responsibility coordinator
 * @param {unknown} page - Owned Playwright page.
 * @returns {Promise<unknown>} Resolves with the result returned by page.evaluate. Rejects when the awaited operation fails.
 */
export async function snapshot(page) {
  return page.evaluate(/**
   * Project svg, title, warning, diagnostics into the record required by page.evaluate.
   * @responsibility computation
   * @returns {Object} A record containing svg, title, warning, diagnostics.
   */ () => ({
    svg: document.querySelectorAll("#diagram svg").length,
    title: document.querySelector("#diagram svg title")?.textContent ?? null,
    warning: document.querySelector('#diagram [role="status"]')?.textContent ?? "",
    diagnostics: [...document.querySelectorAll('#diagram pre:not([role="status"])')].map(/**
     * Project element.textContent from the current record.
     * @responsibility computation
     * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
     * @returns {unknown} The element.textContent value selected or validated above.
     */ element => element.textContent)
  }));
}
