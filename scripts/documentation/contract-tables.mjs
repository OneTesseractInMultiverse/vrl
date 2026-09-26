/**
 * Extract a uniquely marked normative Markdown table and reject missing or malformed contract sections. Read
 * explicitly marked, simple pipe tables; reject ambiguous/incomplete data.
 * @responsibility computation
 * @param {string} markdown - Repository Markdown text to inspect without executing its contents.
 * @param {string} name - Normative table marker name to extract uniquely.
 * @returns {Array} The result returned by rows.slice.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */

export function contractTable(markdown, name) {
  const start = `<!-- vrl-table:${name} -->`;
  const end = `<!-- /vrl-table:${name} -->`;
  if (markdown.split(start).length !== 2 || markdown.split(end).length !== 2) throw new Error(`Expected one contract table: ${name}`);
  const begin = markdown.indexOf(start) + start.length;
  const finish = markdown.indexOf(end);
  if (finish < begin) throw new Error(`Reversed contract table: ${name}`);
  const lines = markdown.slice(begin, finish).trim().split(/\r?\n/);
  const rows = lines.map(/**
   * Apply line.trim().split("|").slice(1, -1).map to the supplied arguments; retain the callee's return and
   * failure behavior.
   * @responsibility computation
   * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
   * @returns {Array} The result returned by line.trim().split("|").slice(1, -1).map.
   */ line => line.trim().split("|").slice(1, -1).map(/**
   * Apply cell.trim to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} cell - Parsed normative table cell text.
   * @returns {string} The result returned by cell.trim.
   */ cell => cell.trim()));
  const columns = rows[0]?.length ?? 0;
  if (lines.length < 3 || columns === 0 || lines.some(/**
   * Evaluate the selection condition !/^\s*\|.*\|\s*$/.test(line).
   * @responsibility computation
   * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ line => !/^\s*\|.*\|\s*$/.test(line))
    || rows.some(/**
     * Evaluate the selection condition row.length !== columns.
     * @responsibility computation
     * @param {unknown} row - One prepared detail or legend row.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ row => row.length !== columns) || !rows[1].every(/**
     * Evaluate the selection condition /^:?-{3,}:?$/.test(cell).
     * @responsibility computation
     * @param {unknown} cell - Parsed normative table cell text.
     * @returns {boolean} The result returned by {}.test.
     */ cell => /^:?-{3,}:?$/.test(cell))) throw new Error(`Malformed contract table: ${name}`);
  return rows.slice(2);
}
