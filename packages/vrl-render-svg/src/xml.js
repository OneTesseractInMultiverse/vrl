export function escapeXml(value) {
  const text = String(value);
  assertXmlCharacters(text);
  return encodeXmlText(text);
}

/** XML 1.0 Char production; Unicode mode permits valid surrogate pairs. */
export function assertXmlCharacters(text) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(text)) {
    throw new TypeError("XML text must contain valid XML 1.0 characters.");
  }
}

function encodeXmlText(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("\r", "&#13;");
}
