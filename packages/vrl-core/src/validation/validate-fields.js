import { declarationReference, fieldReference } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { inspectAttributes } from "../domain/attribute-contract.js";

/**
 * Assess fields using the shared domain contract and translate all problems into source-located diagnostics.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @param {unknown} subject - Human-readable field subject used in validation messages; defaults to "Field".
 * @returns {Array} Located required, syntax and value diagnostics from the shared field contract.
 */
export function validateFields(element, scope, subject = "Field") {
  return inspectAttributes(element.attributes, scope).problems.map(/**
   * Apply fieldDiagnostic to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} problem - Classified domain or budget problem to translate.
   * @returns {unknown} The result returned by fieldDiagnostic.
   */ (problem) => fieldDiagnostic(element, subject, problem));
}

/**
 * Select the required, syntax or value diagnostic for a classified domain field problem.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} subject - Human-readable field subject used in validation messages.
 * @param {Object} input3 - Input record destructured into the separately documented members below.
 * @param {unknown} input3.kind - Discriminator selecting the supported record or diagnostic category.
 * @param {unknown} input3.name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @param {Object} input3.specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {unknown} input3.reason - Token parser explanation retained in a syntax diagnostic.
 * @param {unknown} input3.problem - Classified domain or budget problem to translate.
 * @returns {unknown} The result returned by missingFieldDiagnostic. The selected result, including the documented absent-value fallback.
 */
function fieldDiagnostic(element, subject, { kind, name, specification, reason, problem }) {
  if (kind === "required") return missingFieldDiagnostic(element, name);
  return kind === "syntax" ? syntaxDiagnostic(element, subject, name, specification, reason) : valueDiagnostic(element, subject, name, specification, problem);
}

/**
 * Describe an unparseable known field using its parser-specific grammar and supplied source reason.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} subject - Human-readable field subject used in validation messages.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {unknown} reason - Token parser explanation retained in a syntax diagnostic.
 * @returns {unknown} The result returned by diagnostic. The result returned by unsupportedValueDiagnostic.
 */
function syntaxDiagnostic(element, subject, name, specification, reason) {
  switch (specification.parser) {
    case "measurement": return diagnostic(element, name, "VRL_FIELD_MEASUREMENT_SYNTAX", `${subject} "${name}" must be a metric ${specification.range.minimum < 0 ? "elevation" : "measurement"}.`, reason);
    case "inclination": return diagnostic(element, name, "VRL_FIELD_INCLINATION_SYNTAX", 'Field "inclination" must be a percentage.', reason);
    case "redirections": return diagnostic(element, name, "VRL_FIELD_REDIRECTIONS_SYNTAX", `Field "${name}" must list metric redirection anchors.`, reason);
    case "stages": return diagnostic(element, name, "VRL_FIELD_STAGES_SYNTAX", 'Field "stages" must list at least two metric lengths.', reason);
    default: return unsupportedValueDiagnostic(element, name, expectedValue(specification));
  }
}

/**
 * Describe a parsed field value that violates its supported range or vocabulary.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} subject - Human-readable field subject used in validation messages.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {unknown} problem - Classified domain or budget problem to translate.
 * @returns {unknown} The result returned by diagnostic. The result returned by unsupportedValueDiagnostic.
 */
function valueDiagnostic(element, subject, name, specification, problem) {
  if (specification.parser === "measurement") {
    return diagnostic(element, name, "VRL_FIELD_MEASUREMENT_RANGE", `${subject} "${name}" must be greater than 0m.`, "Use a positive metric value such as 35m.");
  }
  if (specification.parser === "inclination") {
    return diagnostic(element, name, "VRL_FIELD_INCLINATION_RANGE", 'Field "inclination" must be greater than 0% and at most 100%.', "Use an inclination such as 75%.");
  }
  return unsupportedValueDiagnostic(element, name, problemExpectation(specification, problem));
}

/**
 * Format the allowed stage, distance or side constraint for a field-value problem.
 * @responsibility computation
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {unknown} problem - Classified domain or budget problem to translate.
 * @returns {unknown} The literal "positive metric stage lengths" for this branch. The literal "positive metric distances inside the rappel" for this branch. The result of the documented comparison or calculation. The result returned by expectedValue.
 */
function problemExpectation(specification, problem) {
  switch (problem) {
    case "stage": return "positive metric stage lengths";
    case "distance": return "positive metric distances inside the rappel";
    case "side": return "sides " + enumeration(specification.values);
    default: return expectedValue(specification);
  }
}

/**
 * Describe the allowed integer magnitude or enumerated vocabulary from the field specification.
 * @responsibility computation
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function expectedValue(specification) {
  return specification.parser === "integerText"
    ? `a positive safe integer no greater than ${specification.range.maximum}`
    : enumeration(specification.values);
}

/**
 * Format a supported vocabulary as comma-separated alternatives for a diagnostic suggestion.
 * @responsibility computation
 * @param {Array} values - Ordered values or supplied component props consumed by this operation.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function enumeration(values) {
  return values.slice(0, -1).join(", ") + ", or " + values.at(-1);
}

/**
 * Report the supplied field text and its expected value contract at the attribute's source range.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @param {unknown} expected - Independently specified expected result or classification.
 * @returns {unknown} The result returned by diagnostic.
 */
function unsupportedValueDiagnostic(element, name, expected) {
  return diagnostic(element, name, "VRL_FIELD_UNSUPPORTED_VALUE", `Field "${name}" has unsupported value "${element.attributes[name]}".`, `Expected ${expected}.`);
}

/**
 * Report a missing required element field at the declaration with a concrete metric-value suggestion.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @returns {unknown} The result returned by codedDiagnostic.
 */
function missingFieldDiagnostic(element, name) {
  const label = element.type[0].toUpperCase() + element.type.slice(1);
  return codedDiagnostic("VRL_FIELD_REQUIRED", "validation", "error", `${label} requires "${name}".`, declarationReference(element.source, element.sourceLocation), `Add ${name}=35m or another positive metric value.`);
}

/**
 * Construct a coded field-validation error using the attribute range or declaration fallback.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @param {string} code - Stable diagnostic code or selected symbol code owned by this record.
 * @param {string} message - Human-readable explanation retained in the diagnostic.
 * @param {string} suggestion - Actionable correction text retained in the diagnostic.
 * @returns {unknown} The result returned by codedDiagnostic.
 */
function diagnostic(element, name, code, message, suggestion) {
  return codedDiagnostic(code, "validation", "error", message, fieldReference(element.source, name, element.sourceLocation), suggestion);
}
