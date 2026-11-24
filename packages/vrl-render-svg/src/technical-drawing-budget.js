import { rappelStagesForElement, redirectionsForElement } from "./presentation.js";

/**
 * Count technical annotation primitives across positioned segments before either scene builder allocates them.
 * A stage has a label and all but the last have a boundary. A redirection has a marker and a label.
 * @responsibility computation
 * @param {Object[]} segments - Positioned route segments, each carrying its drawing owner or null for a connection.
 * @param {number} maximum - Inclusive document budget in primitives, defaulting to 8192.
 * @returns {void} Returns when all technical annotations fit.
 * @throws {RangeError} The route would exceed the aggregate annotation budget.
 */
export function requireTechnicalDrawingBudget(segments, maximum = 8192) {
  let primitives = 0;
  for (const { element } of segments) {
    if (element === null) continue;
    const stages = rappelStagesForElement(element).length;
    primitives += stages + Math.max(0, stages - 1) + 2 * redirectionsForElement(element).length;
    if (primitives > maximum) throw new RangeError(`Technical annotations exceed the drawing budget of ${maximum} primitives.`);
  }
}
