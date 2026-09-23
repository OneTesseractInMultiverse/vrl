export function tokenRange(tokens) {
  return tokens.length === 0 ? null : { start: tokens[0].span.start, end: tokens.at(-1).span.end };
}

export function declarationSpans(tokens, attributeSpans = {}) {
  return { span: tokenRange(tokens), keywordSpan: tokens[0].span, attributeSpans };
}
