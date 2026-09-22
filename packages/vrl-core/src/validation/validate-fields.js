import { createDiagnostic } from "../domain/diagnostics.js";
import { applicableFieldSpecification, requiredFields } from "../domain/field-specifications.js";
import { fieldValueProblems, parseFieldValue } from "../domain/field-values.js";

export function validateFields(element, scope, subject = "Field") {
  return [
    ...Object.entries(element.attributes).flatMap(([name, raw]) => validateField(element, scope, subject, name, raw)),
    ...requiredFields(scope).filter((name) => !hasFieldValue(element, name)).map((name) => missingFieldDiagnostic(element, name))
  ];
}

function validateField(element, scope, subject, name, raw) {
  const specification = applicableFieldSpecification(name, scope);
  if (specification === null) return [];
  const parsed = parseFieldValue(specification, raw);
  if (!parsed.ok) return [syntaxDiagnostic(element, subject, name, specification, parsed.reason)];
  return fieldValueProblems(specification, parsed.value).map((problem) => valueDiagnostic(element, subject, name, specification, problem));
}

function syntaxDiagnostic(element, subject, name, specification, reason) {
  switch (specification.parser) {
    case "measurement": return diagnostic(element, `${subject} "${name}" must be a metric ${specification.range.minimum < 0 ? "elevation" : "measurement"}.`, reason);
    case "inclination": return diagnostic(element, 'Field "inclination" must be a percentage.', reason);
    case "redirections": return diagnostic(element, `Field "${name}" must list metric redirection anchors.`, reason);
    case "stages": return diagnostic(element, 'Field "stages" must list at least two metric lengths.', reason);
    default: return unsupportedValueDiagnostic(element, name, expectedValue(specification));
  }
}

function valueDiagnostic(element, subject, name, specification, problem) {
  if (specification.parser === "measurement") {
    return diagnostic(element, `${subject} "${name}" must be greater than 0m.`, "Use a positive metric value such as 35m.");
  }
  if (specification.parser === "inclination") {
    return diagnostic(element, 'Field "inclination" must be greater than 0% and at most 100%.', "Use an inclination such as 75%.");
  }
  return unsupportedValueDiagnostic(element, name, problemExpectation(specification, problem));
}

function problemExpectation(specification, problem) {
  switch (problem) {
    case "stage": return "positive metric stage lengths";
    case "distance": return "positive metric distances inside the rappel";
    case "side": return "sides " + enumeration(specification.values);
    default: return expectedValue(specification);
  }
}

function expectedValue(specification) {
  return specification.parser === "integerText"
    ? `a positive safe integer no greater than ${specification.range.maximum}`
    : enumeration(specification.values);
}

function enumeration(values) {
  return values.slice(0, -1).join(", ") + ", or " + values.at(-1);
}

function unsupportedValueDiagnostic(element, name, expected) {
  return diagnostic(element, `Field "${name}" has unsupported value "${element.attributes[name]}".`, `Expected ${expected}.`);
}

function missingFieldDiagnostic(element, name) {
  const label = element.type[0].toUpperCase() + element.type.slice(1);
  return diagnostic(element, `${label} requires "${name}".`, `Add ${name}=35m or another positive metric value.`);
}

function diagnostic(element, message, suggestion) {
  return createDiagnostic("validation", "error", message, element.sourceLocation, suggestion);
}

export function hasFieldValue(element, name) {
  return Object.hasOwn(element.attributes, name) && element.attributes[name] !== "";
}
