/** Read explicitly marked, simple pipe tables; reject ambiguous/incomplete data. */
export function contractTable(markdown, name) {
  const start = `<!-- vrl-table:${name} -->`;
  const end = `<!-- /vrl-table:${name} -->`;
  if (markdown.split(start).length !== 2 || markdown.split(end).length !== 2) throw new Error(`Expected one contract table: ${name}`);
  const begin = markdown.indexOf(start) + start.length;
  const finish = markdown.indexOf(end);
  if (finish < begin) throw new Error(`Reversed contract table: ${name}`);
  const lines = markdown.slice(begin, finish).trim().split(/\r?\n/);
  const rows = lines.map(line => line.trim().split("|").slice(1, -1).map(cell => cell.trim()));
  const columns = rows[0]?.length ?? 0;
  if (lines.length < 3 || columns === 0 || lines.some(line => !/^\s*\|.*\|\s*$/.test(line))
    || rows.some(row => row.length !== columns) || !rows[1].every(cell => /^:?-{3,}:?$/.test(cell))) throw new Error(`Malformed contract table: ${name}`);
  return rows.slice(2);
}
