import { createDiagnostic } from "../domain/diagnostics.js";
import { createEmptyRoute, createRouteElement } from "../domain/model.js";
import { lexVrlLine } from "./lexer.js";

export { lexVrlLine, stripComment, tokenize } from "./lexer.js";

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
  const ast = createEmptyRoute(source);
  const diagnostics = [];

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lexed = lexVrlLine(rawLine, { line: index + 1, column: 1 });
    diagnostics.push(...lexed.diagnostics);
    if (lexed.diagnostics.length > 0) return;
    const tokens = statementTokens(lexed.tokens);
    if (tokens.length === 0) return;
    const keyword = tokens[0].raw;
    const location = tokens[0].span.start;

    if (keyword === "route") {
      parseRouteLine(ast, tokens, diagnostics, location);
      return;
    }

    if (keyword === "metadata") {
      parseMetadataLine(ast, tokens, diagnostics);
      return;
    }

    if (ELEMENT_KEYWORDS.has(keyword)) {
      ast.elements.push(parseElementLine(keyword, tokens, diagnostics, location));
      return;
    }

    diagnostics.push(
      createDiagnostic(
        "syntax",
        "error",
        `Unknown VRL statement "${keyword}"`,
        location,
        "Use route, metadata, start, exit, walk, rappel, downclimb, climb, pool, hazard, or note."
      )
    );
  });

  return { ast, diagnostics };
}

export function parseAttributeTokens(tokens, location) {
  const lexed = lexVrlLine(tokens.join(" "), location);
  return lexed.diagnostics.length > 0
    ? { attributes: {}, diagnostics: lexed.diagnostics }
    : parseAttributes(lexed.tokens);
}

function parseAttributes(tokens) {
  const attributes = {};
  const diagnostics = [];

  tokens.forEach((token) => {
    if (token.kind !== "attribute") {
      diagnostics.push(
        createDiagnostic(
          "syntax",
          "error",
          `Expected key=value attribute but found "${token.raw}"`,
          token.span.start,
          "Write attributes such as height=35m or note=\"Main line\"."
        )
      );
      return;
    }

    attributes[token.key] = token.value;
  });

  return { attributes, diagnostics };
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

function parseMetadataLine(ast, tokens, diagnostics) {
  const parsed = parseAttributes(tokens.slice(1));
  Object.assign(ast.metadata, parsed.attributes);
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
