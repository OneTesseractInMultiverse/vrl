/**
 * Convert a value to text, reject invalid XML 1.0 characters and encode reserved characters and carriage
 * returns.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} XML-safe text preserving valid Unicode and carriage returns without silent replacement.
 */
export function escapeXml(value) {
  const text = String(value);
  assertXmlCharacters(text);
  return encodeXmlText(text);
}

/**
 * Reject forbidden XML 1.0 controls, isolated surrogates and noncharacters instead of silently replacing
 * source text. XML 1.0 Char production; Unicode mode permits valid surrogate pairs.
 * @responsibility computation
 * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @returns {void} Returns normally for permitted XML 1.0 text; otherwise throws TypeError.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */

export function assertXmlCharacters(text) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(text)) {
    throw new TypeError("XML text must contain valid XML 1.0 characters.");
  }
}

/**
 * Escape ampersands, angle brackets, quotes and carriage returns while preserving valid Unicode text.
 * @responsibility computation
 * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @returns {string} Text with XML-reserved characters and carriage returns encoded.
 */
function encodeXmlText(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("\r", "&#13;");
}
