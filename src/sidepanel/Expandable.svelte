<script>
    import { slide } from 'svelte/transition';
    import { A } from 'flowbite-svelte';

    import {
        AngleDownOutline,
        AngleUpOutline,
    } from 'flowbite-svelte-icons';

    let { state = $bindable("closed"), label, content } = $props();

    function toggle(event) {
        state = state === "closed" ? "open" : "closed";
    }
</script>

<A on:click={toggle}>
    {@render label()}
    {#if state === "closed"}
        <AngleDownOutline />
    {:else}
        <AngleUpOutline />
    {/if}
</A>

{#if state === "open"}
    <div transition:slide>
        {@render content()}
    </div>
{/if}