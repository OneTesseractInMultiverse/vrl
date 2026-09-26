import { codedDiagnostic } from "../domain/diagnostics.js";
import { lexVrlLine } from "./lexer.js";

/**
 * Lex legacy raw token strings, return lexical failures, then delegate typed attribute parsing.
 * @responsibility coordinator
 * @param {string[]} tokens - Raw token spellings joined and re-lexed by the compatibility API.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {Object} A record containing attributes, diagnostics.
 */
export function parseAttributeTokens(tokens, location) {
  const lexed = lexVrlLine(tokens.join(" "), location);
  if (lexed.diagnostics.length > 0) return { attributes: {}, diagnostics: lexed.diagnostics };
  const { attributes, diagnostics } = parseAttributes(lexed.tokens);
  return { attributes, diagnostics };
}

/**
 * Build own-key attributes and source spans, preserving first declarations and reporting each duplicate or
 * nonattribute token. First declarations win only in the recovery AST; every duplicate blocks compilation.
 * @responsibility computation
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @param {unknown} previousLocations - Read-only map of earlier attribute key spans for duplicate detection; defaults to new Map().
 * @returns {Object} A record containing attributes, diagnostics, keyLocations, attributeSpans.
 */

export function parseAttributes(tokens, previousLocations = new Map()) {
  const entries = [];
  const diagnostics = [];
  const keyLocations = new Map();
  const spans = [];
  tokens.forEach(/**
   * Accept one typed attribute and retain its first location, or append a located wrong-token/duplicate
   * diagnostic without replacing earlier values.
   * @responsibility computation
   * @param {unknown} token - Current typed lexeme or raw token text, according to the owning parser.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (token) => {
    if (token.kind !== "attribute") {
      diagnostics.push(codedDiagnostic("VRL_SYNTAX_EXPECTED_ATTRIBUTE", "syntax", "error", `Expected key=value attribute but found "${token.raw}"`,
        { location: token.span.start, span: token.span }, 'Write attributes such as height=35m or note="Main line".'));
      return;
    }
    const firstLocation = previousLocations.get(token.key) ?? keyLocations.get(token.key);
    if (firstLocation !== undefined) {
      diagnostics.push(codedDiagnostic("VRL_SYNTAX_DUPLICATE_ATTRIBUTE", "syntax", "error", `Attribute "${token.key}" is declared more than once.`, { location: token.keySpan.start, span: token.keySpan },
        "Keep a single value for this key; repeated keys are errors even when their values match.",
        [{ message: "First declaration of this key", location: firstLocation.start, span: firstLocation }]));
      return;
    }
    entries.push([token.key, token.value]);
    keyLocations.set(token.key, token.keySpan);
    spans.push([token.key, { span: token.span, keySpan: token.keySpan, valueSpan: token.valueSpan }]);
  });
  return { attributes: Object.fromEntries(entries), diagnostics, keyLocations, attributeSpans: Object.fromEntries(spans) };
}
