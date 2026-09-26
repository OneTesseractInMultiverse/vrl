import { softTerrainText } from "./soft-terrain-text.js";
import { anchorSummary } from "./anchor-presentation.js";
import { formatElementDetail, formatMeasurement } from "./element-formatters.js";
import { diagramText, localizeDetailValue } from "./locale.js";
import { elementAttribute } from "./route-data.js";

/** Categories come from normalized fields; display text never supplies semantics. */
export function detailRecordsForElement(element, node = null, language = "en", style = "classic") {
  const text = diagramText(language);
  const attributes = element.attributes;
  if ((element.type === "start" || element.type === "exit") && typeof node?.elevationMeters === "number") {
    return [plainDetail(`${node.elevationMeters}m`)];
  }
  if (element.type === "rappel") {
    return compactDetails([
      plainDetail(ropeText(attributes.rope, language, style)), plainDetail(anchorText(element, language, style)),
      landingDetail(attributes.landing, language),
      levelDetail("flow", attributes.flow, text.flow, language), inclinationDetail(attributes.inclination), styleNote(element, style)
    ]);
  }
  if (element.type === "downclimb" || element.type === "climb") {
    return compactDetails([
      plainDetail(formatMeasurement(attributes.height)), levelDetail("exposure", attributes.exposure, text.exposure, language),
      landingDetail(attributes.landing, language), inclinationDetail(attributes.inclination), styleNote(element, style)
    ]);
  }
  if (element.type === "pool" && style === "soft-terrain") {
    return compactDetails([plainDetail(attributes.type === undefined || attributes.type === "unknown"
      ? softTerrainText(language).poolUnknown : localizeDetailValue(attributes.type, language)),
      levelDetail("flow", attributes.flow, text.flow, language), styleNote(element, style)]);
  }
  if (element.type === "hazard") {
    return compactDetails([
      levelDetail("hazardSeverity", attributes.severity, text.severity, language),
      plainDetail(elementAttribute(element, "note") ?? localizeDetailValue(elementAttribute(element, "type"), language) ?? "")
    ]);
  }
  return compactDetails([plainDetail(formatElementDetail(element, language)), element.type === "walk" ? styleNote(element, style) : null]);
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

function ropeText(rope, language, style) {
  const value = formatMeasurement(rope);
  return style === "soft-terrain" ? `${softTerrainText(language).rope}: ${value}` : value;
}

function anchorText(element, language, style) {
  const count = anchorSummary(element, language);
  return style === "soft-terrain"
    ? `${localizeDetailValue(element.attributes.anchor ?? "unknown", language)} / ${count || softTerrainText(language).countUnknown}` : count;
}

function styleNote(element, style) {
  return style === "soft-terrain" ? plainDetail(elementAttribute(element, "note") ?? "") : null;
}
