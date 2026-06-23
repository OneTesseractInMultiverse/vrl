import { createDiagnostic } from "../domain/diagnostics.js";
import { parseInclinationToken } from "../domain/inclinations.js";
import { isMeasurementField, parseMeasurementToken } from "../domain/measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "../domain/rappel-details.js";

const ALLOWED_ANCHORS = new Set(["bolts", "natural", "tree", "thread", "removable", "fixed", "unknown", "mixed"]);
const ALLOWED_DESCENT_SHAPES = new Set(["ladder", "direct", "slab"]);
const ALLOWED_EXPOSURES = new Set(["low", "medium", "high"]);
const ALLOWED_FLOWS = new Set(["dry", "low", "medium", "high"]);
const ALLOWED_LANDINGS = new Set(["pool", "ledge", "dry", "chaos", "gallery", "trail", "unknown"]);
const ALLOWED_POOL_TYPES = new Set(["deep", "shallow", "swimmer", "dry", "unknown"]);
const ALLOWED_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const ALLOWED_REDIRECTION_SIDES = new Set(["left", "right", "center", "unknown"]);
const ALLOWED_STATIONS = new Set(["left", "right", "center", "floor", "tree", "natural", "unknown"]);
const ELEVATION_FIELDS = new Set(["entrance_elevation", "exit_elevation"]);

export function validateRoute(ast) {
  const diagnostics = [];

  if (ast.name === null || ast.name === "") {
    diagnostics.push(
      createDiagnostic("validation", "error", "A route name is required.", { line: 1, column: 1 }, "Start with route \"Name\".")
    );
  }

  diagnostics.push(...validateMetadata(ast.metadata));

  ast.elements.forEach((element) => {
    diagnostics.push(...validateElement(element));
  });

  return diagnostics;
}

function validateMetadata(metadata) {
  return Object.entries(metadata).flatMap(([fieldName, value]) => {
    if (ELEVATION_FIELDS.has(fieldName) === false) {
      return [];
    }

    const parsed = parseMeasurementToken(value);
    if (parsed.ok) {
      return [];
    }

    return [
      createDiagnostic(
        "validation",
        "error",
        `Metadata field "${fieldName}" must be a metric elevation.`,
        { line: 1, column: 1 },
        parsed.reason
      )
    ];
  });
}

