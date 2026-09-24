import { createDiagramState } from "@subvertic/diagram";

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
    containerProps = {},
    diagnosticsProps = {}
  } = {}) {
    const state = diagram ?? createVrlReactDiagramState(source, options);

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

    return React.createElement(
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
  };
}
