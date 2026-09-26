import React from "react";
import { hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { View } from "./react-view.js";

let props = JSON.parse(document.getElementById("props").textContent);
/**
 * Render the React consumer view and signal completed hydration through a mounted effect.
 * @responsibility coordinator
 * @param {Array} values - Ordered values or supplied component props consumed by this operation.
 * @returns {unknown} The result returned by React.createElement.
 */
function App(values) {
  React.useEffect(/**
   * Mark the document hydrated after React mounts so browser assertions wait for completed client attachment.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => { document.documentElement.dataset.hydrated = "true"; }, []);
  return React.createElement(View, values);
}
const root = hydrateRoot(document.getElementById("diagram"), React.createElement(App, props), { /**
 * Surface a React hydration recovery error so the consumer test cannot silently accept mismatches.
 * @responsibility coordinator
 * @param {unknown} error - Failure propagated by the observed operation.
 * @returns {never} Does not return normally; throws the failure being checked.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */ onRecoverableError: error => { throw error; } });
window.fixture = { /**
 * Apply requested consumer prop updates and wait for the framework's rendered state to become observable.
 * @responsibility coordinator
 * @param {unknown} next - Deterministic random generator or explicit update record, as required by this helper.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ update(next) { props = { ...props, ...next }; flushSync(/**
 * Apply root.render to the supplied arguments; retain the callee's return and failure behavior.
 * @responsibility coordinator
 * @returns {unknown} The result returned by root.render.
 */ () => root.render(React.createElement(App, props))); } };
