import { createDiagnostic } from "../domain/diagnostics.js";

/** Scan one physical line; spans are one-based UTF-16 columns, end-exclusive. */
export function lexVrlLine(line, location = { line: 1, column: 1 }) {
  const tokens = [];
  let index = 0;
  while (index < line.length) {
    if (/\s/.test(line[index])) {
      index += 1;
      continue;
    }
    if (line[index] === "#") return { tokens, diagnostics: [], commentStart: index };
    const scanned = scanToken(line, index, location);
    if (scanned.diagnostic) return { tokens, diagnostics: [scanned.diagnostic], commentStart: null };
    tokens.push(scanned.token);
    index = scanned.end;
  }
  return { tokens, diagnostics: [], commentStart: null };
}

function scanToken(line, start, location) {
  const head = scanValue(line, start, location, true);
  if (head.diagnostic) return head;
  if (head.form === "bare" && line[head.end] === "=") {
    return scanAttribute(line, start, head, location);
  }
  return finishToken(line, start, head.end, location, { kind: head.form, value: head.value });
}

function scanAttribute(line, start, key, location) {
  if (key.value === "") {
    return lexicalError(location, start, "Attribute key is missing.", "Write an unquoted key before =.");
  }
  const valueStart = key.end + 1;
  if (isBoundary(line, valueStart)) {
    return lexicalError(location, valueStart, "Attribute value is missing.", 'Write a value immediately after =, or use "" for empty text.');
  }
  const value = scanValue(line, valueStart, location, false);
  if (value.diagnostic) return value;
  return finishToken(line, start, value.end, location, {
    kind: "attribute",
    key: key.value,
    value: value.value,
    valueForm: value.form,
    keySpan: sourceSpan(location, start, key.end),
    valueSpan: sourceSpan(location, valueStart, value.end)
  });
}

function scanValue(line, start, location, stopAtEquals) {
  return line[start] === '"'
    ? scanQuoted(line, start, location)
    : scanBare(line, start, stopAtEquals);
}

function scanBare(line, start, stopAtEquals) {
  let end = start;
  while (!isBoundary(line, end) && line[end] !== '"' && !(stopAtEquals && line[end] === "=")) end += 1;
  return { value: line.slice(start, end), form: "bare", end };
}

function scanQuoted(line, start, location) {
  let value = "";
  for (let index = start + 1; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') return { value, form: "quoted", end: index + 1 };
    if (character === "\\") {
      const escaped = line[index + 1];
      if (escaped === undefined) {
        return lexicalError(location, index, "Unfinished escape sequence.", 'Use \\" or \\\\ and close the quoted text on the same line.');
      }
      if (escaped !== '"' && escaped !== "\\") {
        return lexicalError(location, index, "Unsupported escape sequence.", 'Only \\" and \\\\ are supported inside quoted text.');
      }
      value += escaped;
      index += 1;
    } else {
      value += character;
    }
  }
  return lexicalError(location, start, "Unterminated quoted text.", "Add a closing double quote on the same line.");
}

function finishToken(line, start, end, location, fields) {
  if (!isBoundary(line, end)) {
    return lexicalError(location, end, "Expected whitespace between tokens.", "Separate tokens with whitespace; quotes may start a token or an attribute value.");
  }
  return { token: { ...fields, raw: line.slice(start, end), span: sourceSpan(location, start, end) }, end };
}

function isBoundary(line, index) {
  return index >= line.length || /\s/.test(line[index]) || line[index] === "#";
}

function sourceSpan(location, start, end) {
  return {
    start: { line: location.line, column: location.column + start },
    end: { line: location.line, column: location.column + end }
  };
}

function lexicalError(location, index, message, suggestion) {
  return { diagnostic: createDiagnostic("syntax", "error", message, { line: location.line, column: location.column + index }, suggestion) };
}

/** Compatibility helpers retain raw strings for valid lines and fail explicitly otherwise. */
export function tokenize(line) {
  return requireLexedLine(line).tokens.map((token) => token.raw);
}

export function stripComment(line) {
  const { commentStart } = requireLexedLine(line);
  return commentStart === null ? line : line.slice(0, commentStart);
}

function requireLexedLine(line) {
  const result = lexVrlLine(line);
  if (result.diagnostics.length > 0) {
    const error = new SyntaxError(result.diagnostics[0].message);
    error.diagnostics = result.diagnostics;
    throw error;
  }
  return result;
}
