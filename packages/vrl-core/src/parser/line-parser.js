import { isElementType } from "../domain/element-types.js";
import { appendDiagnostics, limitDiagnostic, codedDiagnostic } from "../domain/diagnostics.js";
import { createEmptyRoute, createRouteElement } from "../application/route-ast.js";
import { lexVrlLine } from "./lexer.js";
import { declarationSpans, tokenRange } from "./source-spans.js";
import { parseAttributes } from "./attribute-parser.js";
import { advanceDocumentOrder, initialDocumentOrder } from "./document-order.js";
import { limitProblem, listLimitProblem, resolveProcessingLimits, sourceLimitProblem } from "../domain/processing-limits.js";

export { lexVrlLine, stripComment, tokenize } from "./lexer.js";
export { parseAttributeTokens } from "./attribute-parser.js";

/**
 * Resolve budgets and coordinate incremental line parsing into a recovery AST plus ordered diagnostics;
 * source/configuration type errors propagate.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @returns {Object} Recovery AST and ordered diagnostics; syntax or budget failures remain data for the compiler coordinator.
 */
export function parseVrl(source, options = {}) {
  const limits = resolveProcessingLimits(options.limits);
  const problem = sourceLimitProblem(source, limits);
  if (problem !== null) return { ast: createEmptyRoute(source), diagnostics: [limitDiagnostic(problem)] };
  const context = { ast: createEmptyRoute(source), diagnostics: [], order: initialDocumentOrder(), metadataKeys: new Map(), limits, stopped: false };
  parseDocumentLines(context, source);
  return { ast: context.ast, diagnostics: context.diagnostics };
}

/**
 * Dispatch physical lines in order, honoring CRLF and stopping immediately when a processing limit is reached.
 * @responsibility coordinator
 * @param {Object} context - Mutable per-parse AST, diagnostics, order state, duplicate-key map and processing budgets.
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function parseDocumentLines(context, source) {
  let start = 0;
  let line = 1;
  while (start <= source.length) {
    const newline = source.indexOf("\n", start);
    const end = newline === -1 ? source.length : newline;
    const contentEnd = newline !== -1 && source[end - 1] === "\r" ? end - 1 : end;
    parseDocumentLine(context, source.slice(start, contentEnd), line);
    if (context.stopped || newline === -1) return;
    start = newline + 1;
    line += 1;
  }
}

/**
 * Coordinate lexing, statement recognition, order checks, limits and statement dispatch while updating the
 * per-parse context.
 * @responsibility coordinator
 * @param {Object} context - Mutable per-parse AST, diagnostics, order state, duplicate-key map and processing budgets.
 * @param {string} rawLine - Physical source line before lexical decoding.
 * @param {number} line - One-based physical source line number.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function parseDocumentLine(context, rawLine, line) {
  const lexed = lexVrlLine(rawLine, { line, column: 1 });
  appendDiagnostics(context.diagnostics, lexed.diagnostics);
  if (lexed.diagnostics.length > 0) return;
  const tokens = statementTokens(lexed.tokens);
  if (tokens.length === 0) return;
  const keyword = tokens[0].raw;
  const location = tokens[0].span.start;
  if (keyword !== "route" && keyword !== "metadata" && !isElementType(keyword)) {
    context.diagnostics.push(codedDiagnostic("VRL_SYNTAX_UNKNOWN_STATEMENT", "syntax", "error", `Unknown VRL statement "${keyword}"`, { location, span: tokens[0].span },
      "Use route, metadata, start, exit, walk, swim, rappel, downclimb, climb, pool, hazard, or note."));
    return;
  }
  const ordered = advanceDocumentOrder(context.order, keyword, location, tokens[0].span);
  context.order = ordered.state;
  appendDiagnostics(context.diagnostics, ordered.diagnostics);
  if (ordered.diagnostics.length > 0) return;
  const problem = statementLimitProblem(context, keyword, tokens, location);
  if (problem !== null) {
    context.diagnostics.push(limitDiagnostic(problem));
    context.stopped = true;
    return;
  }
  parseStatement(context, keyword, tokens, location);
}

/**
 * Check element count and known list budgets before a statement is retained in the AST.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {Object} input1.ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {unknown} input1.limits - Resolved immutable positive processing budgets for this invocation.
 * @param {string} keyword - Recognized VRL statement keyword.
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {unknown} The result returned by limitProblem. Null when no matching value or problem exists. The problem value selected or validated above.
 */
function statementLimitProblem({ ast, limits }, keyword, tokens, location) {
  if (isElementType(keyword) && ast.elements.length >= limits.maxElements) return limitProblem("maxElements", limits, location);
  if (keyword === "route" || keyword === "note") return null;
  for (const token of tokens) {
    if (token.kind !== "attribute") continue;
    const problem = listLimitProblem(token.key, token.value, limits, token.valueSpan.start);
    if (problem !== null) return problem;
  }
  return null;
}

/**
 * Dispatch a recognized statement to route, metadata or element parsing and append accepted element/source
 * records.
 * @responsibility coordinator
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {Object} input1.ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {Array} input1.diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @param {unknown} input1.metadataKeys - Per-parse map of first metadata declarations; updated after accepted attributes.
 * @param {string} keyword - Recognized VRL statement keyword.
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function parseStatement({ ast, diagnostics, metadataKeys }, keyword, tokens, location) {
  if (keyword === "route") {
    parseRouteLine(ast, tokens, diagnostics, location);
  } else if (keyword === "metadata") {
    parseMetadataLine(ast, tokens, diagnostics, metadataKeys);
  } else {
    const parsed = parseElementLine(keyword, tokens, diagnostics, location);
    ast.elements.push(parsed.element);
    ast.sourceMap.elements.push(parsed.source);
  }
}

/**
 * Remove supported cosmetic braces without changing ordinary statement tokens.
 * @responsibility computation
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @returns {unknown} The result returned by tokens.slice. The ordered records or values assembled above. The tokens value selected or validated above.
 */
