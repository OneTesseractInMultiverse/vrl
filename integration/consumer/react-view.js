import React from "react";
import { createVrlDiagramComponent } from "@subvertic/vrl-react";

const Diagram = createVrlDiagramComponent(React);
export function View(props) {
  return React.createElement(React.Fragment, {}, React.createElement(Diagram, props),
    props.companion ? React.createElement(Diagram, props.companion) : null);
}
