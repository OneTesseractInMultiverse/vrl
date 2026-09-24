import { assertFiniteNumber, assertOptionsRecord } from "@subvertic/core";

export function validateRenderOptions(options) {
  assertOptionsRecord(options, "Renderer options");
  if (options.legend !== undefined && typeof options.legend !== "boolean") {
    throw new TypeError("Renderer option legend must be a boolean.");
  }
}

export function validateRenderLayout(layout) {
  assertOptionsRecord(layout, "Renderer layout");
  validateCanvasNumber(layout.width, "Layout width");
  validateCanvasNumber(layout.height, "Layout height");
  if (layout.width <= 0 || layout.height < 0) throw new RangeError("Layout width must be positive and height nonnegative.");
  if (!Array.isArray(layout.nodes) || !Array.isArray(layout.segments)) {
    throw new TypeError("Renderer layout requires nodes and segments arrays.");
  }
  layout.nodes.forEach(validateNode);
  if (layout.points !== undefined) {
    if (!Array.isArray(layout.points)) throw new TypeError("Layout points must be an array.");
    layout.points.forEach(validatePoint);
  }
  layout.segments.forEach(validateSegment);
}

function validatePoint(point) {
  assertOptionsRecord(point, "Layout point");
  validateCanvasNumber(point.x, "Point x");
  validateCanvasNumber(point.y, "Point y");
}

function validateSegment(segment) {
  assertOptionsRecord(segment, "Layout segment");
  validatePoint(segment.start);
  validatePoint(segment.end);
  if (segment.element !== null) validateElementRecord(segment.element);
  if (segment.kind === "technical") validateCanvasNumber(segment.technicalDeltaY, "Technical pixel delta");
}

function validateNode(node) {
  validatePoint(node);
  validateElementRecord(node.element);
}

function validateElementRecord(element) {
  assertOptionsRecord(element, "Layout element");
  assertOptionsRecord(element.attributes, "Layout element attributes");
}

function validateCanvasNumber(value, name) {
  assertFiniteNumber(value, name);
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new RangeError(`${name} exceeds the supported magnitude.`);
}
