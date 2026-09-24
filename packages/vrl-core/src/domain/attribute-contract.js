import { applicableFieldSpecification, requiredFields } from "./field-specifications.js";
import { fieldValueProblems, parseFieldValue } from "./field-values.js";

/** One assessment owns conversion, applicability, ranges, and required-field problems. */
export function inspectAttributes(attributes, scope) {
  const fields = [];
  const extensions = [];
  const problems = [];
  for (const [name, raw] of Object.entries(attributes)) {
    const specification = applicableFieldSpecification(name, scope);
    if (specification === null) {
      extensions.push([name, raw]);
      continue;
    }
    const parsed = parseFieldValue(specification, raw);
    if (!parsed.ok) problems.push({ kind: "syntax", name, specification, reason: parsed.reason });
    else {
      fields.push([name, parsed.value]);
      for (const problem of fieldValueProblems(specification, parsed.value)) problems.push({ kind: "value", name, specification, problem });
    }
  }
  for (const name of requiredFields(scope)) {
    if (!hasAttributeValue(attributes, name)) problems.push({ kind: "required", name });
  }
  return { fields: Object.fromEntries(fields), extensions: Object.fromEntries(extensions), problems };
}

export function hasAttributeValue(attributes, name) {
  return Object.hasOwn(attributes, name) && attributes[name] !== "";
}
