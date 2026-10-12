const EN = Object.freeze({ approach: "approach", canyon: "canyon", return: "return" });
const ES = Object.freeze({ approach: "aproximacion", canyon: "barranco", return: "retorno" });

/**
 * Format one supplied phase using field-specific vocabulary; unfamiliar compatible-view values stay literal.
 * @responsibility computation
 * @param {string} phase - Owned normalized membership, never an inherited value or an extension to promote.
 * @param {string} language - Resolved language; es selects Spanish, other values use English.
 * @returns {string} Complete phase label and value; no route order, boundaries or movement is inferred.
 */
export function phaseText(phase, language) {
  const values = language === "es" ? ES : EN;
  const value = Object.hasOwn(values, phase) ? values[phase] : phase;
  return `${language === "es" ? "Fase" : "Phase"}: ${value}`;
}
