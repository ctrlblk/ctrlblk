<script>
    import { cn } from "/src/lib/utils.js";

    let { children, class: className = "", ...rest } = $props();
</script>

<label class={cn("text-sm font-medium text-gray-900 dark:text-white", className)} {...rest}>
    {@render children()}
</label>
