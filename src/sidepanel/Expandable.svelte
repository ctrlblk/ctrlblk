<script>
    import { slide } from 'svelte/transition';
    import { ChevronDown, ChevronUp } from 'lucide-svelte';

    let { state = $bindable("closed"), label, content } = $props();

    function toggle(event) {
        state = state === "closed" ? "open" : "closed";
    }
</script>

<a href="#!" onclick={toggle} class="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-500">
    {@render label()}
    {#if state === "closed"}
        <ChevronDown class="h-3 w-3" />
    {:else}
        <ChevronUp class="h-3 w-3" />
    {/if}
</a>

{#if state === "open"}
    <div transition:slide>
        {@render content()}
    </div>
{/if}