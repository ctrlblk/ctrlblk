<script>
    import { cn } from "/src/lib/utils.js";

    let { children, class: className = "", style = "", ...rest } = $props();
</script>

<div
    class={cn("rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800", className)}
    {style}
    {...rest}
>
    {@render children()}
</div>
