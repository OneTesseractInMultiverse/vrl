<script>
  import { createVrlSvelteDiagramState } from "./index.js";

  export let source = "";
  export let options = {};
  export let diagram = null;
  export let className = "vrl-diagram";
  export let diagnosticsClassName = "vrl-diagram__diagnostics";
  export let role = "img";

  $: state = diagram ?? createVrlSvelteDiagramState(source, options);
</script>

{#if state.ok}
  <div class={className} {role}>
    {@html state.svg}
  </div>
{:else}
  <pre class={diagnosticsClassName}>{state.diagnosticsText}</pre>
{/if}
