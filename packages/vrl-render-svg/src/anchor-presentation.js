import { formatElementTitle } from "./element-formatters.js";
import { diagramText } from "./locale.js";

const MAX_ANCHOR_MARKS = 4;

/** Read the validated quantity without applying any drawing limit. */
function actualAnchorCount(element) {
  const value = element.attributes.anchor_count;
  if (typeof value !== "number" && typeof value !== "string") return 0;
  const count = Number(value);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export function anchorMarkCount(element) {
  return visibleAnchorCount(actualAnchorCount(element));
}

function visibleAnchorCount(count) {
  return Math.min(count, MAX_ANCHOR_MARKS);
}

export function anchorSummary(element, language = "en") {
  const count = actualAnchorCount(element);
  return count === 0 ? "" : `${count} ${anchorLabel(count, language)}`;
}

export function anchorLabel(count, language = "en") {
  const text = diagramText(language);
  return count === 1 ? text.anchor : text.anchors;
}

/** Shared coordinates keep visual shorthand and canvas fitting consistent. */
export function anchorMarkPlacements(node, element, side = "left") {
  const count = actualAnchorCount(element);
  const visibleCount = visibleAnchorCount(count);
  const direction = side === "left" ? -1 : 1;
  return {
    count,
    marks: Array.from({ length: visibleCount }, (_, index) => ({ x: node.x + direction * (14 + index * 8), y: node.y - 24 })),
    overflow: count > visibleCount ? {
      text: `+${count - visibleCount}`, x: node.x + direction * 47, y: node.y - 21,
      fontSize: 9, anchor: direction === -1 ? "end" : "start"
    } : null
  };
}

export function anchorCountDescription(layout, language) {
  return layout.nodes.flatMap(({ element }) => {
    const summary = anchorSummary(element, language);
    return summary === "" ? [] : [`${formatElementTitle(element, language)}: ${summary}.`];
  }).join(" ");
}
