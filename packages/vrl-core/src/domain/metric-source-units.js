import { MAX_DECIMAL_PLACES } from "./numeric-policy.js";

/** Exact comparison units for validated metric source tokens; never serialized. */
export function metricSourceUnits(token) {
  const [whole, fraction = ""] = token.trim().slice(0, -1).split(".");
  return BigInt(whole + fraction.padEnd(MAX_DECIMAL_PLACES, "0"));
}
