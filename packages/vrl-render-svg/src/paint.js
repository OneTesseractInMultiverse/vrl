// CSS named colors, plus the SVG paint keyword none. No resource references.
const PAINT_KEYWORDS = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor none`.split(" "));
const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const COMPONENT = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?$/;

export function validatePaint(value) {
  if (typeof value !== "string" || !isSupportedPaint(value.trim())) {
    throw new TypeError("Paint must be a supported color or none; resource references and CSS expressions are not allowed.");
  }
  return value.trim();
}

function isSupportedPaint(value) {
  return HEX_COLOR.test(value) || PAINT_KEYWORDS.has(value.toLowerCase()) || isColorFunction(value);
}

function isColorFunction(value) {
  const match = /^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/i.exec(value);
  if (match === null) return false;
  const name = match[1].toLowerCase();
  const parts = match[2].split(",").map((part) => part.trim());
  if (parts.length !== (name.endsWith("a") ? 4 : 3)) return false;
  if (!parts.every((part) => COMPONENT.test(part) && Number.isFinite(Number.parseFloat(part)))) return false;
  const channels = parts.slice(0, 3);
  const validChannels = name.startsWith("rgb") ? validRgb(channels) : validHsl(channels);
  return validChannels && (parts.length === 3 || inRange(parts[3], parts[3].endsWith("%") ? 100 : 1));
}

function validRgb(channels) {
  const percentages = channels[0].endsWith("%");
  return channels.every((part) => part.endsWith("%") === percentages && inRange(part, percentages ? 100 : 255));
}

function validHsl(channels) {
  return !channels[0].endsWith("%") && channels.slice(1).every((part) => part.endsWith("%") && inRange(part, 100));
}

function inRange(part, maximum) {
  const number = Number.parseFloat(part);
  return number >= 0 && number <= maximum;
}
