import { parseOptions } from "./release/options.mjs";
import { runRelease } from "./release/coordinator.mjs";
import { systemPorts } from "./release/system.mjs";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node scripts/publish-workspaces.mjs [options]
  --plan                   Read-only registry/version plan
  --prepare                Write version files only, with rollback on failure
  --dry-run                Check and inspect package contents without publishing
  --release current|auto|patch|minor|major (default: current)
  --version x.y.z           Explicit stable version
  --resume                 Verify and skip identical published artifacts
  --skip-registry           Only for plan, prepare or dry run
  --skip-check              For a commit already verified by the release gate
  --trusted-publisher       Require GitHub Actions OIDC
  --provenance              Publish provenance (CI only)
  --provenance=false        Local bootstrap without CI provenance
  --otp VALUE               Local publication authentication`);
} else {
  try {
    const result = runRelease(parseOptions(args), systemPorts());
    console.log(`Completed. Published: ${result.published.join(", ") || "none"}; skipped: ${result.skipped.join(", ") || "none"}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
