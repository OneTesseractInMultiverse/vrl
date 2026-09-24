import { requireSupportedNumber } from "../../domain/numeric-policy.js";

export function exportRouteJson(model) {
  return JSON.stringify(model, supportedJsonValue, 2);
}

function supportedJsonValue(_key, value) {
  return typeof value === "number" ? requireSupportedNumber(value, "JSON number") : value;
}
