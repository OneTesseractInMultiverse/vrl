import { curvedTechnicalPath, validateSoftSegment } from "./soft-terrain-geometry.js";
import { stagePlacements, redirectionPlacements } from "./segment-scene.js";
import { curvedTechnicalPoint } from "./soft-terrain-geometry.js";
import { scenePath } from "./scene-path.js";
import { bounds } from "./scene-bounds.js";

/**
 * Prepare an intact technical section with direction-preserving geometry and all stage/redirection positions.
 * @responsibility coordinator
 * @param {Object} segment - Canonical owned technical segment; physical facts remain untouched.
 * @param {number} width - Section width, at least 288 drawing units.
 * @param {number} top - Top drawing origin in the full document.
 * @param {string} language - Resolved annotation language.
 * @returns {Object} Original segment plus owned geometry, stage boundaries and redirection marks.
 */
export function rowTechnical(segment, width, top, language) {
  validateSoftSegment(segment);
  const geometry = rowTechnicalGeometry(segment.direction, width, top);
  return { segment, geometry, path: curvedTechnicalPath(geometry),
    stages: stagePlacements(geometry, segment.element, curvedTechnicalPoint),
    redirections: redirectionPlacements(geometry, segment.element, language, curvedTechnicalPoint) };
}

/**
 * Assign bounded schematic coordinates without using physical height as a pixel scale.
 * @responsibility computation
 * @param {string} direction - Validated up or down traversal direction.
 * @param {number} width - Complete section width.
 * @param {number} top - Section drawing origin.
 * @returns {Object} Directed curve coordinates with arrow and station clearance on every side.
 */
function rowTechnicalGeometry(direction, width, top) {
  const startY = top + (direction === "up" ? 144 : 40), bottomY = top + (direction === "up" ? 40 : 144);
  return { startX: 48, dropX: 68, bottomX: width - 52, endX: width - 32, startY, bottomY, endY: bottomY };
}

/**
 * Construct a section's schematic strokes, retaining technical boundaries and marking compressed walks explicitly.
 * @responsibility computation
 * @param {Object|null} technical - Prepared complete technical section, or null for nontechnical progression.
 * @param {Object|null} element - Progression owner, absent for annotation-only documents.
 * @param {number} width - Complete section width.
 * @param {number} top - Top drawing origin.
 * @returns {Object} Absolute-coordinate path primitives and conservative stroke bounds.
 */
export function rowGeometry(technical, element, width, top) {
  const paths = [];
  if (technical !== null) {
    const g = technical.geometry;
    paths.push({ kind: "wash", token: "terrain", path: scenePath`M 32 ${g.startY + 14} L ${g.dropX} ${g.startY + 14} L ${g.bottomX} ${g.bottomY + 14} L ${width} ${g.bottomY + 14} L ${width} ${top + 172} L 32 ${top + 172} Z`, arrow: false });
    paths.push({ kind: "contour", token: "terrain", path: scenePath`M 32 ${g.startY + 14} L ${g.dropX} ${g.startY + 14} L ${g.bottomX} ${g.bottomY + 14} L ${width} ${g.bottomY + 14}`, arrow: false });
    paths.push({ kind: "technical", token: "routeLine", path: technical.path, arrow: true });
    for (const stage of technical.stages) if (stage.boundary !== null) {
      const b = stage.boundary;
      paths.push({ kind: "stage", token: "routeLine", path: scenePath`M ${b.x1} ${b.y1} L ${b.x2} ${b.y2}`, arrow: false });
    }
    for (const mark of technical.redirections) paths.push({ kind: "redirection", token: "anchor", path: mark.path, arrow: false });
    if (element.attributes.station !== undefined) {
      const x = technical.segment.direction === "up" ? g.bottomX : g.dropX;
      const y = technical.segment.direction === "up" ? g.bottomY : g.startY;
      const side = element.attributes.station === "right" ? 1 : -1;
      for (const offset of [8, 12]) paths.push({ kind: "station", token: "anchor", path: scenePath`M ${x + side * offset} ${y - 7} L ${x + side * offset} ${y + 7}`, arrow: false });
    }
  } else if (element?.type === "walk") {
    const middle = width / 2;
    paths.push({ kind: "distance-break", token: "routeLine", path: scenePath`M 48 ${top + 64} L ${middle - 18} ${top + 64} L ${middle - 9} ${top + 55} L ${middle} ${top + 73} L ${middle + 9} ${top + 55} L ${middle + 18} ${top + 64} L ${width - 32} ${top + 64}`, arrow: true });
  } else if (element?.type === "pool") {
    paths.push({ kind: "pool", token: "water", path: scenePath`M 48 ${top + 45} C 72 ${top + 85} ${width - 56} ${top + 85} ${width - 32} ${top + 45}`, arrow: false });
    if (element.attributes.type !== "dry") paths.push({ kind: "water", token: "water", path: scenePath`M 60 ${top + 48} C 88 ${top + 58} ${width - 72} ${top + 38} ${width - 44} ${top + 48}`, arrow: false });
  }
  return { paths, bounds: bounds(28, top + 16, width + 4, top + (paths.length === 0 ? 16 : technical === null ? 104 : 180)) };
}
