<script>
    import { cn } from "/src/lib/utils.js";

    let { class: className = "", value = $bindable(""), ...rest } = $props();
</script>

<input
    bind:value
    class={cn(
        "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500",
        className,
    )}
    {...rest}
/>
