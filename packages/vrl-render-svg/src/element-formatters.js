import { diagramText, elementLabel, localizeDetailValue } from "./locale.js";

const ELEMENT_COLOR_TOKENS = {
  start: "exit",
  exit: "exit",
  walk: "routeLine",
  rappel: "rappel",
  downclimb: "anchor",
  climb: "anchor",
  pool: "water",
  hazard: "hazard",
  note: "warning"
};

export function elementColorToken(element) {
  return ELEMENT_COLOR_TOKENS[element.type] ?? "routeLine";
}

export function formatElementTitle(element, language = "en") {
  const baseLabel = elementLabel(element.type, language);
  const name = element.label ?? element.id;
  return name === null ? baseLabel : `${baseLabel} ${name}`;
}

export function formatElementDetail(element, language = "en") {
  if (element.type === "rappel") {
    return [formatMeasurement(element.attributes.height), formatMeasurement(element.attributes.rope), localizeDetailValue(element.attributes.anchor, language)]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "walk") {
    return formatMeasurement(element.attributes.distance);
  }

  if (element.type === "downclimb" || element.type === "climb") {
    return [formatMeasurement(element.attributes.height), labeledDetail(diagramText(language).exposure, localizeDetailValue(element.attributes.exposure, language))]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "note") {
    return element.attributes.text ?? "";
  }

  if (element.type === "hazard") {
    return [
      labeledDetail(diagramText(language).severity, localizeDetailValue(element.attributes.severity, language)),
      element.attributes.note ?? localizeDetailValue(element.attributes.type, language)
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return element.attributes.note ?? localizeDetailValue(element.attributes.type, language) ?? "";
}

export function formatMeasurement(measurement) {
  if (typeof measurement !== "object") {
    return "";
  }

  return `${measurement.meters}m`;
}

function labeledDetail(label, value) {
  return value === undefined || value === "" ? "" : `${label}: ${value}`;
}
