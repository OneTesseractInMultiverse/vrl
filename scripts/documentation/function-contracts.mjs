import { parse } from "acorn";

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

/**
 * Inspect every implementation, including nested callbacks, without executing source.
 * Only documentation structure is enforceable here; reviewers own semantic accuracy.
 * @responsibility coordinator
 * @param {string} source - One JavaScript module or extracted Svelte script.
 * @param {string} filename - Repository-relative path used in actionable diagnostics.
 * @returns {{functions: number, violations: string[]}} Function count and ordered problems.
 */
export function inspectFunctionDocumentation(source, filename) {
  const comments = [];
  let ast;
  try { ast = parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true, onComment: comments }); }
  catch (error) { return { functions: 0, violations: [`${filename}: ${error.message}`] }; }
  const parents = new Map();
  const functions = [];
  visitNodes(ast, /**
   * Index ancestry and retain function nodes in source order.
   * @responsibility computation
   * @param {Object} node - Current syntax node.
   * @param {Object|null} parent - Immediate containing node, or null at the root.
   * @returns {void} Updates the invocation-local index and function list.
   */ (node, parent) => { parents.set(node, parent); if (FUNCTION_TYPES.has(node.type)) functions.push(node); });
  const violations = [];
  for (const node of functions) {
    const anchor = documentationAnchor(node, parents);
    const comment = precedingDocumentation(source, anchor.start, comments);
    const location = `${filename}:${node.loc.start.line}`;
    for (const problem of functionProblems(node, comment)) violations.push(`${location}: ${problem}`);
  }
  return { functions: functions.length, violations };
}

/**
 * Find the declaration or property to which a function's docblock belongs.
 * A callback needs its own block immediately before its function expression.
 * @responsibility computation
 * @param {Object} node - Function expression, declaration or arrow syntax node.
 * @param {Map<Object, Object|null>} parents - Syntax-node ancestry for this module.
 * @returns {Object} Node whose start must immediately follow the docblock.
 */
export function documentationAnchor(node, parents) {
  let anchor = node;
  const parent = parents.get(anchor);
  if (parent?.type === "ReturnStatement") anchor = parent;
  else if (parent?.type === "Property" && parent.value === anchor) anchor = parent;
  else if (parent?.type === "MethodDefinition") anchor = parent;
  else if (parent?.type === "VariableDeclarator" && parent.init === anchor) {
    const declaration = parents.get(parent);
    anchor = declaration.declarations.length === 1 ? declaration : node;
  }
  const container = parents.get(anchor);
  return container?.type === "ExportNamedDeclaration" || container?.type === "ExportDefaultDeclaration" ? container : anchor;
}

/**
 * Associate only the nearest contiguous JSDoc block, never an earlier function's comment.
 * @responsibility computation
 * @param {string} source - Original module text, including comments.
 * @param {number} start - Zero-based UTF-16 offset of the declaration anchor.
 * @param {Object[]} comments - Acorn comments in source order.
 * @returns {string|null} Unwrapped documentation text, or null when absent.
 */
function precedingDocumentation(source, start, comments) {
  let boundary = start;
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    if (comment.end > boundary) continue;
    if (comment.type === "Line" && /^\s*@ts-expect-error\b/.test(comment.value) && /^\s*$/.test(source.slice(comment.end, boundary))) { boundary = comment.start; continue; }
    return comment.type === "Block" && comment.value.startsWith("*") && /^\s*$/.test(source.slice(comment.end, boundary))
      ? comment.value.replace(/^\s*\*\s?/gm, "").trim() : null;
  }
  return null;
}

/**
 * Require a responsibility, a useful summary, exact parameter paths and a return contract.
 * Destructured inputs use positional names input1, input2, etc. and document each leaf.
 * @responsibility computation
 * @param {Object} node - Function syntax, including parameters and defaults.
 * @param {string|null} comment - Associated unwrapped JSDoc text.
 * @returns {string[]} Structural documentation problems; empty when the contract is complete.
 */
