import React from "react";
import { hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createVrlDiagramComponent } from "@subvertic/vrl-react";

const Diagram = createVrlDiagramComponent(React);
let props = JSON.parse(document.getElementById("props").textContent);
function App(values) {
  React.useEffect(() => { document.documentElement.dataset.hydrated = "true"; }, []);
  return React.createElement(Diagram, values);
}
const root = hydrateRoot(document.getElementById("diagram"), React.createElement(App, props), { onRecoverableError: error => { throw error; } });
window.fixture = { update(next) { props = { ...props, ...next }; flushSync(() => root.render(React.createElement(App, props))); } };
