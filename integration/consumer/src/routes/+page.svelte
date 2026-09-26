<script>
  import { onMount, tick } from "svelte";
  import Diagram from "@subvertic/vrl-svelte/VrlDiagram.svelte";
  import KitDiagram from "@subvertic/vrl-sveltekit/VrlDiagram.svelte";
  import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";

  export let data;
  let source, options, showWarnings, route;
  let override = null;
  $: source = data.source;
  $: options = data.options;
  $: showWarnings = data.showWarnings;
  $: route = data.route;

  /**
   * Apply requested consumer prop updates and wait for the framework's rendered state to become observable.
   * @responsibility coordinator
   * @param {unknown} next - Deterministic random generator or explicit update record, as required by this helper.
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */
  async function update(next) {
    if ("source" in next) source = next.source;
    if ("options" in next) options = next.options;
    if ("showWarnings" in next) showWarnings = next.showWarnings;
    if ("diagram" in next) override = next.diagram;
    if (override === null && ("source" in next || "options" in next)) route = createVrlSvelteKitData(source, options);
    await tick();
  }

  onMount(/**
   * Expose the fixture update function and signal hydration after Svelte mounts.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    window.fixture = { update };
    document.documentElement.dataset.hydrated = "true";
  });
</script>

<svelte:head><title>VRL consumer fixture</title></svelte:head>
<section id="diagram">
  {#if data.surface === "svelte"}
    <Diagram {source} {options} {showWarnings} diagram={override} />
    {#if data.companion}<Diagram {...data.companion} />{/if}
  {:else}
    <KitDiagram data={{ route }} diagramKey="route" {source} {options} {showWarnings} diagram={override} />
    {#if data.companion}<KitDiagram {...data.companion} />{/if}
  {/if}
</section>
<a id="warning-route" href={`/?surface=${data.surface}&case=warning`}>Warning route</a>
