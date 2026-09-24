import { anchorCountDescription } from "./anchor-presentation.js";
import { diagramText } from "./locale.js";
import { validateRenderLayout, validateRenderOptions } from "./render-options.js";
import { bounds, unionBounds, textBounds, fitSceneBounds } from "./scene-bounds.js";
import { technicalAnnotationDescription, terrainProfilePath, resolveRenderLanguage } from "./presentation.js";
import { prepareNodes } from "./node-scene.js";
import { prepareInfoBox, prepareLegend } from "./panel-scene.js";
import { prepareRouteSegments, prepareWaterSegments, prepareSegmentLabels, prepareStationTicks } from "./segment-scene.js";

/** Prepare once: fitting and serialization consume the same presentation records. */
export function computeTopoScene(route, layout, options = {}) {
  validateRenderOptions(options);
  validateRenderLayout(layout);
  const language = resolveRenderLanguage(options);
  const nodes = prepareNodes(layout, language, options.symbology);
  const segments = prepareRouteSegments(layout, language);
  const segmentLabels = prepareSegmentLabels(layout);
  const contentBounds = unionBounds([
    terrainBounds(layout), ...nodeBounds(nodes), ...segmentBounds(segments),
    ...segmentLabels.map((item) => textBounds(item.text, item.x, item.y, 10, "middle"))
  ]);
  const infoBox = prepareInfoBox(route, layout, language, contentBounds.minY - 160);
  const legend = options.legend === false ? null : prepareLegend({ ...layout, height: Math.max(layout.height, contentBounds.maxY + 12) }, language, options.symbology);
  const sceneBounds = unionBounds([contentBounds, infoBox.bounds, ...(legend === null ? [] : [legend.bounds])]);
  return { language, title: `${route.name} ${diagramText(language).topo}`, description: sceneDescription(route, layout, language),
    nodes, segments, segmentLabels, terrainPath: terrainProfilePath(layout), waterPaths: prepareWaterSegments(layout), stationTicks: prepareStationTicks(layout),
    infoBox, legend, contentBounds, bounds: sceneBounds, viewBox: fitSceneBounds(sceneBounds, layout.width, layout.height) };
}

function sceneDescription(route, layout, language) {
  return [`${diagramText(language).schematicDescription} ${route.name}.`, anchorCountDescription(layout, language), technicalAnnotationDescription(layout, language)].filter(Boolean).join(" ");
}

function nodeBounds(nodes) {
  return nodes.flatMap(({ node, drawing }) => [
    // Symbols, pool curves, station ticks, anchor marks, and their clearance strokes.
    bounds(node.x - 44, node.y - 32, node.x + 40, node.y + 32),
    ...symbolTextBounds(drawing.marker),
    textBounds(drawing.title, drawing.titleX, drawing.titleY, 11),
    ...anchorOverflowBounds(drawing.anchors),
    ...drawing.details.flatMap((row) => row.flatMap(detailBounds))
  ]);
}

function symbolTextBounds(marker) {
  return marker.kind === "hazard" ? [] : [textBounds(marker.code, marker.textX, marker.textY, 9, "middle")];
}

function anchorOverflowBounds(anchors) {
  const overflow = anchors?.overflow;
  return overflow === undefined || overflow === null ? [] : [textBounds(overflow.text, overflow.x, overflow.y, overflow.fontSize, overflow.anchor)];
}

function detailBounds(item) {
  return item.kind === "text" ? [textBounds(item.text, item.x, item.y, item.fontSize)] : [
    bounds(item.x, item.y, item.x + item.width, item.y + item.height),
    textBounds(item.label, item.textX, item.textY, 8, "middle")
  ];
}

function terrainBounds(layout) {
  const points = layout.points ?? layout.nodes;
  return unionBounds([
    bounds(0, Math.min(0, layout.height - 54), layout.width, layout.height),
    ...points.map((point) => bounds(Math.min(0, point.x - 58), point.y, Math.max(layout.width, point.x + 10), point.y + 54))
  ]);
}

function segmentBounds(segments) {
  return segments.flatMap((segment) => {
    if (segment.kind === "connection") {
      return [bounds(Math.min(segment.start.x, segment.end.x) - 16, Math.min(segment.start.y, segment.end.y), Math.max(segment.start.x, segment.end.x) + 16, Math.max(segment.start.y, segment.end.y), 4)];
    }
    const geometry = segment.geometry;
    const shapeBounds = bounds(
      Math.min(geometry.startX, geometry.dropX, geometry.bottomX, geometry.endX),
      Math.min(geometry.startY, geometry.bottomY, geometry.endY),
      Math.max(geometry.startX, geometry.dropX, geometry.bottomX, geometry.endX),
      Math.max(geometry.startY, geometry.bottomY, geometry.endY), 24
    );
    const annotations = [...segment.stages, ...segment.redirections];
    return [shapeBounds, ...annotations.map((item) => textBounds(item.text, item.x, item.y, item.fontSize, item.anchor))];
  });
}
