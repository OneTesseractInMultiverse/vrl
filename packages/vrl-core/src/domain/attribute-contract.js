import { applicableFieldSpecification, requiredFields } from "./field-specifications.js";
import { fieldValueProblems, parseFieldValue } from "./field-values.js";

/**
 * Assess field applicability, conversion, ranges and requiredness through shared domain policies; collect
 * typed fields, string extensions and problems. One assessment owns conversion, applicability, ranges, and
 * required-field problems.
 * @responsibility coordinator
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @returns {Object} A record containing fields, extensions, problems.
 */

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

/**
 * Recognize an own attribute whose text is not empty; inherited values never satisfy requiredness.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function hasAttributeValue(attributes, name) {
  return Object.hasOwn(attributes, name) && attributes[name] !== "";
}
