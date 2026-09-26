// CSS named colors, plus the SVG paint keyword none. No resource references.
const PAINT_KEYWORDS = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor none`.split(" "));
const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const COMPONENT = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?$/;

/**
 * Require paint text in the renderer's supported color grammar; reject unsafe or unsupported values.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} The result returned by value.trim.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function validatePaint(value) {
  if (typeof value !== "string" || !isSupportedPaint(value.trim())) {
    throw new TypeError("Paint must be a supported color or none; resource references and CSS expressions are not allowed.");
  }
  return value.trim();
}

/**
 * Recognize allowed named, hex and numeric functional colors without accepting URLs or arbitrary CSS.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function isSupportedPaint(value) {
  return HEX_COLOR.test(value) || PAINT_KEYWORDS.has(value.toLowerCase()) || isColorFunction(value);
}

/**
 * Validate supported RGB/HSL functional color syntax and channel counts.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The literal false for this branch. The result of the documented comparison or calculation.
 */
function isColorFunction(value) {
  const match = /^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/i.exec(value);
  if (match === null) return false;
  const name = match[1].toLowerCase();
  const parts = match[2].split(",").map(/**
   * Apply part.trim to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @returns {string} The result returned by part.trim.
   */ (part) => part.trim());
  if (parts.length !== (name.endsWith("a") ? 4 : 3)) return false;
  if (!parts.every(/**
   * Evaluate the selection condition COMPONENT.test(part) && Number.isFinite(Number.parseFloat(part)).
   * @responsibility computation
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (part) => COMPONENT.test(part) && Number.isFinite(Number.parseFloat(part)))) return false;
  const channels = parts.slice(0, 3);
  const validChannels = name.startsWith("rgb") ? validRgb(channels) : validHsl(channels);
  return validChannels && (parts.length === 3 || inRange(parts[3], parts[3].endsWith("%") ? 100 : 1));
}

/**
 * Check RGB channel and optional alpha values against their numeric or percentage ranges.
 * @responsibility computation
 * @param {Array} channels - Parsed color channel tokens, including optional alpha.
 * @returns {boolean} The result returned by channels.every.
 */
function validRgb(channels) {
  const percentages = channels[0].endsWith("%");
  return channels.every(/**
   * Evaluate the selection condition part.endsWith("%") === percentages && inRange(part, percentages ? 100 :
   * 255).
   * @responsibility computation
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (part) => part.endsWith("%") === percentages && inRange(part, percentages ? 100 : 255));
}

/**
 * Check hue, saturation, lightness and optional alpha syntax and ranges.
 * @responsibility computation
 * @param {Array} channels - Parsed color channel tokens, including optional alpha.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function validHsl(channels) {
  return !channels[0].endsWith("%") && channels.slice(1).every(/**
   * Evaluate the selection condition part.endsWith("%") && inRange(part, 100).
   * @responsibility computation
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (part) => part.endsWith("%") && inRange(part, 100));
}

/**
 * Check one color-channel token against its allowed numeric maximum.
 * @responsibility computation
 * @param {string} part - One parsed color-channel token, including its optional percent suffix.
 * @param {number} maximum - Inclusive numeric channel maximum; percentages use their supported percentage bound.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function inRange(part, maximum) {
  const number = Number.parseFloat(part);
  return number >= 0 && number <= maximum;
}
