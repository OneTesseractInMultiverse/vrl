import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { readDocumentation } from "../scripts/documentation/documentation-files.mjs";
import { extractVrlExamples, exampleInventoryProblems } from "../scripts/documentation/markdown-examples.mjs";
import { exampleSource, exampleFacts, pointerValue, sourceFingerprint } from "../scripts/documentation/example-facts.mjs";
import { contractTable } from "../scripts/documentation/contract-tables.mjs";

const example = { id: "sample", kind: "document", source: "route Sample" };
const contract = { kind: "document", sha256: sourceFingerprint(example.source), expected: { ok: true, diagnostics: [], facts: { "/model/name": "Sample" } } };
const fenced = source => `\`\`\`vrl example=sample kind=document\n${source}\n\`\`\``;

for (const marker of ["```", "~~~~"]) {
  test(`${marker} fences retain exact source text, deindent and report Markdown locations`, () => {
    const source = ['route "A#B"', 'note "  \\"quoted\\" \\\\ path  "'].join("\n");
    const markdown = `Intro\r\n\r\n  ${marker}vrl example=sample kind=document\r\n${source.split("\n").map(line => `  ${line}`).join("\r\n")}\r\n  ${marker}${marker[0]}\r\n`;
    assert.deepEqual(extractVrlExamples(markdown, "guide.md"), [{ ...example, source, file: "guide.md", line: 4 }]);
  });
}
test("VRL-looking fences inside a longer documentation fence are not executed", () => {
  assert.deepEqual(extractVrlExamples(`\`\`\`\`text\n${fenced("route Hidden")}\n\`\`\`\`\n${fenced("route Sample")}`, "guide.md").map(item => item.source), ["route Sample"]);
});
test("shorter fences and a different marker do not terminate a VRL example", () => {
  assert.equal(extractVrlExamples("~~~~vrl example=sample kind=invalid\nroute A\n~~~\n```\n~~~~", "guide.md")[0].source, "route A\n~~~\n```");
});
for (const info of ["vrl", "vrl example=sample", "vrl example=Sample kind=document", "vrl example=sample kind=unknown", "vrl example=sample kind=document skip=true", "VRL example=sample kind=document"]) {
  test(`untested or malformed VRL metadata fails clearly: ${info}`, () => {
    assert.throws(() => extractVrlExamples(`\`\`\`${info}\nroute A\n\`\`\``, "guide.md"), /guide.md:1: VRL fence requires/);
  });
}
test("an unclosed tagged fence cannot silently swallow later documentation", () => {
  assert.throws(() => extractVrlExamples("```vrl example=sample kind=document\nroute A", "guide.md"), /guide.md:2: unclosed VRL fence/);
});
test("one matching expectation satisfies the inventory", () => {
  assert.deepEqual(exampleInventoryProblems([example], { sample: contract }), []);
});
for (const [name, examples, cases, problem] of [
  ["missing", [example], {}, "Missing expectation: sample"],
  ["malformed inventory", [example], null, "Example expectations must be an object"],
  ["null record", [example], { sample: null }, "Invalid expectation: sample"],
  ["orphan", [], { sample: contract }, "Orphan expectation: sample"],
  ["duplicate", [example, example], { sample: contract }, "Duplicate example: sample"],
  ["empty", [], {}, "No documentation examples discovered"],
  ["kind", [example], { sample: { ...contract, kind: "fragment" } }, "Changed kind: sample"],
  ["fingerprint", [example], { sample: { ...contract, sha256: "" } }, "Missing source fingerprint: sample"],
  ["facts", [example], { sample: { ...contract, expected: { ...contract.expected, facts: {} } } }, "Missing model facts: sample"],
  ["diagnostics", [example], { sample: { ...contract, expected: { ...contract.expected, diagnostics: undefined } } }, "Missing diagnostics: sample"],
  ["malformed invalid diagnostics", [{ ...example, kind: "invalid" }], { sample: { kind: "invalid", sha256: contract.sha256, expected: { ok: false, facts: {}, diagnostics: {} } } }, "Missing blocking diagnostic: sample"],
  ["outcome", [example], { sample: { ...contract, expected: { ...contract.expected, ok: false } } }, "Invalid outcome: sample"],
  ["prefix", [example], { sample: { ...contract, prefix: "route Extra\n" } }, "Invalid fragment context: sample"],
  ["suffix", [example], { sample: { ...contract, suffix: "\nexit" } }, "Invalid fragment suffix: sample"],
  ["unwrapped fragment", [{ ...example, kind: "fragment" }], { sample: { ...contract, kind: "fragment" } }, "Invalid fragment context: sample"],
  ["warning-only failure", [{ ...example, kind: "invalid" }], { sample: { ...contract, kind: "invalid", expected: { ok: false, diagnostics: [["validation", "warning", "SHORT", 1, 1]], facts: {} } } }, "Missing blocking diagnostic: sample"]
]) {
  test(`${name} inventory drift is rejected`, () => {
    assert.equal(exampleInventoryProblems(examples, cases).includes(problem), true);
  });
}
test("fragment context is explicit and preserves diagnostic line offsets", () => {
  assert.equal(exampleSource({ kind: "fragment", source: "metadata country=CR" }, { prefix: "route Context\n", suffix: "\nstart\nexit" }), "route Context\nmetadata country=CR\nstart\nexit");
});
test("source edits require renewed review even when the selected model facts would match", () => {
  assert.notEqual(sourceFingerprint("route Sample\n# revised"), contract.sha256);
});
test("fact pointers preserve escaped keys and explicit null values", () => {
  assert.equal(pointerValue({ "a/b": { "~c": null } }, "/a~1b/~0c"), null);
});
for (const pointer of ["name", "/missing", "/constructor", "/name/missing"]) {
  test(`absent or inherited facts fail instead of yielding an empty expectation: ${pointer}`, () => {
    assert.throws(() => pointerValue({ name: "Sample" }, pointer), /Expected JSON pointer|Missing documented fact/);
  });
}
test("failure observations include exact diagnostics and absence of all derived outputs", () => {
  const result = { ok: false, model: null, layout: null, json: null, diagnostics: [{ kind: "syntax", severity: "error", code: "VRL_LEX_UNSUPPORTED_ESCAPE", location: { line: 2, column: 10 } }] };
  assert.deepEqual(exampleFacts(result, []), { ok: false, diagnostics: [["syntax", "error", "VRL_LEX_UNSUPPORTED_ESCAPE", 2, 10]], outputs: [false, false, false], facts: {}, geometry: null });
});

