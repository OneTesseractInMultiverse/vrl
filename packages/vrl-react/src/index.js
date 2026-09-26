import { createDiagramState, diagramWarningText } from "@subvertic/vrl-diagram";

const DEFAULT_CLASS_NAME = "vrl-diagram";
const DEFAULT_DIAGNOSTICS_CLASS_NAME = "vrl-diagram__diagnostics";
const DEFAULT_ROLE = "img";

export function createVrlReactDiagramState(source, options = {}) {
  return createDiagramState(source, options);
}

export function createVrlDiagramComponent(React, defaults = {}) {
  if (React === null || React === undefined || typeof React.createElement !== "function") {
    throw new TypeError("createVrlDiagramComponent requires a React object with createElement.");
  }

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
