import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "svelte/compiler";
import { stripTypeScriptTypes } from "node:module";

const ROOTS = ["packages", "scripts", "tests", "integration"];

/**
 * Discover executable first-party code automatically, including Svelte script and template expressions.
 * Public function declarations are checked through inert stubs; type correctness remains owned by check:types.
 * @responsibility coordinator
 * @param {string} root - Absolute repository root containing the four first-party source trees.
 * @returns {{file: string, source: string}[]} Deterministically ordered JavaScript units with original line positions.
 * @throws {Error} Propagates filesystem and Svelte parse failures; unreadable code cannot pass silently.
 */
export function readFunctionSources(root) {
  const sources = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:[cm]?js|ts|svelte)$/.test(entry.name)) {
      const source = readFileSync(join(root, entry.name), "utf8");
      if (entry.name.endsWith(".svelte")) sources.push(...svelteScripts(source, entry.name));
      else sources.push({ file: entry.name, source: entry.name.endsWith(".ts") ? typeScriptDocumentationSource(source, entry.name) : source });
    }
  }
  for (const directory of ROOTS) {
    for (const path of sourceFiles(join(root, directory))) {
      const file = relative(root, path).split(sep).join("/");
      const source = readFileSync(path, "utf8");
      if (file.endsWith(".svelte")) sources.push(...svelteScripts(source, file));
      else sources.push({ file, source: file.endsWith(".ts") ? typeScriptDocumentationSource(source, file) : source });
    }
  }
  return sources;
}

/**
 * Recursively enumerate authored JavaScript and Svelte modules without following symlinks or dependencies.
 * @responsibility coordinator
 * @param {string} directory - Directory to enumerate; callers own the trusted repository boundary.
 * @returns {string[]} Sorted matching paths below this directory.
 */
function sourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) files.push(...sourceFiles(path));
    else if (entry.isFile() && /\.(?:[cm]?js|ts|svelte)$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}

/**
 * Extract both Svelte script contexts without counting generated compiler functions.
 * Template callbacks are rejected here so new authored functions cannot evade the gate.
 * @responsibility computation
 * @param {string} source - Complete authored Svelte component.
 * @param {string} file - Repository-relative path for parse or unsupported-template errors.
 * @returns {{file: string, source: string}[]} Padded script bodies retaining source line numbers.
 * @throws {Error} Rejects function expressions in markup; declare and document a named script handler instead.
 */
export function svelteScripts(source, file) {
  const ast = parse(source, { filename: file });
  rejectTemplateFunctions(ast.html, file);
  const units = [];
  for (const script of [ast.module, ast.instance]) {
    if (script) units.push({ file, source: source.slice(0, script.content.start).replace(/[^\r\n]/g, " ") + source.slice(script.content.start, script.content.end) });
  }
  return units;
}

/**
 * Detect undocumented executable functions embedded in markup, recursively through Svelte nodes.
 * @responsibility computation
 * @param {Object|null} node - Markup or expression node; null children are ignored.
 * @param {string} file - Component path included in the failure message.
 * @returns {void} Completes only when all function implementations reside in script blocks.
 * @throws {Error} A template function requires a documented named script handler.
 */
function rejectTemplateFunctions(node, file) {
  if (!node || typeof node !== "object") return;
  if (["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"].includes(node.type)) throw new Error(`${file}: template functions must be documented named script handlers`);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) { for (const child of value) rejectTemplateFunctions(child, file); }
    else if (value && typeof value === "object") rejectTemplateFunctions(value, file);
  }
}

/**
 * Erase TypeScript annotations without evaluating fixtures; preserve comments and source locations.
 * Public overload declarations become uniquely named inert bodies solely for documentation inspection.
 * Function-valued interface/type contracts remain prose-reviewed types, not implementations.
 * @responsibility computation
 * @param {string} source - Authored TypeScript source or declaration text.
 * @param {string} file - Repository-relative path identifying declaration modules.
 * @returns {string} Parseable JavaScript carrying the original function documentation.
 * @throws {Error} Unsupported or malformed TypeScript fails instead of being skipped.
 */
export function typeScriptDocumentationSource(source, file) {
  let index = 0;
  const prepared = file.endsWith(".d.ts") ? source.replace(/^export function (\w+)(.*);$/gm, /**
   * Give each public overload an inert unique body without interpreting its type contract.
   * @responsibility computation
   * @param {string} match - Complete exported declaration line matched by the repository convention.
   * @param {string} name - Declared function name before its optional generic parameters.
   * @param {string} signature - Original generic, parameter and return-type signature.
   * @returns {string} Unexported stub with unique identity; never executed.
   */ (match, name, signature) => `function ${name}$documentation${index++}${signature} {}`) : source;
  if (file.endsWith(".d.ts") && /^\s*export\s+(?:declare\s+)?function\b/m.test(prepared)) {
    throw new Error(`${file}: exported function declarations must use the supported single-line signature convention`);
  }
  const declarations = file.endsWith(".d.ts") ? prepared.replace(/^export const /gm, "export declare const ") : prepared;
  return stripTypeScriptTypes(declarations, { mode: "strip" });
}