const table = "<!-- vrl-table:limits -->\n| Option | Default |\n| --- | --- |\n| maxLines | 20000 |\n<!-- /vrl-table:limits -->";
test("marked tables preserve all constraint cells in source order", () => {
  assert.deepEqual(contractTable(table, "limits"), [["maxLines", "20000"]]);
});
for (const [name, markdown] of [
  ["missing", ""], ["duplicated", table + table],
  ["reversed", "<!-- /vrl-table:limits -->\n<!-- vrl-table:limits -->"],
  ["ragged", table.replace("maxLines | 20000", "maxLines")],
  ["invalid separator", table.replace("--- | ---", "default | value")],
  ["missing row delimiters", table.replace("| maxLines | 20000 |", "maxLines | 20000")]
]) {
  test(`${name} constraint table fails instead of skipping verification`, () => {
    assert.throws(() => contractTable(markdown, "limits"), /contract table/);
  });
}
test("discovery covers root, nested docs and package Markdown without dependency or generated files", t => {
  const root = mkdtempSync(join(tmpdir(), "vrl-documents-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of ["README.md", "CONTRIBUTING.md", "docs/nested/guide.md", "packages/adapter/README.md", "packages/adapter/node_modules/dependency/README.md", "node_modules/README.md", ".consumers/current/README.md", "docs/source.js"]) {
    const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, "text");
  }
  assert.deepEqual(readDocumentation(root).map(item => item.file), ["CONTRIBUTING.md", "README.md", "docs/nested/guide.md", "packages/adapter/README.md"]);
});
