import { assertFiniteNumber } from "@subvertic/vrl-core";

/** Build path data from fixed commands and numeric coordinates before encoding. */
export function scenePath(parts, ...coordinates) {
  coordinates.forEach((value) => assertFiniteNumber(value, "Scene path coordinate"));
  return parts.reduce((path, part, index) => path + coordinates[index - 1] + part);
}
