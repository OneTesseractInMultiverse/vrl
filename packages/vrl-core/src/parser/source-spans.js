/**
 * Return the span from the first token's start to the last token's end, or null for an empty list.
 * @responsibility computation
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function tokenRange(tokens) {
  return tokens.length === 0 ? null : { start: tokens[0].span.start, end: tokens.at(-1).span.end };
}

/**
 * Assemble declaration, keyword and per-attribute ranges from typed tokens.
 * @responsibility computation
 * @param {Object[]} tokens - Ordered typed lexemes with raw/decoded values and end-exclusive source spans.
 * @param {unknown} attributeSpans - Own-key attribute ranges already collected by parsing; defaults to {}.
 * @returns {Object} A record containing span, keywordSpan, attributeSpans.
 */
export function declarationSpans(tokens, attributeSpans = {}) {
  return { span: tokenRange(tokens), keywordSpan: tokens[0].span, attributeSpans };
}
