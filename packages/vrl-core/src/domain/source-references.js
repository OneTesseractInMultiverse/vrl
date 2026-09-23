/** Syntax provenance is optional; legacy/programmatic data keeps point locations. */
export function sourceReference(span, fallback = { line: 1, column: 1 }) {
  return { location: span?.start ?? fallback, ...(span == null ? {} : { span }) };
}

export function declarationReference(source, fallback) {
  return sourceReference(source?.span, fallback);
}

export function fieldReference(source, name, fallback) {
  const attributes = source?.attributeSpans;
  const span = attributes && Object.hasOwn(attributes, name) ? attributes[name].valueSpan : undefined;
  return sourceReference(span ?? source?.span, fallback);
}

export function identifierReference(source, fallback) {
  return sourceReference(source?.idSpan ?? source?.span, fallback);
}

export function metadataSource(sourceMap) {
  const declarations = sourceMap?.metadata ?? [];
  return { span: declarations[0]?.span, attributeSpans: Object.fromEntries(declarations.flatMap((declaration) => Object.entries(declaration.attributeSpans ?? {}))) };
}
