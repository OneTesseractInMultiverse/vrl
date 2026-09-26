import { metricSourceUnits } from "./metric-source-units.js";

/** A partial walk sum can disprove a smaller total, never establish completeness. */
export function declaredDistanceBelowWalkSum(elements, metadata) {
  if (!Object.hasOwn(metadata, "total_distance")) return false;
  const sum = elements.reduce((total, element) => element.type === "walk" && Object.hasOwn(element.attributes, "distance")
    ? total + metricSourceUnits(element.attributes.distance) : total, 0n);
  return sum > metricSourceUnits(metadata.total_distance);
}
