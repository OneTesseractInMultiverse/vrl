import { compileRoute, formatDiagnostic } from "@vrl/core";
import { renderTopoSvg } from "@vrl/render-svg";

export function createVrlDiagramComponent(React) {
  if (React === null || React === undefined || typeof React.createElement !== "function") {
    throw new TypeError("createVrlDiagramComponent requires a React object with createElement.");
  }

  return function VrlDiagram({ source, options = {}, className = "vrl-diagram" }) {
    const result = compileRoute(source, options);

    if (result.ok === false) {
      return React.createElement(
        "pre",
        { className: "vrl-diagram__diagnostics" },
        result.diagnostics.map(formatDiagnostic).join("\n")
      );
    }

    return React.createElement("div", {
      className,
      role: "img",
      dangerouslySetInnerHTML: {
        __html: renderTopoSvg(result.model, result.layout, options)
      }
    });
  };
}
