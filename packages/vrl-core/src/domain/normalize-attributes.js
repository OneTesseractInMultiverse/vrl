import { inspectAttributes } from "./attribute-contract.js";
import { attributeRelationshipProblems } from "./field-relationships.js";
import { fieldSpecification } from "./field-specifications.js";
import { parseFieldValue } from "./field-values.js";

/** Legacy token conversion only; strict route normalization uses inspectAttributes. */
export function normalizeAttributes(attributes) {
  return Object.fromEntries(
    Object.entries(attributes).map(([fieldName, value]) => [
      fieldName,
      normalizeKnownAttributeValue(fieldName, value)
    ])
  );
}

function normalizeKnownAttributeValue(fieldName, value) {
  const specification = fieldSpecification(fieldName);
  if (specification === null) return value;
  const parsed = parseFieldValue(specification, value);
  return parsed.ok ? parsed.value : value;
}

export function normalizeAttributeSet(attributes, scope) {
  const result = inspectAttributes(attributes, scope);
  if (result.problems.length > 0) throw new RangeError(`Invalid ${scope} field "${result.problems[0].name}" (${result.problems[0].kind}).`);
  const relationship = attributeRelationshipProblems(attributes, scope).find((problem) => problem.severity === "error");
  if (relationship !== undefined) throw new RangeError(`Invalid ${scope} field "${relationship.name}" (${relationship.kind}).`);
  return result;
}
