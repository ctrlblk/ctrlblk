<script>
    import { cn } from "/src/lib/utils.js";

    let { children, checked = $bindable(false), class: className = "", onclick, ...rest } = $props();
</script>

<label class={cn("inline-flex items-center gap-2 cursor-pointer", className)}>
    <input
        type="checkbox"
        bind:checked
        {onclick}
        class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        {...rest}
    />
    {#if children}
        <span class="text-sm text-gray-900 dark:text-gray-300">
            {@render children()}
        </span>
    {/if}
</label>
