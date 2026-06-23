import { createDiagnostic } from "../domain/diagnostics.js";
import { createEmptyRoute, createRouteElement } from "../domain/model.js";

const ELEMENT_KEYWORDS = new Set([
  "start",
  "exit",
  "walk",
  "rappel",
  "downclimb",
  "pool",
  "hazard",
  "note"
]);

export function parseVrl(source) {
  const ast = createEmptyRoute(source);
  const diagnostics = [];

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const cleanedLine = normalizeSourceLine(rawLine);

    if (cleanedLine === "") {
      return;
    }

    if (cleanedLine === "}") {
      return;
    }

    const tokens = tokenize(cleanedLine);
    const keyword = tokens[0];
    const location = { line: lineNumber, column: rawLine.indexOf(keyword) + 1 };

    if (keyword === "route") {
      parseRouteLine(ast, tokens, diagnostics, location);
      return;
    }

    if (keyword === "metadata") {
      parseMetadataLine(ast, tokens, diagnostics, location);
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
        "Use route, metadata, start, exit, walk, rappel, downclimb, pool, hazard, or note."
      )
    );
  });

  return { ast, diagnostics };
}

export function stripComment(line) {
  let inQuote = false;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\\" && escaped === false) {
      escaped = true;
      continue;
    }

    if (character === "\"" && escaped === false) {
      inQuote = inQuote === false;
    }

    if (character === "#" && inQuote === false) {
      return line.slice(0, index);
    }

    escaped = false;
  }

  return line;
}

export function tokenize(line) {
  const tokens = [];
  let token = "";
  let inQuote = false;
  let escaped = false;

  for (const character of line) {
    if (/\s/.test(character) && inQuote === false) {
      pushToken(tokens, token);
      token = "";
      escaped = false;
      continue;
    }

    if (character === "\"" && escaped === false) {
      inQuote = inQuote === false;
    }

    token += character;
    escaped = character === "\\" && escaped === false;
  }

  pushToken(tokens, token);
  return tokens;
}

export function parseAttributeTokens(tokens, location) {
  const attributes = {};
  const diagnostics = [];

  tokens.forEach((token) => {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex < 1 || separatorIndex === token.length - 1) {
      diagnostics.push(
        createDiagnostic(
          "syntax",
          "error",
          `Expected key=value attribute but found "${token}"`,
          location,
          "Write attributes such as height=35m or note=\"Main line\"."
        )
      );
      return;
    }

    const key = token.slice(0, separatorIndex);
    const value = token.slice(separatorIndex + 1);
    attributes[key] = dequote(value);
  });

  return { attributes, diagnostics };
}

function normalizeSourceLine(rawLine) {
  const withoutComment = stripComment(rawLine).trim();
  return withoutComment.endsWith("{") ? withoutComment.slice(0, -1).trim() : withoutComment;
}

function parseRouteLine(ast, tokens, diagnostics, location) {
  if (tokens.length < 2) {
    diagnostics.push(
      createDiagnostic("syntax", "error", "Route statement requires a route name.", location, "Use route \"Route Name\".")
    );
    return;
  }

  ast.name = dequote(tokens.slice(1).join(" "));
}

function parseMetadataLine(ast, tokens, diagnostics, location) {
  const parsed = parseAttributeTokens(tokens.slice(1), location);
  Object.assign(ast.metadata, parsed.attributes);
  diagnostics.push(...parsed.diagnostics);
}

function parseElementLine(keyword, tokens, diagnostics, location) {
  if (keyword === "note") {
    return createRouteElement("note", { text: dequote(tokens.slice(1).join(" ")) }, location);
  }

  const payload = tokens.slice(1);
  const firstAttributeIndex = payload.findIndex((token) => token.includes("="));
  const labelTokens = firstAttributeIndex === -1 ? payload : payload.slice(0, firstAttributeIndex);
  const attributeTokens = firstAttributeIndex === -1 ? [] : payload.slice(firstAttributeIndex);
  const parsed = parseAttributeTokens(attributeTokens, location);
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

  return dequote(labelTokens.join(" "));
}

function elementLabelFor(keyword, labelTokens) {
  if (labelTokens.length === 0) {
    return null;
  }

  if (keyword === "start" || keyword === "exit") {
    return dequote(labelTokens.join(" "));
  }

  return null;
}

function pushToken(tokens, token) {
  if (token !== "") {
    tokens.push(token);
  }
}

function dequote(value) {
  if (value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1).replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
  }

  return value;
}
