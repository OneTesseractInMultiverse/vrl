import { parse } from "acorn";

/** Repository convention: inline node:test callbacks and imported strict assertions. */
export function inspectTestPolicy(source, filename) {
  let ast;
  try { ast = parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true }); }
  catch (error) { return { tests: 0, violations: [`${filename}: ${error.message}`] }; }
  const tests = importBindings(ast, "node:test", ["test", "it"]);
  const assertions = importBindings(ast, "node:assert/strict");
  const parents = new Map();
  const calls = [];
  walk(ast, (node, parent) => { parents.set(node, parent); if (node.type === "CallExpression") calls.push(node); });
  const registrations = calls.filter(call => tests.has(rootName(call.callee))
    && (call.callee.type === "Identifier" || ["test", "it", "skip", "only", "todo"].includes(call.callee.property?.name)));
  const assertionCalls = calls.filter(call => assertions.has(rootName(call.callee)));
  const owned = new Set();
  const violations = [];
  for (const call of registrations) {
    const callback = call.arguments.find(argument => ["ArrowFunctionExpression", "FunctionExpression"].includes(argument.type));
    const line = `${filename}:${call.loc.start.line}`;
    if (!callback) { violations.push(`${line}: test callback must be inline`); continue; }
    const contained = assertionCalls.filter(assertion => within(assertion, callback, parents));
    contained.forEach(assertion => owned.add(assertion));
    if (contained.length !== 1) violations.push(`${line}: expected exactly one assertion, found ${contained.length}`);
    else if (!isDirectAssertion(contained[0], callback, parents)) violations.push(`${line}: assertion must be a direct test-body expression, not conditional, looped, or delegated`);
  }
  for (const call of assertionCalls) if (!owned.has(call)) violations.push(`${filename}:${call.loc.start.line}: assertion outside a test callback`);
  if (filename.endsWith(".test.js") && registrations.length === 0) violations.push(`${filename}: no supported node:test registrations`);
  return { tests: registrations.length, violations };
}

function importBindings(ast, module, names = null) {
  return new Set(ast.body.filter(node => node.type === "ImportDeclaration" && node.source.value === module)
    .flatMap(node => node.specifiers.filter(specifier => specifier.type !== "ImportSpecifier" || names === null || names.includes(specifier.imported.name))
      .map(specifier => specifier.local.name)));
}

function rootName(expression) {
  return expression.type === "MemberExpression" ? rootName(expression.object) : expression.name;
}

function within(node, ancestor, parents) {
  for (let current = node; current; current = parents.get(current)) if (current === ancestor) return true;
  return false;
}

function isDirectAssertion(assertion, callback, parents) {
  const expression = parents.get(assertion)?.type === "AwaitExpression" ? parents.get(assertion) : assertion;
  const statement = parents.get(expression);
  return expression === callback.body || (statement?.type === "ExpressionStatement" && parents.get(statement) === callback.body);
}

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node));
    else if (value !== null && typeof value === "object") walk(value, visit, node);
  }
}
