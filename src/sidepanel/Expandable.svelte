<script>
    import { slide } from 'svelte/transition';
    import { A } from 'flowbite-svelte';

    import {
        AngleDownOutline,
        AngleUpOutline,
    } from 'flowbite-svelte-icons';

    export let state = "closed";

    function toggle(event) {
        state = state === "closed" ? "open" : "closed";
    }
</script>

<A on:click={toggle}>
    <slot name="label"></slot>
    {#if state === "closed"}
        <AngleDownOutline />
    {:else}
        <AngleUpOutline />
    {/if}
</A>

{#if state === "open"}
    <div transition:slide>
        <slot name="content"></slot>
    </div>
{/if}