function statementTokens(tokens) {
  const last = tokens.at(-1);
  if (last?.kind === "bare" && last.value === "{") return tokens.slice(0, -1);
  if (tokens.length === 1 && last.kind === "bare" && last.value === "}") return [];
  return tokens;
}

/**
 * Record the header's source spans and decoded name, or append a missing-name diagnostic to the caller-owned
 * list.
 * @responsibility computation
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @param {Array} diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function parseRouteLine(ast, tokens, diagnostics, location) {
  ast.sourceMap.route = { ...declarationSpans(tokens), nameSpan: tokenRange(tokens.slice(1)) };
  if (tokens.length < 2) {
    diagnostics.push(
      codedDiagnostic("VRL_SYNTAX_MISSING_ROUTE_NAME", "syntax", "error", "Route statement requires a route name.", { location, span: tokenRange(tokens) }, "Use route \"Route Name\".")
    );
    return;
  }

  ast.name = textOf(tokens.slice(1));
}

/**
 * Parse attributes, merge own metadata properties, record spans and update document-scoped duplicate
 * locations.
 * @responsibility coordinator
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @param {Array} diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @param {unknown} metadataKeys - Per-parse map of first metadata declarations; updated after accepted attributes.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function parseMetadataLine(ast, tokens, diagnostics, metadataKeys) {
  const parsed = parseAttributes(tokens.slice(1), metadataKeys);
  ast.sourceMap.metadata.push(declarationSpans(tokens, parsed.attributeSpans));
  // Define own properties so keys such as __proto__ remain ordinary source data.
  Object.defineProperties(ast.metadata, Object.getOwnPropertyDescriptors(parsed.attributes));
  parsed.keyLocations.forEach(/**
   * Apply metadataKeys.set to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
   * @param {unknown} key - Own-property key, metadata key or configured loader result key.
   * @returns {unknown} The result returned by metadataKeys.set.
   */ (location, key) => metadataKeys.set(key, location));
  appendDiagnostics(diagnostics, parsed.diagnostics);
}

/**
 * Separate labels from attributes, delegate attribute parsing and construct the element plus its declaration
 * spans.
 * @responsibility coordinator
 * @param {string} keyword - Recognized VRL statement keyword.
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @param {Array} diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {Object} A record containing element, source.
 */
function parseElementLine(keyword, tokens, diagnostics, location) {
  if (keyword === "note") {
    return { element: createRouteElement("note", { text: textOf(tokens.slice(1)) }, location), source: { ...declarationSpans(tokens), textSpan: tokenRange(tokens.slice(1)) } };
  }

  const payload = tokens.slice(1);
  const firstAttributeIndex = payload.findIndex(/**
   * Evaluate the selection condition token.kind === "attribute".
   * @responsibility computation
   * @param {unknown} token - Current typed lexeme or raw token text, according to the owning parser.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (token) => token.kind === "attribute");
  const labelTokens = firstAttributeIndex === -1 ? payload : payload.slice(0, firstAttributeIndex);
  const attributeTokens = firstAttributeIndex === -1 ? [] : payload.slice(firstAttributeIndex);
  const parsed = parseAttributes(attributeTokens);
  appendDiagnostics(diagnostics, parsed.diagnostics);

  const element = createRouteElement(
    keyword,
    parsed.attributes,
    location,
    elementIdFor(keyword, labelTokens),
    elementLabelFor(keyword, labelTokens)
  );
  return { element, source: { ...declarationSpans(tokens, parsed.attributeSpans), idSpan: element.id === null ? null : tokenRange(labelTokens), labelSpan: element.label === null ? null : tokenRange(labelTokens) } };
}

/**
 * Interpret pre-attribute text as an explicit ID except on start and exit declarations.
 * @responsibility computation
 * @param {string} keyword - Recognized VRL statement keyword.
 * @param {Array} labelTokens - Tokens preceding the first attribute, interpreted as an ID or boundary label.
 * @returns {unknown} Null when no matching value or problem exists. The result returned by textOf.
 */
function elementIdFor(keyword, labelTokens) {
  if (labelTokens.length === 0) {
    return null;
  }

  if (keyword === "start" || keyword === "exit") {
    return null;
  }

  return textOf(labelTokens);
}

/**
 * Interpret pre-attribute text as a label only on start and exit declarations.
 * @responsibility computation
 * @param {string} keyword - Recognized VRL statement keyword.
 * @param {Array} labelTokens - Tokens preceding the first attribute, interpreted as an ID or boundary label.
 * @returns {unknown} Null when no matching value or problem exists. The result returned by textOf.
 */
function elementLabelFor(keyword, labelTokens) {
  if (labelTokens.length === 0) {
    return null;
  }

  if (keyword === "start" || keyword === "exit") {
    return textOf(labelTokens);
  }

  return null;
}

/**
 * Join decoded text tokens while preserving assignment tokens' original spelling.
 * @responsibility computation
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @returns {string} The result returned by tokens.map((token) => token.kind === "attribute" ? token.raw : token.value).join.
 */
function textOf(tokens) {
  return tokens.map(/**
   * Keep assignment tokens raw and use decoded values for other text tokens.
   * @responsibility computation
   * @param {unknown} token - Current typed lexeme or raw token text, according to the owning parser.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (token) => token.kind === "attribute" ? token.raw : token.value).join(" ");
}
