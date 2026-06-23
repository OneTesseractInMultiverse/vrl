<script>
  import VrlDiagram from "@subvertic/svelte/VrlDiagram.svelte";

  export let data = {};
  export let source = "";
  export let options = {};
  export let diagram = null;
  export let diagramKey = "vrl";
  export let className = "vrl-diagram";
  export let diagnosticsClassName = "vrl-diagram__diagnostics";
  export let role = "img";

  $: resolvedDiagram = diagram ?? data[diagramKey] ?? null;
</script>

<VrlDiagram {source} {options} diagram={resolvedDiagram} {className} {diagnosticsClassName} {role} />
