import React from "react";
import { createVrlDiagramComponent } from "@subvertic/vrl-react";

const Diagram = createVrlDiagramComponent(React);
/**
 * Create the primary and optional companion React diagrams from the consumer's supplied props.
 * @responsibility coordinator
 * @param {unknown} props - Component properties supplied by the embedding consumer.
 * @returns {unknown} The result returned by React.createElement.
 */
export function View(props) {
  return React.createElement(React.Fragment, {}, React.createElement(Diagram, props),
    props.companion ? React.createElement(Diagram, props.companion) : null);
}
