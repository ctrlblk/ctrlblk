<script>
    import Expandable from '../../src/sidepanel/Expandable.svelte';
    let { state = "closed" } = $props();
</script>

<Expandable {state}>
    {#snippet label()}
        <span>Test Label</span>
    {/snippet}
    {#snippet content()}
        <div>Test Content</div>
    {/snippet}
</Expandable>
