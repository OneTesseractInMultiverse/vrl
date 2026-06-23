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

const ELEMENT_LABELS = {
  start: "Start",
  exit: "Exit",
  walk: "Walk",
  rappel: "Rappel",
  downclimb: "Downclimb",
  climb: "Climb",
  pool: "Pool",
  hazard: "Hazard",
  note: "Note"
};

export function elementColorToken(element) {
  return ELEMENT_COLOR_TOKENS[element.type] ?? "routeLine";
}

export function formatElementTitle(element) {
  const baseLabel = ELEMENT_LABELS[element.type] ?? element.type;
  const name = element.label ?? element.id;
  return name === null ? baseLabel : `${baseLabel} ${name}`;
}

export function formatElementDetail(element) {
  if (element.type === "rappel") {
    return [formatMeasurement(element.attributes.height), formatMeasurement(element.attributes.rope), element.attributes.anchor]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "walk") {
    return formatMeasurement(element.attributes.distance);
  }

  if (element.type === "downclimb" || element.type === "climb") {
    return [formatMeasurement(element.attributes.height), element.attributes.exposure]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "note") {
    return element.attributes.text ?? "";
  }

  return element.attributes.note ?? element.attributes.type ?? "";
}

export function formatMeasurement(measurement) {
  if (typeof measurement !== "object") {
    return "";
  }

  return `${measurement.meters}m`;
}
