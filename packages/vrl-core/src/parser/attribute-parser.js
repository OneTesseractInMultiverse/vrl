import { createDiagnostic } from "../domain/diagnostics.js";
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
  tokens.forEach((token) => {
    if (token.kind !== "attribute") {
      diagnostics.push(createDiagnostic("syntax", "error", `Expected key=value attribute but found "${token.raw}"`,
        token.span.start, 'Write attributes such as height=35m or note="Main line".'));
      return;
    }
    const firstLocation = previousLocations.get(token.key) ?? keyLocations.get(token.key);
    if (firstLocation !== undefined) {
      diagnostics.push(createDiagnostic("syntax", "error", `Attribute "${token.key}" is declared more than once.`, token.keySpan.start,
        "Keep a single value for this key; repeated keys are errors even when their values match.",
        [{ message: "First declaration of this key", location: firstLocation }]));
      return;
    }
    entries.push([token.key, token.value]);
    keyLocations.set(token.key, token.keySpan.start);
  });
  return { attributes: Object.fromEntries(entries), diagnostics, keyLocations };
}
