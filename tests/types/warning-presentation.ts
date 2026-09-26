import * as React from "react";
import type { ComponentProps } from "svelte";
import { createDiagramState, diagramWarningText } from "@subvertic/vrl-diagram";
import type { WarningDisplayOptions } from "@subvertic/vrl-diagram";
import { createVrlDiagramComponent } from "@subvertic/vrl-react";
import type { VrlDiagramProps as ReactProps } from "@subvertic/vrl-react";
import { renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import SvelteDiagram from "@subvertic/vrl-svelte/VrlDiagram.svelte";
import KitDiagram from "@subvertic/vrl-sveltekit/VrlDiagram.svelte";

const source = 'route Warning\nrappel height=10m rope=5m';
const diagram = createDiagramState(source);
const text: string = diagramWarningText(diagram);
diagramWarningText(diagram, false);
diagramWarningText({ ok: true });
diagramWarningText({ ok: true, diagnostics: null });
const display: WarningDisplayOptions = { showWarnings: true, warningsClassName: "warnings", warningsLabel: "Avisos" };
const Component = createVrlDiagramComponent(React, { source, ...display });
const element: React.ReactElement = React.createElement(Component, { diagram, showWarnings: false });
const reactProps: ReactProps = { diagram, ...display };
const svelteProps: ComponentProps<SvelteDiagram> = { source, ...display };
const kitProps: ComponentProps<KitDiagram> = { data: { vrl: diagram }, ...display };
renderVrlSvelteMarkup(source, {}, display);
void [text, element, reactProps, svelteProps, kitProps];

// @ts-expect-error The display flag must be a boolean.
diagramWarningText(diagram, "false");
// @ts-expect-error Null is not a supported display flag.
diagramWarningText(diagram, null);
// @ts-expect-error Factory defaults must use a boolean display flag.
createVrlDiagramComponent(React, { showWarnings: "false" });
// @ts-expect-error Component props must use a boolean display flag.
const invalidReact: ReactProps = { showWarnings: null };
// @ts-expect-error Warning labels are text, not arbitrary attribute objects.
const invalidSvelte: ComponentProps<SvelteDiagram> = { warningsLabel: {} };
// @ts-expect-error Warning classes are text.
const invalidKit: ComponentProps<KitDiagram> = { warningsClassName: 123 };
// @ts-expect-error The markup helper uses the same boolean policy.
renderVrlSvelteMarkup(source, {}, { showWarnings: "false" });
// @ts-expect-error Display settings belong to adapter props, not compilation/rendering options.
createDiagramState(source, { showWarnings: false });
void [invalidReact, invalidSvelte, invalidKit];
