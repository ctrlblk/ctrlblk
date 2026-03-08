<script>
    import { cn } from "/src/lib/utils.js";

    let { children, flush = false, class: className = "", ...rest } = $props();
</script>

<div class={cn(flush ? "border-b border-gray-200 dark:border-gray-700" : "", className)} {...rest}>
    {@render children()}
</div>
