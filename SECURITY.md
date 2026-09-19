# Security Policy

VRL is a documentation and rendering toolkit. Security reports may involve parser crashes, denial-of-service input, unsafe SVG output, package publication issues, supply-chain risks, or framework adapter behavior.

## Rendering Trust Boundaries

The standard compilation and rendering path validates numeric layout configuration and renderer paint values, then XML-encodes dynamic SVG attributes. Unsupported configuration throws `TypeError` or `RangeError` rather than producing markup. See the [configuration and paint contracts](docs/api-reference.md#configuration-validation) for accepted inputs and failure behavior. Core and renderer packages have no third-party runtime dependencies.

Precomputed `diagram.svg` is trusted markup, not an input to a sanitizer. Supplying `diagram` bypasses the compiler and renderer: React uses `dangerouslySetInnerHTML`, Svelte uses `@html`, and the Svelte server markup helper inserts the string directly. Applications must trust the producer of precomputed state or sanitize arbitrary SVG before passing it to an adapter. Wrapper escaping does not make embedded markup safe. Framework component props are application-owned inputs as well.

Low-level rendering helpers encode attribute values and validate paint, but require callers to honor their normalized-model and geometry contracts. Configuration validation does not establish that arbitrary route objects, arbitrary SVG, or route safety claims are valid.

## Supported Versions

Until the first stable release, only the latest `main` branch and latest published prerelease are supported.

## Reporting a Vulnerability

Please do not open public issues for suspected vulnerabilities. Email the initial maintainer, Pedro Guzmán, or use the private security advisory feature after the public repository is created.

Include:

- A short description of the issue.
- A minimal reproduction or malicious input if available.
- Affected package and version.
- Impact and suggested mitigation if known.

Maintainers should acknowledge reports within 7 days when possible, keep reporters updated, and coordinate disclosure after a fix is available.
