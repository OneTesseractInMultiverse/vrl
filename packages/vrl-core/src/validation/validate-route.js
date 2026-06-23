import { createDiagnostic } from "../domain/diagnostics.js";
import { isMeasurementField, parseMeasurementToken } from "../domain/measurements.js";

const ALLOWED_ANCHORS = new Set(["bolts", "natural", "tree", "thread", "removable", "fixed", "unknown", "mixed"]);
const ALLOWED_EXPOSURES = new Set(["low", "medium", "high"]);
const ALLOWED_POOL_TYPES = new Set(["deep", "shallow", "swimmer", "dry", "unknown"]);
const ALLOWED_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

export function validateRoute(ast) {
  const diagnostics = [];

  if (ast.name === null || ast.name === "") {
    diagnostics.push(
      createDiagnostic("validation", "error", "A route name is required.", { line: 1, column: 1 }, "Start with route \"Name\".")
    );
  }

  ast.elements.forEach((element) => {
    diagnostics.push(...validateElement(element));
  });

  return diagnostics;
}

export function validateElement(element) {
  const diagnostics = [];

  diagnostics.push(...validateMeasurements(element));

  if (element.type === "rappel") {
    diagnostics.push(...validateRappel(element));
  }

  if (element.type === "downclimb" && hasFieldValue(element, "exposure") && ALLOWED_EXPOSURES.has(element.attributes.exposure) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "exposure", "low, medium, or high"));
  }

  if (element.type === "pool" && hasFieldValue(element, "type") && ALLOWED_POOL_TYPES.has(element.attributes.type) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "type", "deep, shallow, swimmer, dry, or unknown"));
  }

  if (element.type === "hazard" && hasFieldValue(element, "severity") && ALLOWED_SEVERITIES.has(element.attributes.severity) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "severity", "low, medium, high, or critical"));
  }

  return diagnostics;
}

function validateMeasurements(element) {
  return Object.entries(element.attributes).flatMap(([fieldName, value]) => {
    if (isMeasurementField(fieldName) === false) {
      return [];
    }

    const parsed = parseMeasurementToken(value);

    if (parsed.ok === false) {
      return [
        createDiagnostic(
          "validation",
          "error",
          `Field "${fieldName}" must be a metric measurement.`,
          element.sourceLocation,
          parsed.reason
        )
      ];
    }

    if (parsed.value.meters <= 0) {
      return [
        createDiagnostic(
          "validation",
          "error",
          `Field "${fieldName}" must be greater than 0m.`,
          element.sourceLocation,
          "Use a positive metric value such as 35m."
        )
      ];
    }

    return [];
  });
}

function validateRappel(element) {
  const diagnostics = [];

  if (hasFieldValue(element, "height") === false) {
    diagnostics.push(missingFieldDiagnostic(element, "height"));
  }

  if (hasFieldValue(element, "rope") === false) {
    diagnostics.push(missingFieldDiagnostic(element, "rope"));
  }

  if (hasFieldValue(element, "anchor") && ALLOWED_ANCHORS.has(element.attributes.anchor) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "anchor", "bolts, natural, tree, thread, removable, fixed, unknown, or mixed"));
  }

  if (hasFieldValue(element, "height") && hasFieldValue(element, "rope")) {
    diagnostics.push(...validateRopeLength(element));
  }

  return diagnostics;
}

function validateRopeLength(element) {
  const height = parseMeasurementToken(element.attributes.height);
  const rope = parseMeasurementToken(element.attributes.rope);

  if (height.ok && rope.ok && rope.value.meters < height.value.meters) {
    return [
      createDiagnostic(
        "validation",
        "warning",
        "Rope length is shorter than rappel height.",
        element.sourceLocation,
        "Check route rigging assumptions before publishing."
      )
    ];
  }

  return [];
}

function hasFieldValue(element, fieldName) {
  return Object.hasOwn(element.attributes, fieldName) && element.attributes[fieldName] !== "";
}

function missingFieldDiagnostic(element, fieldName) {
  return createDiagnostic(
    "validation",
    "error",
    `Rappel requires "${fieldName}".`,
    element.sourceLocation,
    `Add ${fieldName}=35m or another positive metric value.`
  );
}

function invalidValueDiagnostic(element, fieldName, expected) {
  return createDiagnostic(
    "validation",
    "error",
    `Field "${fieldName}" has unsupported value "${element.attributes[fieldName]}".`,
    element.sourceLocation,
    `Expected ${expected}.`
  );
}