export function validateElement(element) {
  const diagnostics = [];

  diagnostics.push(...validateMeasurements(element));

  if (element.type === "rappel") {
    diagnostics.push(...validateRappel(element));
  }

  if (element.type === "climb") {
    diagnostics.push(...validateClimb(element));
  }

  if (isTechnicalSlope(element)) {
    diagnostics.push(...validateTechnicalSlopeDetails(element));
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

  if (hasFieldValue(element, "flow") && ALLOWED_FLOWS.has(element.attributes.flow) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "flow", "dry, low, medium, or high"));
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

  if (hasFieldValue(element, "redirection") || hasFieldValue(element, "redirections")) {
    diagnostics.push(...validateRedirections(element));
  }

  if (hasFieldValue(element, "stages")) {
    diagnostics.push(...validateRappelStages(element));
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

function validateClimb(element) {
  if (hasFieldValue(element, "height")) {
    return [];
  }

  return [missingFieldDiagnostic(element, "height", "Climb")];
}

function validateRedirections(element) {
  const fieldName = hasFieldValue(element, "redirections") ? "redirections" : "redirection";
  const parsed = parseRedirectionsToken(element.attributes[fieldName]);

  if (parsed.ok === false) {
    return [
      createDiagnostic(
        "validation",
        "error",
        `Field "${fieldName}" must list metric redirection anchors.`,
        element.sourceLocation,
        parsed.reason
      )
    ];
  }

  const diagnostics = parsed.value.flatMap((redirection) => {
    if (redirection.distance.meters <= 0) {
      return [invalidValueDiagnostic(element, fieldName, "positive metric distances inside the rappel")];
    }

    if (ALLOWED_REDIRECTION_SIDES.has(redirection.side) === false) {
      return [invalidValueDiagnostic(element, fieldName, "sides left, right, center, or unknown")];
    }

    return [];
  });

  if (hasFieldValue(element, "height")) {
    diagnostics.push(...validateRedirectionDistances(element, parsed.value));
  }

  return diagnostics;
}

function validateRedirectionDistances(element, redirections) {
  const height = parseMeasurementToken(element.attributes.height);

  if (height.ok === false) {
    return [];
  }

  return redirections
    .filter((redirection) => redirection.distance.meters >= height.value.meters)
    .map(() => createDiagnostic(
      "validation",
      "error",
      'Field "redirections" must be inside the rappel height.',
      element.sourceLocation,
      "Use distances greater than 0m and shorter than the rappel height."
    ));
}

function validateRappelStages(element) {
  const parsed = parseRappelStagesToken(element.attributes.stages);

  if (parsed.ok === false) {
    return [
      createDiagnostic(
        "validation",
        "error",
        'Field "stages" must list at least two metric lengths.',
        element.sourceLocation,
        parsed.reason
      )
    ];
  }

  const diagnostics = parsed.value
    .filter((stage) => stage.meters <= 0)
    .map(() => invalidValueDiagnostic(element, "stages", "positive metric stage lengths"));

  if (hasFieldValue(element, "height")) {
    diagnostics.push(...validateStageSum(element, parsed.value));
  }

  return diagnostics;
}

function validateStageSum(element, stages) {
  const height = parseMeasurementToken(element.attributes.height);

  if (height.ok === false) {
    return [];
  }

  const total = stages.reduce((sum, stage) => sum + stage.meters, 0);
  if (total === height.value.meters) {
    return [];
  }

  return [
    createDiagnostic(
      "validation",
      "warning",
      'Field "stages" total does not match rappel height.',
      element.sourceLocation,
      "Adjust stages or height if these are meant to describe the same rappel."
    )
  ];
}

function validateTechnicalSlopeDetails(element) {
  const diagnostics = [];

  if (hasFieldValue(element, "shape") && ALLOWED_DESCENT_SHAPES.has(element.attributes.shape) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "shape", "ladder, direct, or slab"));
  }

  if (hasFieldValue(element, "station") && ALLOWED_STATIONS.has(element.attributes.station) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "station", "left, right, center, floor, tree, natural, or unknown"));
  }

  if (hasFieldValue(element, "landing") && ALLOWED_LANDINGS.has(element.attributes.landing) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "landing", "pool, ledge, dry, chaos, gallery, trail, or unknown"));
  }

  if (hasFieldValue(element, "anchor_count") && positiveInteger(element.attributes.anchor_count) === false) {
    diagnostics.push(invalidValueDiagnostic(element, "anchor_count", "a positive integer"));
  }

  if (hasFieldValue(element, "inclination")) {
    diagnostics.push(...validateInclination(element));
  }

  return diagnostics;
}

function validateInclination(element) {
  const parsed = parseInclinationToken(element.attributes.inclination);

  if (parsed.ok === false) {
    return [
      createDiagnostic(
        "validation",
        "error",
        'Field "inclination" must be a percentage.',
        element.sourceLocation,
        parsed.reason
      )
    ];
  }

  if (parsed.value.percent <= 0 || parsed.value.percent > 100) {
    return [
      createDiagnostic(
        "validation",
        "error",
        'Field "inclination" must be between 1% and 100%.',
        element.sourceLocation,
        "Use an inclination such as 75%."
      )
    ];
  }

  return [];
}

function positiveInteger(value) {
  return /^[1-9]\d*$/.test(value);
}

function isTechnicalSlope(element) {
  return element.type === "rappel" || element.type === "downclimb" || element.type === "climb";
}

function hasFieldValue(element, fieldName) {
  return Object.hasOwn(element.attributes, fieldName) && element.attributes[fieldName] !== "";
}

function missingFieldDiagnostic(element, fieldName, elementName = "Rappel") {
  return createDiagnostic(
    "validation",
    "error",
    `${elementName} requires "${fieldName}".`,
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
