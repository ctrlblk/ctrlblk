<script>
    import { cn } from "/src/lib/utils.js";
    import { ChevronDown } from "lucide-svelte";

    let { children, header, class: className = "", ...rest } = $props();
    let open = $state(false);

    function toggle() {
        open = !open;
    }
</script>

<div class={cn("border-b border-gray-200 dark:border-gray-700", className)} {...rest}>
    <h2>
        <button
            type="button"
            class="flex w-full items-center justify-between gap-3 py-5 font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onclick={toggle}
            aria-expanded={open}
        >
            <span class="text-left">{@render header()}</span>
            <ChevronDown class={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
    </h2>
    {#if open}
        <div class="py-5">
            {@render children()}
        </div>
    {/if}
</div>
