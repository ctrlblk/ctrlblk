<script>
    import { cn } from "/src/lib/utils.js";

    let { children, class: className = "", ...rest } = $props();
</script>

<tr class={cn("border-b bg-white dark:border-gray-700 dark:bg-gray-800", className)} {...rest}>
    {@render children()}
</tr>
