import { describeRoute } from "./route-description.js";
import { resolveSvgIdentifiers } from "./svg-identifiers.js";
import { serializeRouteText } from "./route-text-serializer.js";

/**
 * Prepare and encode a visible HTML alternative from normalized route facts and a caller-owned namespace.
 * @responsibility coordinator
 * @param {Object} route - Valid normalized route or compatible view, never modified.
 * @param {Object} options - Language/locale and document-unique idPrefix; defaults to an empty record.
 * @returns {string} Escaped HTML section with native ordered facts; suitable as an external image's adjacent description.
 * @throws {TypeError|RangeError} Description options, XML characters or namespace violate their shared contracts.
 */
export function renderRouteText(route, options = {}) {
  const description = describeRoute(route, options);
  return serializeRouteText(description, resolveSvgIdentifiers(options.idPrefix).text);
}
