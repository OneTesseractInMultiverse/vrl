<script>
  import { onMount, tick } from "svelte";
  import Diagram from "@subvertic/svelte/VrlDiagram.svelte";
  import KitDiagram from "@subvertic/sveltekit/VrlDiagram.svelte";
  import { createVrlSvelteKitData } from "@subvertic/sveltekit";

  export let data;
  let source, options, showWarnings, route;
  let override = null;
  $: source = data.source;
  $: options = data.options;
  $: showWarnings = data.showWarnings;
  $: route = data.route;

  async function update(next) {
    if ("source" in next) source = next.source;
    if ("options" in next) options = next.options;
    if ("showWarnings" in next) showWarnings = next.showWarnings;
    if ("diagram" in next) override = next.diagram;
    if (override === null && ("source" in next || "options" in next)) route = createVrlSvelteKitData(source, options);
    await tick();
  }

  onMount(() => {
    window.fixture = { update };
    document.documentElement.dataset.hydrated = "true";
  });
</script>

<svelte:head><title>VRL consumer fixture</title></svelte:head>
<section id="diagram">
  {#if data.surface === "svelte"}
    <Diagram {source} {options} {showWarnings} diagram={override} />
  {:else}
    <KitDiagram data={{ route }} diagramKey="route" {source} {options} {showWarnings} diagram={override} />
  {/if}
</section>
<a id="warning-route" href={`/?surface=${data.surface}&case=warning`}>Warning route</a>
