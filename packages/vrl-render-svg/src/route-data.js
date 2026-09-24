/** Descriptive extensions are separate in normalized data; older supplied models remain readable. */
export function elementAttribute(element, name) {
  return element.attributes[name] ?? element.extensions?.[name];
}
