import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute } from "@subvertic/vrl-core";
import { createDiagramState } from "@subvertic/vrl-diagram";
import {
  LIGHT_THEME, DARK_THEME, diagramText, elementLabel, localizeDetailValue,
  renderTopoSvg, resolveDiagramLanguage, resolveSymbolProfile, resolveTheme, symbolCode
} from "@subvertic/vrl-render-svg";

const SOURCE = 'route Defaults\nstart\nrappel pitch height=12m rope=24m anchor=bolts\nexit';
const result = compileRoute(SOURCE);
/**
 * Apply renderTopoSvg to the supplied arguments; retain the callee's return and failure behavior.
 * @responsibility computation
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {unknown} The result returned by renderTopoSvg.
 */
const render = (options) => renderTopoSvg(result.model, result.layout, options);

const DEFINITIONS = [
  { name: "light theme", /**
   * Return the selected LIGHT_THEME binding unchanged.
   * @responsibility computation
   * @returns {unknown} The LIGHT_THEME value selected or validated above.
   */ read: () => LIGHT_THEME, key: "background", options: { theme: "light" } },
  { name: "dark theme", /**
   * Return the selected DARK_THEME binding unchanged.
   * @responsibility computation
   * @returns {unknown} The DARK_THEME value selected or validated above.
   */ read: () => DARK_THEME, key: "background", options: { theme: "dark" } },
  ...["federation", "french", "spanish"].map(/**
   * Project name, read, key, options into the record required by ["federation", "french", "spanish"].map.
   * @responsibility computation
   * @param {string} symbology - Symbol profile name used for element codes and legend entries.
   * @returns {Object} A record containing name, read, key, options.
   */ (symbology) => ({
    name: `${symbology} symbols`, /**
     * Apply resolveSymbolProfile to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @returns {unknown} The result returned by resolveSymbolProfile.
     */ read: () => resolveSymbolProfile(symbology), key: "start", options: { symbology }
  })),
  ...["en", "es"].flatMap(/**
   * Project the current entry into an ordered tuple for ["en", "es"].flatMap.
   * @responsibility computation
   * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
   * @returns {Array} The ordered records or values assembled above.
   */ (language) => [
    { name: `${language} text`, /**
     * Apply diagramText to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @returns {unknown} The result returned by diagramText.
     */ read: () => diagramText(language), key: "topo", options: { language } },
    { name: `${language} element names`, /**
     * Project diagramText(language).elements from the current record.
     * @responsibility computation
     * @returns {unknown} The diagramText(language).elements value selected or validated above.
     */ read: () => diagramText(language).elements, key: "start", options: { language } },
    { name: `${language} value names`, /**
     * Project diagramText(language).values from the current record.
     * @responsibility computation
     * @returns {unknown} The diagramText(language).values value selected or validated above.
     */ read: () => diagramText(language).values, key: "bolts", options: { language } }
  ])
];
const MUTATIONS = [
  ["assigning a value", /**
   * Deliberately modify record[key] in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @param {unknown} key - Own-property key, metadata key or configured loader result key.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (record, key) => { record[key] = "Changed"; }],
  ["adding a value", /**
   * Deliberately modify record.custom in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (record) => { record.custom = "Changed"; }],
  ["redefining a value", /**
   * Attempt to redefine an existing property on a shared frozen rendering record; the test requires rejection.
   * @responsibility computation
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @param {unknown} key - Own-property key, metadata key or configured loader result key.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (record, key) => { Object.defineProperty(record, key, { value: "Changed" }); }],
  ["replacing the prototype", /**
   * Attempt to replace the prototype of a shared frozen rendering record; the test requires rejection.
   * @responsibility computation
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (record) => { Object.setPrototypeOf(record, { custom: "Changed" }); }]
];

for (const { name, read, key, options } of DEFINITIONS) {
  test(`${name} is a frozen shared definition`, /**
   * Verify ${name} is a frozen shared definition; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(Object.isFrozen(read()), true);
  });
  for (const [operation, mutate] of MUTATIONS) {
    test(`${name} rejects ${operation} in strict code`, /**
     * Verify ${name} rejects ${operation} in strict code; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise mutate so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by mutate.
       */ () => mutate(read(), key), TypeError);
    });
  }
  if (Object.hasOwn(read(), key)) {
    test(`${name} rejects deleting an existing entry`, /**
     * Verify ${name} rejects deleting an existing entry; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise read so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => { delete read()[key]; }, TypeError);
    });
  }
  test(`${name} attempted changes cannot alter later output in the same process`, /**
   * Verify ${name} attempted changes cannot alter later output in the same process; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const before = render(options);
    const record = read();
    const value = record[key];
    const changed = Reflect.set(record, key, "Changed");
    assert.deepEqual([changed, read()[key], render(options)], [false, value, before]);
  });
}

for (const language of ["en", "es"]) {
  for (const dictionary of ["elements", "values"]) {
    test(`${language} cannot replace the ${dictionary} dictionary`, /**
     * Verify ${language} cannot replace the ${dictionary} dictionary; arrange the scenario and make its single
     * direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise diagramText so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => { diagramText(language)[dictionary] = {}; }, TypeError);
    });
  }
}

for (const name of ["__proto__", "constructor", "toString", "hasOwnProperty", "not-supported"]) {
  test(`profile selector ${name} returns the frozen fallback instead of an inherited value`, /**
   * Verify profile selector ${name} returns the frozen fallback instead of an inherited value; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(resolveSymbolProfile(name), resolveSymbolProfile("federation"));
  });
  test(`language selector ${name} returns the supported fallback`, /**
   * Verify language selector ${name} returns the supported fallback; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(resolveDiagramLanguage(name), "en");
  });
  test(`dictionary selector ${name} returns the frozen English dictionary`, /**
   * Verify dictionary selector ${name} returns the frozen English dictionary; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(diagramText(name), diagramText("en"));
  });
  test(`unknown element label ${name} remains literal text`, /**
   * Verify unknown element label ${name} remains literal text; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(elementLabel(name), name);
  });
  test(`unknown translated value ${name} remains literal text`, /**
   * Verify unknown translated value ${name} remains literal text; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(localizeDetailValue(name, "es"), name);
  });
  test(`unknown symbol type ${name} uses the element identifier fallback`, /**
   * Verify unknown symbol type ${name} uses the element identifier fallback; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(symbolCode({ type: name, id: "Zebra", attributes: {} }), "ZE");
  });
  test(`inherited selector ${name} cannot change the default rendering`, /**
   * Verify inherited selector ${name} cannot change the default rendering; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(render({ language: name, symbology: name }), render({ language: "en", symbology: "federation" }));
  });
}

for (const alias of ["EN-US", "english", "en-gb", "es-CR", "espanol", "spanish"]) {
  test(`language alias ${alias} still selects the correct frozen dictionary`, /**
   * Verify language alias ${alias} still selects the correct frozen dictionary; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(diagramText(alias), diagramText(alias.toLowerCase().startsWith("en") ? "en" : "es"));
  });
}

for (const theme of ["light", "dark"]) {
  test(`${theme} explicit overrides affect only the requested rendering`, /**
   * Verify ${theme} explicit overrides affect only the requested rendering; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const before = render({ theme });
    const tokens = Object.freeze({ background: " #abcdef " });
    const customized = render({ theme, themeTokens: tokens });
    assert.deepEqual([customized.includes('fill="#abcdef"'), customized === before, render({ theme }), tokens.background], [true, false, before, " #abcdef "]);
  });
  test(`${theme} resolved themes are owned copies that can be edited without leaking`, /**
   * Verify ${theme} resolved themes are owned copies that can be edited without leaking; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const before = render({ theme });
    const first = resolveTheme(theme);
    const second = resolveTheme(theme);
    first.background = "#abcdef";
    assert.deepEqual([first === second, first.background, second.background, render({ theme })], [false, "#abcdef", theme === "light" ? LIGHT_THEME.background : DARK_THEME.background, before]);
  });
  test(`${theme} editing the supplied override after resolution cannot change that result`, /**
   * Verify ${theme} editing the supplied override after resolution cannot change that result; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const tokens = { background: "#abcdef" };
    const resolved = resolveTheme(theme, tokens);
    tokens.background = "#fedcba";
    assert.equal(resolved.background, "#abcdef");
  });
  test(`${theme} unsupported overrides throw without corrupting the next rendering`, /**
   * Verify ${theme} unsupported overrides throw without corrupting the next rendering; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const before = render({ theme });
    let failure;
    try { render({ theme, themeTokens: { background: "url(#bad)" } }); } catch (error) { failure = error; }
    assert.deepEqual([failure instanceof TypeError, render({ theme })], [true, before]);
  });
}

test("explicit language and symbol choices remain local across interleaved consumers", /**
 * Verify explicit language and symbol choices remain local across interleaved consumers; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const before = createDiagramState(SOURCE);
  const spanish = createDiagramState(SOURCE, { language: "es", symbology: "spanish", theme: "dark" });
  assert.deepEqual([spanish.svg.includes("Resumen de ruta"), spanish.svg.includes(">INI<"), createDiagramState(SOURCE)], [true, true, before]);
});
