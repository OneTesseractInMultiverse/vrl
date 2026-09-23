import { codedDiagnostic } from "../domain/diagnostics.js";
import { lexVrlLine } from "./lexer.js";

export function parseAttributeTokens(tokens, location) {
  const lexed = lexVrlLine(tokens.join(" "), location);
  if (lexed.diagnostics.length > 0) return { attributes: {}, diagnostics: lexed.diagnostics };
  const { attributes, diagnostics } = parseAttributes(lexed.tokens);
  return { attributes, diagnostics };
}

/** First declarations win only in the recovery AST; every duplicate blocks compilation. */
export function parseAttributes(tokens, previousLocations = new Map()) {
  const entries = [];
  const diagnostics = [];
  const keyLocations = new Map();
  const spans = [];
  tokens.forEach((token) => {
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
