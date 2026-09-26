const switches = { "--plan": "plan", "--prepare": "prepare", "--dry-run": "dryRun", "--skip-check": "skipCheck", "--skip-registry": "skipRegistry", "--trusted-publisher": "trustedPublisher", "--resume": "resume", "--provenance": "provenance" };
const values = { "--release": "release", "--version": "version", "--otp": "otp" };

/**
 * Parse supported release switches and values, then reject conflicting or unsafe combinations.
 * @responsibility computation
 * @param {unknown} args - Ordered command-line arguments; no shell interpolation is performed by process adapters.
 * @returns {unknown} The options value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function parseOptions(args) {
  const options = { release: "current", version: "", otp: "", plan: false, prepare: false, dryRun: false, skipCheck: false, skipRegistry: false, trustedPublisher: false, resume: false, provenance: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (Object.hasOwn(switches, arg)) options[switches[arg]] = true;
    else if (arg === "--provenance=false") options.provenance = false;
    else if (Object.hasOwn(values, arg)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.`);
      options[values[arg]] = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  validateOptions(options, args);
  return options;
}

/**
 * Enforce release-mode, registry, authentication and resume constraints before any release action.
 * @responsibility computation
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains validated release mode, version, registry and authentication flags.
 * @param {unknown} args - Ordered command-line arguments; no shell interpolation is performed by process adapters.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function validateOptions(options, args) {
  if (!["auto", "current", "patch", "minor", "major"].includes(options.release)) throw new Error("Invalid release strategy.");
  if (options.version && args.includes("--release")) throw new Error("Use either --version or --release.");
  if ([options.plan, options.prepare, options.dryRun].filter(Boolean).length > 1) throw new Error("Choose one of --plan, --prepare or --dry-run.");
  if (options.otp && (options.plan || options.prepare || options.dryRun || options.trustedPublisher)) throw new Error("--otp is only for local publication.");
  if (options.skipRegistry && !(options.plan || options.prepare || options.dryRun)) throw new Error("Publication cannot skip registry checks.");
  if (options.resume && (options.prepare || options.skipRegistry || options.dryRun)) throw new Error("--resume requires registry-backed publication or planning.");
  if (options.trustedPublisher && options.prepare) throw new Error("Prepare versions locally before trusted publication.");
}
