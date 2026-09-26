import { parse } from "acorn";

/**
 * Parse test source, associate imported test/assertion bindings and inspect each callback for exactly one
 * direct assertion. Repository convention: inline node:test callbacks and imported strict assertions.
 * @responsibility coordinator
 * @param {string} source - Exact source text inspected or transformed without execution.
 * @param {string} filename - Filesystem or repository-relative filename used by the adapter.
 * @returns {Object} A record containing tests, violations.
 */

export function inspectTestPolicy(source, filename) {
  let ast;
  try { ast = parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true }); }
  catch (error) { return { tests: 0, violations: [`${filename}: ${error.message}`] }; }
  const tests = importBindings(ast, "node:test", ["test", "it"]);
  const assertions = importBindings(ast, "node:assert/strict");
  const parents = new Map();
  const calls = [];
  walk(ast, /**
   * Build an invocation-local parent index and call list for test/assertion ownership analysis.
   * @responsibility computation
   * @param {Object} node - Acorn syntax node; positions refer to this source module.
   * @param {unknown} parent - Immediate containing syntax node, or null at the root.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (node, parent) => { parents.set(node, parent); if (node.type === "CallExpression") calls.push(node); });
  const registrations = calls.filter(/**
   * Evaluate the selection condition tests.has(rootName(call.callee)) && (call.callee.type === "Identifier" ||
   * ["test", "it", "skip", "only", "todo"].includes(call.callee.property?.name)).
   * @responsibility computation
   * @param {unknown} call - Call-expression syntax node being classified.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ call => tests.has(rootName(call.callee))
    && (call.callee.type === "Identifier" || ["test", "it", "skip", "only", "todo"].includes(call.callee.property?.name)));
  const assertionCalls = calls.filter(/**
   * Evaluate the selection condition assertions.has(rootName(call.callee)).
   * @responsibility computation
   * @param {unknown} call - Call-expression syntax node being classified.
   * @returns {boolean} The result returned by assertions.has.
   */ call => assertions.has(rootName(call.callee)));
  const owned = new Set();
  const violations = [];
  for (const call of registrations) {
    const callback = call.arguments.find(/**
     * Evaluate the selection condition ["ArrowFunctionExpression", "FunctionExpression"].includes(argument.type).
     * @responsibility computation
     * @param {unknown} argument - Current syntax argument node inspected by the policy.
     * @returns {boolean} The result returned by ["ArrowFunctionExpression", "FunctionExpression"].includes.
     */ argument => ["ArrowFunctionExpression", "FunctionExpression"].includes(argument.type));
    const line = `${filename}:${call.loc.start.line}`;
    if (!callback) { violations.push(`${line}: test callback must be inline`); continue; }
    const contained = assertionCalls.filter(/**
     * Evaluate the selection condition within(assertion, callback, parents).
     * @responsibility computation
     * @param {unknown} assertion - Imported strict-assert call expression.
     * @returns {unknown} The result returned by within.
     */ assertion => within(assertion, callback, parents));
    contained.forEach(/**
     * Apply owned.add to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} assertion - Imported strict-assert call expression.
     * @returns {unknown} The result returned by owned.add.
     */ assertion => owned.add(assertion));
    if (contained.length !== 1) violations.push(`${line}: expected exactly one assertion, found ${contained.length}`);
    else if (!isDirectAssertion(contained[0], callback, parents)) violations.push(`${line}: assertion must be a direct test-body expression, not conditional, looped, or delegated`);
  }
  for (const call of assertionCalls) if (!owned.has(call)) violations.push(`${filename}:${call.loc.start.line}: assertion outside a test callback`);
  if (/\.test\.m?js$/.test(filename) && registrations.length === 0) violations.push(`${filename}: no supported node:test registrations`);
  return { tests: registrations.length, violations };
}

/**
 * Collect local import names for the selected module and optional named-export vocabulary.
 * @responsibility computation
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {unknown} module - Import module specifier being inspected.
 * @param {unknown} names - Optional allowed import/export names; defaults to null.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function importBindings(ast, module, names = null) {
  return new Set(ast.body.filter(/**
   * Evaluate the selection condition node.type === "ImportDeclaration" && node.source.value === module.
   * @responsibility computation
   * @param {Object} node - Acorn syntax node; positions refer to this source module.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ node => node.type === "ImportDeclaration" && node.source.value === module)
    .flatMap(/**
     * Apply node.specifiers.filter(specifier => specifier.type !== "ImportSpecifier" || names === null ||
     * names.includes(specifier.imported.name)).map to the supplied arguments; retain the callee's return and
     * failure behavior.
     * @responsibility computation
     * @param {Object} node - Acorn syntax node; positions refer to this source module.
     * @returns {Array} The result returned by node.specifiers.filter(specifier => specifier.type !== "ImportSpecifier" || names === null || names.includes(specifier.imported.name)).map.
     */ node => node.specifiers.filter(/**
     * Evaluate the selection condition specifier.type !== "ImportSpecifier" || names === null ||
     * names.includes(specifier.imported.name).
     * @responsibility computation
     * @param {unknown} specifier - Import-specifier syntax node used to resolve local binding names.
     * @returns {unknown} The result of the documented comparison or calculation.
     */ specifier => specifier.type !== "ImportSpecifier" || names === null || names.includes(specifier.imported.name))
      .map(/**
       * Project specifier.local.name from the current record.
       * @responsibility computation
       * @param {unknown} specifier - Import-specifier syntax node used to resolve local binding names.
       * @returns {unknown} The specifier.local.name value selected or validated above.
       */ specifier => specifier.local.name)));
}

/**
 * Find the root identifier of a member-expression chain for import ownership checks.
 * @responsibility computation
 * @param {unknown} expression - Syntax expression whose imported binding is resolved.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function rootName(expression) {
  return expression.type === "MemberExpression" ? rootName(expression.object) : expression.name;
}

/**
 * Determine whether an AST node is nested inside a specified ancestor using the parent index.
 * @responsibility computation
 * @param {Object} node - Acorn syntax node; positions refer to this source module.
 * @param {unknown} ancestor - Syntax node whose containment is being tested.
 * @param {unknown} parents - Map from syntax nodes to their immediate parents.
 * @returns {boolean} The literal true for this branch. The literal false for this branch.
 */
function within(node, ancestor, parents) {
  for (let current = node; current; current = parents.get(current)) if (current === ancestor) return true;
  return false;
}

/**
 * Recognize a direct test-body assertion expression, optionally awaited, without accepting delegated or
 * conditional assertions.
 * @responsibility computation
 * @param {unknown} assertion - Imported strict-assert call expression.
 * @param {unknown} callback - Inline test function syntax node.
 * @param {unknown} parents - Map from syntax nodes to their immediate parents.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function isDirectAssertion(assertion, callback, parents) {
  const expression = parents.get(assertion)?.type === "AwaitExpression" ? parents.get(assertion) : assertion;
  const statement = parents.get(expression);
  return expression === callback.body || (statement?.type === "ExpressionStatement" && parents.get(statement) === callback.body);
}

/**
 * Visit each syntax node recursively with its immediate parent; ignore primitive metadata.
 * @responsibility coordinator
 * @param {Object} node - Acorn syntax node; positions refer to this source module.
 * @param {Function} visit - Visitor invoked with a node and its immediate parent.
 * @param {unknown} parent - Immediate containing syntax node, or null at the root; defaults to null.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(/**
     * Apply walk to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} child - Current child node or record during recursive traversal.
     * @returns {unknown} The result returned by walk.
     */ child => walk(child, visit, node));
    else if (value !== null && typeof value === "object") walk(value, visit, node);
  }
}