function functionProblems(node, comment) {
  if (comment === null) return ["missing function JSDoc"];
  const problems = [];
  const tags = documentationTags(comment);
  if (!/\S.{9}/s.test(comment.split(/(?:^|\n)@/)[0])) problems.push("describe the function's responsibility before its tags");
  const roles = tags.filter(/**
   * Select responsibility declarations for cardinality and vocabulary checks.
   * @responsibility computation
   * @param {Object} tag - Parsed documentation tag.
   * @returns {boolean} Whether the tag declares a responsibility.
   */ tag => tag.name === "responsibility");
  if (roles.length !== 1 || !/^(coordinator|computation)$/.test(roles[0].value)) problems.push("expected exactly one @responsibility coordinator or computation");
  const actual = [];
  for (const tag of tags) {
    if (tag.name !== "param" && tag.name !== "returns") continue;
    const parsed = tag.value.match(/^\{(.+)\}\s+(.*)$/s);
    if (!parsed || !parsed[1].trim() || !parsed[2].trim()) { problems.push(`@${tag.name} requires a type and description`); continue; }
    if (tag.name === "param") {
      const parameter = parsed[2].match(/^(\S+)\s+-\s+(\S[\s\S]*)$/);
      if (!parameter) problems.push("@param requires a name and description separated by ' - '");
      else actual.push((parameter[1].startsWith("[") ? parameter[1].slice(1, -1).split("=")[0] : parameter[1]));
    }
  }
  const expected = parameterPaths(node.params);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`@param paths must match (${expected.join(", ")}); found (${actual.join(", ")})`);
  if (tags.filter(/**
   * Select return contracts so missing and duplicate declarations both fail.
   * @responsibility computation
   * @param {Object} tag - Parsed documentation tag.
   * @returns {boolean} Whether the tag describes the returned value.
   */ tag => tag.name === "returns").length !== 1) problems.push("expected exactly one @returns contract");
  return problems;
}

/**
 * Parse tags at line starts while retaining multiline descriptions and nested record types.
 * @responsibility computation
 * @param {string} comment - JSDoc text with leading asterisks removed.
 * @returns {{name: string, value: string}[]} Ordered tags with trimmed values.
 */
function documentationTags(comment) {
  return [...comment.matchAll(/(?:^|\n)@(\w+)\s+([\s\S]*?)(?=\n@\w+\s|$)/g)].map(/**
   * Project a tag match into its name and complete value.
   * @responsibility computation
   * @param {RegExpMatchArray} match - Tag name and value capture groups.
   * @returns {{name: string, value: string}} Trimmed documentation tag.
   */ match => ({ name: match[1], value: match[2].trim() }));
}

/**
 * Expand signatures into ordered JSDoc parameter paths, preserving aliases and array slots.
 * @responsibility computation
 * @param {Object[]} parameters - Acorn parameter patterns, including rest/default patterns.
 * @returns {string[]} Root and destructured paths in signature order.
 */
export function parameterPaths(parameters) {
  const paths = [];
  parameters.forEach(/**
   * Expand one positional parameter into the enclosing contract's path list.
   * @responsibility computation
   * @param {Object} parameter - Parameter binding syntax.
   * @param {number} index - Zero-based signature position.
   * @returns {void} Appends paths to the invocation-local list.
   */ (parameter, index) => appendParameterPaths(parameter, `input${index + 1}`, paths, true));
  return paths;
}

/**
 * Recursively enumerate only supplied binding paths; default expressions are not parameters.
 * @responsibility computation
 * @param {Object} pattern - Current binding node.
 * @param {string} path - JSDoc path of this binding within its positional input.
 * @param {string[]} paths - Caller-owned ordered output, mutated by appending paths.
 * @param {boolean} root - Whether a simple identifier should use its declared name.
 * @returns {void} Appends the current path and any destructured descendants.
 */
function appendParameterPaths(pattern, path, paths, root) {
  if (pattern.type === "AssignmentPattern") return appendParameterPaths(pattern.left, path, paths, root);
  if (pattern.type === "RestElement") return appendParameterPaths(pattern.argument, path, paths, root);
  paths.push(root && pattern.type === "Identifier" ? pattern.name : path);
  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      if (property.type === "RestElement") appendParameterPaths(property.argument, `${path}.${property.argument.name}`, paths, false);
      else appendParameterPaths(property.value, `${path}.${property.key.name ?? property.key.value}`, paths, false);
    }
  } else if (pattern.type === "ArrayPattern") {
    pattern.elements.forEach(/**
     * Retain array-binding positions, including skipped slots, in the documentation path.
     * @responsibility computation
     * @param {Object|null} entry - Binding pattern, or null for an omitted slot.
     * @param {number} index - Original zero-based array position.
     * @returns {void} Appends paths only for a present binding.
     */ (entry, index) => { if (entry) appendParameterPaths(entry, `${path}[${index}]`, paths, false); });
  }
}

/**
 * Walk syntax nodes in source-tree order, ignoring primitive metadata and comments.
 * @responsibility coordinator
 * @param {Object|null} node - Current node, or an absent child.
 * @param {Function} visit - Synchronous visitor receiving each node and its parent.
 * @param {Object|null} parent - Containing node; null for the initial root.
 * @returns {void} Calls the visitor once per syntax node; visitor exceptions propagate.
 */
export function visitNodes(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) visitNodes(child, visit, node);
    } else if (value !== null && typeof value === "object") visitNodes(value, visit, node);
  }
}
