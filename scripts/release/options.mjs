const switches = { "--plan": "plan", "--prepare": "prepare", "--dry-run": "dryRun", "--skip-check": "skipCheck", "--skip-registry": "skipRegistry", "--trusted-publisher": "trustedPublisher", "--resume": "resume", "--provenance": "provenance" };
const values = { "--release": "release", "--version": "version", "--otp": "otp" };

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

function validateOptions(options, args) {
  if (!["auto", "current", "patch", "minor", "major"].includes(options.release)) throw new Error("Invalid release strategy.");
  if (options.version && args.includes("--release")) throw new Error("Use either --version or --release.");
  if ([options.plan, options.prepare, options.dryRun].filter(Boolean).length > 1) throw new Error("Choose one of --plan, --prepare or --dry-run.");
  if (options.otp && (options.plan || options.prepare || options.dryRun || options.trustedPublisher)) throw new Error("--otp is only for local publication.");
  if (options.skipRegistry && !(options.plan || options.prepare || options.dryRun)) throw new Error("Publication cannot skip registry checks.");
  if (options.resume && (options.prepare || options.skipRegistry || options.dryRun)) throw new Error("--resume requires registry-backed publication or planning.");
  if (options.trustedPublisher && options.prepare) throw new Error("Prepare versions locally before trusted publication.");
}
