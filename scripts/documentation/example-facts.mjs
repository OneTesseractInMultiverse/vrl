import { createHash } from "node:crypto";

export function sourceFingerprint(source) {
  return createHash("sha256").update(source).digest("hex");
}

export function exampleSource(example, contract) {
  return (example.kind === "fragment" ? contract.prefix : "") + example.source + (contract.suffix ?? "");
}

export function pointerValue(value, pointer) {
  if (!pointer.startsWith("/")) throw new Error(`Expected JSON pointer: ${pointer}`);
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) throw new Error(`Missing documented fact: ${pointer}`);
    value = value[key];
  }
  return value;
}

/** Observe public results without recomputing domain or layout rules. */
export function exampleFacts(result, pointers) {
  return {
    ok: result.ok,
    diagnostics: result.diagnostics.map(({ kind, severity, code, location }) => [kind, severity, code, location.line, location.column]),
    outputs: [result.model !== null, result.layout !== null, result.json !== null],
    facts: Object.fromEntries(pointers.map(pointer => [pointer, pointerValue(result, pointer)])),
    geometry: result.layout === null ? null : {
      points: result.layout.points.map(point => point.id),
      technical: result.layout.segments.filter(segment => segment.kind === "technical").map(segment => [segment.element.id, segment.direction, segment.verticalDeltaMeters]),
      annotations: result.model.traversal.annotations.map(({ elementIndex, pointIndex }) => [result.model.elements[elementIndex].id, pointIndex]),
      endpoints: [result.layout.points[0]?.elevationMeters ?? null, result.layout.points.at(-1)?.elevationMeters ?? null]
    }
  };
}
