/** Raw syntax records for parsers and recovery; these do not establish domain validity. */
export function createEmptyRoute(source = "") {
  return {
    name: null,
    metadata: {},
    elements: [],
    source,
    sourceMap: { route: null, metadata: [], elements: [] }
  };
}

export function createRouteElement(type, attributes, sourceLocation, id = null, label = null) {
  return {
    type,
    id,
    label,
    attributes,
    sourceLocation
  };
}

