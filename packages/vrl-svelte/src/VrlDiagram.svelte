<script>
  import { createVrlSvelteDiagramState } from "./index.js";
  import { diagramWarningText } from "@subvertic/diagram";

  export let source = "";
  export let options = {};
  export let diagram = null;
  export let className = "vrl-diagram";
  export let diagnosticsClassName = "vrl-diagram__diagnostics";
  export let role = "img";
  export let showWarnings = true;
  export let warningsClassName = "vrl-diagram__warnings";
  export let warningsLabel = "Route warnings";

  $: state = diagram ?? createVrlSvelteDiagramState(source, options);
  $: warnings = diagramWarningText(state, showWarnings);
</script>

{#if state.ok && warnings !== ""}
  <div>
    <div class={className} {role}>
      {@html state.svg}
    </div>
    <pre class={warningsClassName} role="status" aria-live="polite" aria-atomic="true" aria-label={warningsLabel} style="white-space: pre-wrap; overflow-wrap: anywhere;">{warnings}</pre>
  </div>
{:else if state.ok}
  <div class={className} {role}>
    {@html state.svg}
  </div>
{:else}
  <pre class={diagnosticsClassName}>{state.diagnosticsText}</pre>
{/if}
