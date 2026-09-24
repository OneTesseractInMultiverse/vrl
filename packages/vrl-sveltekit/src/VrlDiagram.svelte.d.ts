import { SvelteComponent } from "svelte";
import type { VrlDiagramProps } from "./index.js";
/** Explicit diagram, then data[diagramKey], then source/options. */
export default class VrlDiagram extends SvelteComponent<VrlDiagramProps, Record<string, never>, Record<string, never>> {}
