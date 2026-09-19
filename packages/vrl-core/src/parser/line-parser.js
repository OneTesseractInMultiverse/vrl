import { createDiagnostic } from "../domain/diagnostics.js";
import { createEmptyRoute, createRouteElement } from "../domain/model.js";
import { lexVrlLine } from "./lexer.js";
import { parseAttributes } from "./attribute-parser.js";
import { advanceDocumentOrder, initialDocumentOrder } from "./document-order.js";

export { lexVrlLine, stripComment, tokenize } from "./lexer.js";
export { parseAttributeTokens } from "./attribute-parser.js";

const ELEMENT_KEYWORDS = new Set([
  "start",
  "exit",
  "walk",
  "rappel",
  "downclimb",
  "climb",
  "pool",
  "hazard",
  "note"
]);

export function parseVrl(source) {
  const context = { ast: createEmptyRoute(source), diagnostics: [], order: initialDocumentOrder(), metadataKeys: new Map() };
  source.split(/\r?\n/).forEach((rawLine, index) => parseDocumentLine(context, rawLine, index + 1));
  return { ast: context.ast, diagnostics: context.diagnostics };
}

function parseDocumentLine(context, rawLine, line) {
  const lexed = lexVrlLine(rawLine, { line, column: 1 });
  context.diagnostics.push(...lexed.diagnostics);
  if (lexed.diagnostics.length > 0) return;
  const tokens = statementTokens(lexed.tokens);
  if (tokens.length === 0) return;
  const keyword = tokens[0].raw;
  const location = tokens[0].span.start;
  if (keyword !== "route" && keyword !== "metadata" && !ELEMENT_KEYWORDS.has(keyword)) {
    context.diagnostics.push(createDiagnostic("syntax", "error", `Unknown VRL statement "${keyword}"`, location,
      "Use route, metadata, start, exit, walk, rappel, downclimb, climb, pool, hazard, or note."));
    return;
  }
  const ordered = advanceDocumentOrder(context.order, keyword, location);
  context.order = ordered.state;
  context.diagnostics.push(...ordered.diagnostics);
  if (ordered.diagnostics.length > 0) return;
  parseStatement(context, keyword, tokens, location);
}

function parseStatement({ ast, diagnostics, metadataKeys }, keyword, tokens, location) {
  if (keyword === "route") {
    parseRouteLine(ast, tokens, diagnostics, location);
  } else if (keyword === "metadata") {
    parseMetadataLine(ast, tokens, diagnostics, metadataKeys);
  } else {
    ast.elements.push(parseElementLine(keyword, tokens, diagnostics, location));
  }
}

function statementTokens(tokens) {
  const last = tokens.at(-1);
  if (last?.kind === "bare" && last.value === "{") return tokens.slice(0, -1);
  if (tokens.length === 1 && last.kind === "bare" && last.value === "}") return [];
  return tokens;
}

function parseRouteLine(ast, tokens, diagnostics, location) {
  if (tokens.length < 2) {
    diagnostics.push(
      createDiagnostic("syntax", "error", "Route statement requires a route name.", location, "Use route \"Route Name\".")
    );
    return;
  }

  ast.name = textOf(tokens.slice(1));
}

function parseMetadataLine(ast, tokens, diagnostics, metadataKeys) {
  const parsed = parseAttributes(tokens.slice(1), metadataKeys);
  // Define own properties so keys such as __proto__ remain ordinary source data.
  Object.defineProperties(ast.metadata, Object.getOwnPropertyDescriptors(parsed.attributes));
  parsed.keyLocations.forEach((location, key) => metadataKeys.set(key, location));
  diagnostics.push(...parsed.diagnostics);
}

function parseElementLine(keyword, tokens, diagnostics, location) {
  if (keyword === "note") {
    return createRouteElement("note", { text: textOf(tokens.slice(1)) }, location);
  }

  const payload = tokens.slice(1);
  const firstAttributeIndex = payload.findIndex((token) => token.kind === "attribute");
  const labelTokens = firstAttributeIndex === -1 ? payload : payload.slice(0, firstAttributeIndex);
  const attributeTokens = firstAttributeIndex === -1 ? [] : payload.slice(firstAttributeIndex);
  const parsed = parseAttributes(attributeTokens);
  diagnostics.push(...parsed.diagnostics);

  return createRouteElement(
    keyword,
    parsed.attributes,
    location,
    elementIdFor(keyword, labelTokens),
    elementLabelFor(keyword, labelTokens)
  );
}

function elementIdFor(keyword, labelTokens) {
  if (labelTokens.length === 0) {
    return null;
  }

  if (keyword === "start" || keyword === "exit") {
    return null;
  }

  return textOf(labelTokens);
}

function elementLabelFor(keyword, labelTokens) {
  if (labelTokens.length === 0) {
    return null;
  }

  if (keyword === "start" || keyword === "exit") {
    return textOf(labelTokens);
  }

  return null;
}

function textOf(tokens) {
  return tokens.map((token) => token.kind === "attribute" ? token.raw : token.value).join(" ");
}
