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
const render = (options) => renderTopoSvg(result.model, result.layout, options);

const DEFINITIONS = [
  { name: "light theme", read: () => LIGHT_THEME, key: "background", options: { theme: "light" } },
  { name: "dark theme", read: () => DARK_THEME, key: "background", options: { theme: "dark" } },
  ...["federation", "french", "spanish"].map((symbology) => ({
    name: `${symbology} symbols`, read: () => resolveSymbolProfile(symbology), key: "start", options: { symbology }
  })),
  ...["en", "es"].flatMap((language) => [
    { name: `${language} text`, read: () => diagramText(language), key: "topo", options: { language } },
    { name: `${language} element names`, read: () => diagramText(language).elements, key: "start", options: { language } },
    { name: `${language} value names`, read: () => diagramText(language).values, key: "bolts", options: { language } }
  ])
];
const MUTATIONS = [
  ["assigning a value", (record, key) => { record[key] = "Changed"; }],
  ["adding a value", (record) => { record.custom = "Changed"; }],
  ["redefining a value", (record, key) => { Object.defineProperty(record, key, { value: "Changed" }); }],
  ["replacing the prototype", (record) => { Object.setPrototypeOf(record, { custom: "Changed" }); }]
];

for (const { name, read, key, options } of DEFINITIONS) {
  test(`${name} is a frozen shared definition`, () => {
    assert.equal(Object.isFrozen(read()), true);
  });
  for (const [operation, mutate] of MUTATIONS) {
    test(`${name} rejects ${operation} in strict code`, () => {
      assert.throws(() => mutate(read(), key), TypeError);
    });
  }
  if (Object.hasOwn(read(), key)) {
    test(`${name} rejects deleting an existing entry`, () => {
      assert.throws(() => { delete read()[key]; }, TypeError);
    });
  }
  test(`${name} attempted changes cannot alter later output in the same process`, () => {
    const before = render(options);
    const record = read();
    const value = record[key];
    const changed = Reflect.set(record, key, "Changed");
    assert.deepEqual([changed, read()[key], render(options)], [false, value, before]);
  });
}

for (const language of ["en", "es"]) {
  for (const dictionary of ["elements", "values"]) {
    test(`${language} cannot replace the ${dictionary} dictionary`, () => {
      assert.throws(() => { diagramText(language)[dictionary] = {}; }, TypeError);
    });
  }
}

for (const name of ["__proto__", "constructor", "toString", "hasOwnProperty", "not-supported"]) {
  test(`profile selector ${name} returns the frozen fallback instead of an inherited value`, () => {
    assert.equal(resolveSymbolProfile(name), resolveSymbolProfile("federation"));
  });
  test(`language selector ${name} returns the supported fallback`, () => {
    assert.equal(resolveDiagramLanguage(name), "en");
  });
  test(`dictionary selector ${name} returns the frozen English dictionary`, () => {
    assert.equal(diagramText(name), diagramText("en"));
  });
  test(`unknown element label ${name} remains literal text`, () => {
    assert.equal(elementLabel(name), name);
  });
  test(`unknown translated value ${name} remains literal text`, () => {
    assert.equal(localizeDetailValue(name, "es"), name);
  });
  test(`unknown symbol type ${name} uses the element identifier fallback`, () => {
    assert.equal(symbolCode({ type: name, id: "Zebra", attributes: {} }), "ZE");
  });
  test(`inherited selector ${name} cannot change the default rendering`, () => {
    assert.equal(render({ language: name, symbology: name }), render({ language: "en", symbology: "federation" }));
  });
}

for (const alias of ["EN-US", "english", "en-gb", "es-CR", "espanol", "spanish"]) {
  test(`language alias ${alias} still selects the correct frozen dictionary`, () => {
    assert.equal(diagramText(alias), diagramText(alias.toLowerCase().startsWith("en") ? "en" : "es"));
  });
}

for (const theme of ["light", "dark"]) {
  test(`${theme} explicit overrides affect only the requested rendering`, () => {
    const before = render({ theme });
    const tokens = Object.freeze({ background: " #abcdef " });
    const customized = render({ theme, themeTokens: tokens });
    assert.deepEqual([customized.includes('fill="#abcdef"'), customized === before, render({ theme }), tokens.background], [true, false, before, " #abcdef "]);
  });
  test(`${theme} resolved themes are owned copies that can be edited without leaking`, () => {
    const before = render({ theme });
    const first = resolveTheme(theme);
    const second = resolveTheme(theme);
    first.background = "#abcdef";
    assert.deepEqual([first === second, first.background, second.background, render({ theme })], [false, "#abcdef", theme === "light" ? LIGHT_THEME.background : DARK_THEME.background, before]);
  });
  test(`${theme} editing the supplied override after resolution cannot change that result`, () => {
    const tokens = { background: "#abcdef" };
    const resolved = resolveTheme(theme, tokens);
    tokens.background = "#fedcba";
    assert.equal(resolved.background, "#abcdef");
  });
  test(`${theme} unsupported overrides throw without corrupting the next rendering`, () => {
    const before = render({ theme });
    let failure;
    try { render({ theme, themeTokens: { background: "url(#bad)" } }); } catch (error) { failure = error; }
    assert.deepEqual([failure instanceof TypeError, render({ theme })], [true, before]);
  });
}

test("explicit language and symbol choices remain local across interleaved consumers", () => {
  const before = createDiagramState(SOURCE);
  const spanish = createDiagramState(SOURCE, { language: "es", symbology: "spanish", theme: "dark" });
  assert.deepEqual([spanish.svg.includes("Resumen de ruta"), spanish.svg.includes(">INI<"), createDiagramState(SOURCE)], [true, true, before]);
});
