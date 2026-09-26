import { codedDiagnostic } from "../domain/diagnostics.js";

/**
 * Scan a physical line into typed tokens and end-exclusive UTF-16 spans, stopping at comments or the first
 * malformed lexeme. Scan one physical line; spans are one-based UTF-16 columns, end-exclusive.
 * @responsibility computation
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin; defaults to { line: 1, column: 1 }.
 * @returns {Object} A record containing tokens, diagnostics, commentStart.
 */

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

/**
 * Scan a token head, dispatch assignments to attribute scanning, and finish standalone quoted or bare tokens.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {number} start - Zero-based UTF-16 offset in the physical line.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {unknown} The head value selected or validated above. The result returned by scanAttribute. The result returned by finishToken.
 */
function scanToken(line, start, location) {
  const head = scanValue(line, start, location, true);
  if (head.diagnostic) return head;
  if (head.form === "bare" && line[head.end] === "=") {
    return scanAttribute(line, start, head, location);
  }
  return finishToken(line, start, head.end, location, { kind: head.form, value: head.value });
}

/**
 * Check assignment boundaries, scan its value and assemble distinct key/value source spans.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {number} start - Zero-based UTF-16 offset in the physical line.
 * @param {Object} key - Scanned bare key value and exclusive end offset immediately before the equals sign.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {unknown} The result returned by lexicalError. The value value selected or validated above. The result returned by finishToken.
 */
function scanAttribute(line, start, key, location) {
  if (key.value === "") {
    return lexicalError("VRL_LEX_MISSING_KEY", location, start, "Attribute key is missing.", "Write an unquoted key before =.");
  }
  const valueStart = key.end + 1;
  if (isBoundary(line, valueStart)) {
    return lexicalError("VRL_LEX_MISSING_VALUE", location, valueStart, "Attribute value is missing.", 'Write a value immediately after =, or use "" for empty text.');
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

/**
 * Dispatch a value to quoted escape decoding or bare scanning without decoding it twice.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {number} start - Zero-based UTF-16 offset in the physical line.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @param {boolean} stopAtEquals - Whether a bare scan must stop before assignment syntax.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function scanValue(line, start, location, stopAtEquals) {
  return line[start] === '"'
    ? scanQuoted(line, start, location)
    : scanBare(line, start, stopAtEquals);
}

/**
 * Advance to whitespace, comment, quote or the configured equals boundary and retain the raw substring.
 * @responsibility computation
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {number} start - Zero-based UTF-16 offset in the physical line.
 * @param {boolean} stopAtEquals - Whether a bare scan must stop before assignment syntax.
 * @returns {Object} A record containing value, form, end.
 */
function scanBare(line, start, stopAtEquals) {
  let end = start;
  while (!isBoundary(line, end) && line[end] !== '"' && !(stopAtEquals && line[end] === "=")) end += 1;
  return { value: line.slice(start, end), form: "bare", end };
}

/**
 * Decode supported quote and backslash escapes once; return located failures for unsupported escapes or an
 * unclosed quote.
 * @responsibility computation
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {number} start - Zero-based UTF-16 offset in the physical line.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {unknown} A record containing value, form, end. The result returned by lexicalError.
 */
function scanQuoted(line, start, location) {
  let value = "";
  for (let index = start + 1; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') return { value, form: "quoted", end: index + 1 };
    if (character === "\\") {
      const escaped = line[index + 1];
      if (escaped === undefined) {
        return lexicalError("VRL_LEX_UNFINISHED_ESCAPE", location, index, "Unfinished escape sequence.", 'Use \\" or \\\\ and close the quoted text on the same line.');
      }
      if (escaped !== '"' && escaped !== "\\") {
        return lexicalError("VRL_LEX_UNSUPPORTED_ESCAPE", location, index, "Unsupported escape sequence.", 'Only \\" and \\\\ are supported inside quoted text.');
      }
      value += escaped;
      index += 1;
    } else {
      value += character;
    }
  }
  return lexicalError("VRL_LEX_UNTERMINATED_STRING", location, start, "Unterminated quoted text.", "Add a closing double quote on the same line.");
}

/**
 * Require token separation and attach the raw spelling and end-exclusive source span to typed token fields.
 * @responsibility computation
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {number} start - Zero-based UTF-16 offset in the physical line.
 * @param {number} end - Exclusive zero-based UTF-16 offset in the physical line.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @param {unknown} fields - Typed token fields to combine with raw spelling and source spans.
 * @returns {unknown} The result returned by lexicalError. A record containing token, end.
 */
function finishToken(line, start, end, location, fields) {
  if (!isBoundary(line, end)) {
    return lexicalError("VRL_LEX_TOKEN_ADJACENCY", location, end, "Expected whitespace between tokens.", "Separate tokens with whitespace; quotes may start a token or an attribute value.");
  }
  return { token: { ...fields, raw: line.slice(start, end), span: sourceSpan(location, start, end) }, end };
}

/**
 * Recognize end-of-line, whitespace or a comment marker at a UTF-16 index.
 * @responsibility computation
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {number} index - Zero-based UTF-16 offset in the physical line.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function isBoundary(line, index) {
  return index >= line.length || /\s/.test(line[index]) || line[index] === "#";
}

/**
 * Convert relative UTF-16 offsets into one-based, end-exclusive source coordinates.
 * @responsibility computation
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @param {number} start - Zero-based UTF-16 offset in the physical line.
 * @param {number} end - Exclusive zero-based UTF-16 offset in the physical line.
 * @returns {Object} A record containing start, end.
 */
function sourceSpan(location, start, end) {
  return {
    start: { line: location.line, column: location.column + start },
    end: { line: location.line, column: location.column + end }
  };
}

/**
 * Create one coded lexical error at the offending UTF-16 offset with a repair suggestion.
 * @responsibility computation
 * @param {string} code - Stable diagnostic code or selected symbol code owned by this record.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @param {number} index - Zero-based UTF-16 offset in the physical line.
 * @param {string} message - Human-readable explanation retained in the diagnostic.
 * @param {string} suggestion - Actionable correction text retained in the diagnostic.
 * @returns {Object} A record containing diagnostic.
 */
function lexicalError(code, location, index, message, suggestion) {
  return { diagnostic: codedDiagnostic(code, "syntax", "error", message, { location: { line: location.line, column: location.column + index } }, suggestion) };
}

/**
 * Lex a line and return original token spellings; malformed lexemes raise SyntaxError with structured
 * diagnostics. Compatibility helpers retain raw strings for valid lines and fail explicitly otherwise.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @returns {Array} The result returned by requireLexedLine(line).tokens.map.
 */

export function tokenize(line) {
  return requireLexedLine(line).tokens.map(/**
   * Project token.raw from the current record.
   * @responsibility computation
   * @param {unknown} token - Current typed lexeme or raw token text, according to the owning parser.
   * @returns {unknown} The token.raw value selected or validated above.
   */ (token) => token.raw);
}

/**
 * Lex a line and remove only an unquoted comment suffix; malformed lexemes raise SyntaxError.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function stripComment(line) {
  const { commentStart } = requireLexedLine(line);
  return commentStart === null ? line : line.slice(0, commentStart);
}

/**
 * Require successful lexical analysis and attach diagnostic records to SyntaxError on failure.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @returns {unknown} The result value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function requireLexedLine(line) {
  const result = lexVrlLine(line);
  if (result.diagnostics.length > 0) {
    const error = new SyntaxError(result.diagnostics[0].message);
    error.diagnostics = result.diagnostics;
    throw error;
  }
  return result;
}
