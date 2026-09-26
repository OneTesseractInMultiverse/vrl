import { createDiagramState, diagramWarningText } from "@subvertic/vrl-diagram";

const DEFAULT_CLASS_NAME = "vrl-diagram";
const DEFAULT_DIAGNOSTICS_CLASS_NAME = "vrl-diagram__diagnostics";
const DEFAULT_ROLE = "img";

/**
 * Delegate compilation and rendering to the framework-neutral diagram state service.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {Object} Shared diagram state suitable for the React adapter.
 */
export function createVrlReactDiagramState(source, options = {}) {
  return createDiagramState(source, options);
}

/**
 * Validate the React factory and capture defaults in a reusable component; caller-owned precomputed markup is
 * trusted.
 * @responsibility coordinator
 * @param {unknown} React - React-compatible object exposing createElement.
 * @param {unknown} defaults - Captured component default props; defaults to {}.
 * @returns {Function} React-compatible diagram component with captured default props.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function createVrlDiagramComponent(React, defaults = {}) {
  if (React === null || React === undefined || typeof React.createElement !== "function") {
    throw new TypeError("createVrlDiagramComponent requires a React object with createElement.");
  }

  /**
   * Resolve precomputed or compiled state and delegate React element creation for diagnostics, SVG and
   * optional
   * accessible warnings.
   * @responsibility coordinator
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string} input1.source - Complete VRL document source text passed to the shared compiler.
   * @param {Object} input1.options - Diagram options resolved from the prop, captured defaults, or an empty record.
   * @param {unknown} input1.diagram - Precomputed trusted diagram state, including renderer-produced SVG.
   * @param {unknown} input1.className - CSS class token used for wrapper styling or DOM selection.
   * @param {unknown} input1.diagnosticsClassName - CSS class for the blocking-diagnostics wrapper.
   * @param {unknown} input1.role - Accessible wrapper role supplied by the consumer.
   * @param {boolean} input1.showWarnings - Boolean display preference; suppressing warnings never removes compiler diagnostics.
   * @param {unknown} input1.warningsClassName - CSS class for the nonblocking warning panel.
   * @param {unknown} input1.warningsLabel - Accessible label for the warning status panel.
   * @param {unknown} input1.containerProps - Additional React SVG-wrapper properties supplied by the consumer.
   * @param {unknown} input1.diagnosticsProps - Additional React properties for the blocking-diagnostics wrapper.
   * @returns {unknown} The result returned by React.createElement. The image value selected or validated above.
   */
  return function VrlDiagram({
    source = defaults.source ?? "",
    options = defaults.options ?? {},
    diagram = null,
    className = defaults.className ?? DEFAULT_CLASS_NAME,
    diagnosticsClassName = defaults.diagnosticsClassName ?? DEFAULT_DIAGNOSTICS_CLASS_NAME,
    role = defaults.role ?? DEFAULT_ROLE,
    showWarnings = defaults.showWarnings,
    warningsClassName = defaults.warningsClassName ?? "vrl-diagram__warnings",
    warningsLabel = defaults.warningsLabel ?? "Route warnings",
    containerProps = {},
    diagnosticsProps = {}
  } = {}) {
    const state = diagram ?? createVrlReactDiagramState(source, options);
    const warnings = diagramWarningText(state, showWarnings);

    if (state.ok === false) {
      return React.createElement(
        "pre",
        {
          ...diagnosticsProps,
          className: diagnosticsClassName
        },
        state.diagnosticsText
      );
    }

    const image = React.createElement(
      "div",
      {
        ...containerProps,
        className,
        role,
        dangerouslySetInnerHTML: {
          __html: state.svg
        }
      }
    );
    if (warnings === "") return image;
    return React.createElement("div", {}, image,
      React.createElement("pre", {
        className: warningsClassName,
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        "aria-label": warningsLabel,
        style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }
      }, warnings)
    );
  };
}
