import { anchorSummary } from "./anchor-presentation.js";
import { formatElementDetail, formatMeasurement } from "./element-formatters.js";
import { diagramText, localizeDetailValue } from "./locale.js";
import { elementAttribute } from "./route-data.js";

/** Categories come from normalized fields; display text never supplies semantics. */
export function detailRecordsForElement(element, node = null, language = "en") {
  const text = diagramText(language);
  const attributes = element.attributes;
  if ((element.type === "start" || element.type === "exit") && typeof node?.elevationMeters === "number") {
    return [plainDetail(`${node.elevationMeters}m`)];
  }
  if (element.type === "rappel") {
    return compactDetails([
      plainDetail(formatMeasurement(attributes.rope)), plainDetail(anchorSummary(element, language)),
      landingDetail(attributes.landing, language),
      levelDetail("flow", attributes.flow, text.flow, language), inclinationDetail(attributes.inclination)
    ]);
  }
  if (element.type === "downclimb" || element.type === "climb") {
    return compactDetails([
      plainDetail(formatMeasurement(attributes.height)), levelDetail("exposure", attributes.exposure, text.exposure, language),
      landingDetail(attributes.landing, language), inclinationDetail(attributes.inclination)
    ]);
  }
  if (element.type === "hazard") {
    return compactDetails([
      levelDetail("hazardSeverity", attributes.severity, text.severity, language),
      plainDetail(elementAttribute(element, "note") ?? localizeDetailValue(elementAttribute(element, "type"), language) ?? "")
    ]);
  }
  return compactDetails([plainDetail(formatElementDetail(element, language))]);
}

export function plainDetail(text) {
  return { kind: "text", text };
}

export function detailRecordText(record) {
  return record.kind === "text" ? record.text : `${record.prefix}${record.label}`;
}

function compactDetails(records) {
  return records.filter((record) => record !== null && detailRecordText(record) !== "");
}

function levelDetail(category, value, prefix, language) {
  return value === undefined || value === "" ? null : {
    kind: "badge", category, value, className: value, prefix: `${prefix}: `, label: localizeDetailValue(value, language)
  };
}

function inclinationDetail(inclination) {
  return typeof inclination !== "object" || inclination === null ? null : {
    kind: "badge", category: "inclination", value: inclination.percent, className: "inclination", prefix: "", label: `${inclination.percent}%`
  };
}

function landingDetail(value, language) {
  return value === undefined || value === "" ? null : plainDetail(`${diagramText(language).landing}: ${localizeDetailValue(value, language)}`);
}
