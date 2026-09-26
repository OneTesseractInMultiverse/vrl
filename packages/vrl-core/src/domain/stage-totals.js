import { metricSourceUnits } from "./metric-source-units.js";
import { fieldSpecification } from "./field-specifications.js";

// Only validated metric source tokens reach this computation. Keep exact units
// private: normalized models and JSON continue to contain ordinary numbers.
export function stageTotalMatchesHeight(stages, height) {
  const total = stages.split(fieldSpecification("stages").separator).reduce((sum, token) => sum + metricSourceUnits(token), 0n);
  return total === metricSourceUnits(height);
}
