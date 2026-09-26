/**
 * Scan supported standalone Markdown fences, retaining source lines and IDs; reject malformed VRL tags and
 * unclosed examples. Fenced-block subset used by repository docs: backticks/tildes, 0–3 spaces.
 * @responsibility computation
 * @param {string} markdown - Repository Markdown text to inspect without executing its contents.
 * @param {string} file - Repository-relative source path used in discovery or diagnostics.
 * @returns {unknown} The examples value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */

export function extractVrlExamples(markdown, file) {
  const examples = [];
  let fence = null;
  for (const [index, line] of markdown.replaceAll("\r\n", "\n").split("\n").entries()) {
    if (fence !== null) {
      if (new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`).test(line)) {
        if (fence.example) examples.push({ ...fence.example, source: fence.lines.join("\n") });
        fence = null;
      } else {
        fence.lines.push(line.replace(new RegExp(`^ {0,${fence.indent}}`), ""));
      }
      continue;
    }
    const opening = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
    if (!opening) continue;
    const info = opening[3].trim();
    fence = { marker: opening[2][0], length: opening[2].length, indent: opening[1].length, lines: [] };
    if (!/^vrl(?:\s|$)/i.test(info)) continue;
    const tag = /^vrl example=([a-z][a-z0-9-]*) kind=(document|fragment|invalid)$/.exec(info);
    if (!tag) throw new Error(`${file}:${index + 1}: VRL fence requires example=<id> kind=document|fragment|invalid`);
    fence.example = { id: tag[1], kind: tag[2], file, line: index + 2 };
  }
  if (fence?.example) throw new Error(`${file}:${fence.example.line}: unclosed VRL fence`);
  return examples;
}

/**
 * Compare discovered examples with reviewed expectations and report duplicate, missing, orphaned or malformed
 * contracts.
 * @responsibility computation
 * @param {unknown} examples - Discovered executable documentation examples.
 * @param {unknown} cases - Reviewed example expectations indexed by stable example ID.
 * @returns {Array} The ordered records or values assembled above. The result returned by problems.sort.
 */
export function exampleInventoryProblems(examples, cases) {
  if (!isRecord(cases)) return ["Example expectations must be an object"];
  const problems = [];
  const seen = new Set();
  for (const example of examples) {
    if (seen.has(example.id)) problems.push(`Duplicate example: ${example.id}`);
    seen.add(example.id);
    if (!Object.hasOwn(cases, example.id)) { problems.push(`Missing expectation: ${example.id}`); continue; }
    const contract = cases[example.id];
    if (!isRecord(contract)) { problems.push(`Invalid expectation: ${example.id}`); continue; }
    if (contract.kind !== example.kind) problems.push(`Changed kind: ${example.id}`);
    if (!/^[a-f0-9]{64}$/.test(contract.sha256 ?? "")) problems.push(`Missing source fingerprint: ${example.id}`);
    if (example.kind === "fragment" ? typeof contract.prefix !== "string" || !contract.prefix.endsWith("\n") : contract.prefix !== undefined) problems.push(`Invalid fragment context: ${example.id}`);
    if (contract.suffix !== undefined && (example.kind !== "fragment" || typeof contract.suffix !== "string" || !contract.suffix.startsWith("\n"))) problems.push(`Invalid fragment suffix: ${example.id}`);
    if (!contract.expected || contract.expected.ok !== (example.kind !== "invalid")) problems.push(`Invalid outcome: ${example.id}`);
    if (!Array.isArray(contract.expected?.diagnostics)) problems.push(`Missing diagnostics: ${example.id}`);
    if (!isRecord(contract.expected?.facts) || (example.kind !== "invalid" && Object.keys(contract.expected.facts).length === 0)) problems.push(`Missing model facts: ${example.id}`);
    if (example.kind === "invalid" && (!Array.isArray(contract.expected?.diagnostics) || !contract.expected.diagnostics.some(/**
     * Evaluate the selection condition Array.isArray(item) && item[1] === "error".
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The result of the documented comparison or calculation.
     */ item => Array.isArray(item) && item[1] === "error"))) problems.push(`Missing blocking diagnostic: ${example.id}`);
  }
  for (const id of Object.keys(cases)) if (!seen.has(id)) problems.push(`Orphan expectation: ${id}`);
  if (examples.length === 0) problems.push("No documentation examples discovered");
  return problems.sort();
}

/**
 * Recognize a non-null, non-array object for documentation fixture validation.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
