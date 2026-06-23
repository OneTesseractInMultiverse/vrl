import { parseMeasurementToken } from "./measurements.js";

const REDIRECTION_FIELDS = new Set(["redirection", "redirections"]);
const STAGE_FIELD = "stages";

export function isRedirectionField(fieldName) {
  return REDIRECTION_FIELDS.has(fieldName);
}

export function isRappelStagesField(fieldName) {
  return fieldName === STAGE_FIELD;
}

export function parseRedirectionToken(token) {
  const parts = token.split(":");

  if (parts.length > 2) {
    return {
      ok: false,
      reason: "expected redirection distance such as 12m:left"
    };
  }

  const [rawDistance, rawSide = "unknown"] = parts;
  const distance = parseMeasurementToken(rawDistance);

  if (distance.ok === false) {
    return {
      ok: false,
      reason: "expected redirection distance such as 12m:left"
    };
  }

  return {
    ok: true,
    value: {
      distance: distance.value,
      side: rawSide.trim().toLowerCase()
    }
  };
}

export function parseRedirectionsToken(token) {
  const tokens = splitList(token, ",");
  const parsed = tokens.map(parseRedirectionToken);
  const failed = parsed.find((entry) => entry.ok === false);

  if (tokens.length === 0 || failed !== undefined) {
    return {
      ok: false,
      reason: "expected redirections such as 12m:left,27m:right"
    };
  }

  return {
    ok: true,
    value: parsed.map((entry) => entry.value)
  };
}

export function parseRappelStagesToken(token) {
  const tokens = splitList(token, "+");
  const parsed = tokens.map(parseMeasurementToken);
  const failed = parsed.find((entry) => entry.ok === false);

  if (tokens.length < 2 || failed !== undefined) {
    return {
      ok: false,
      reason: "expected at least two stage lengths such as 20m+15m"
    };
  }

  return {
    ok: true,
    value: parsed.map((entry) => entry.value)
  };
}

export function normalizeRappelDetailValue(fieldName, value) {
  if (isRedirectionField(fieldName)) {
    const parsed = parseRedirectionsToken(value);
    return parsed.ok ? parsed.value : value;
  }

  if (isRappelStagesField(fieldName)) {
    const parsed = parseRappelStagesToken(value);
    return parsed.ok ? parsed.value : value;
  }

  return value;
}

function splitList(value, separator) {
  if (value === "") {
    return [];
  }

  return value.split(separator).map((entry) => entry.trim()).filter(Boolean);
}
