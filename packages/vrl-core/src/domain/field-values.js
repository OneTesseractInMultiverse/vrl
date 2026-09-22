import { parseInclinationToken } from "./inclinations.js";
import { parseMeasurementToken } from "./measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "./rappel-details.js";

const PARSERS = {
  measurement: parseMeasurementToken,
  inclination: parseInclinationToken,
  redirections: parseRedirectionsToken,
  stages: parseRappelStagesToken,
  integerText: parseIntegerText,
  enum: parseEnum
};

export function parseFieldValue(specification, raw) {
  return PARSERS[specification.parser](raw, specification);
}

function parseIntegerText(raw) {
  return /^[1-9]\d*$/.test(raw) ? { ok: true, value: raw } : { ok: false };
}

function parseEnum(raw, specification) {
  return specification.values.includes(raw) ? { ok: true, value: raw } : { ok: false };
}

export function fieldValueProblems(specification, value) {
  switch (specification.parser) {
    case "measurement": return outsideRange(value.meters, specification.range) ? ["range"] : [];
    case "inclination": return outsideRange(value.percent, specification.range) ? ["range"] : [];
    case "integerText": return outsideRange(Number(value), specification.range) ? ["range"] : [];
    case "stages": return value.filter((stage) => outsideRange(stage.meters, specification.range)).map(() => "stage");
    case "redirections": return value.flatMap((entry) => redirectionProblems(specification, entry));
    default: return [];
  }
}

function outsideRange(value, range) {
  return (range.exclusiveMinimum ? value <= range.minimum : value < range.minimum) || value > range.maximum;
}

function redirectionProblems(specification, entry) {
  if (outsideRange(entry.distance.meters, specification.range)) return ["distance"];
  return specification.values.includes(entry.side) ? [] : ["side"];
}
