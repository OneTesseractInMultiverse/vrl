<script>
  import { compileRoute, formatDiagnostic } from "@vrl/core";
  import { renderTopoSvg } from "@vrl/render-svg";

  export let source = "";
  export let options = {};

  $: result = compileRoute(source, options);
  $: svg = result.ok ? renderTopoSvg(result.model, result.layout, options) : "";
  $: diagnostics = result.diagnostics.map(formatDiagnostic).join("\n");
</script>

{#if result.ok}
  <div class="vrl-diagram" role="img">
    {@html svg}
  </div>
{:else}
  <pre class="vrl-diagram__diagnostics">{diagnostics}</pre>
{/if}
