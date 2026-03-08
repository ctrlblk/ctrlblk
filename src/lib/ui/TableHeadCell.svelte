<script>
    import { cn } from "/src/lib/utils.js";

    let { children, class: className = "", ...rest } = $props();
</script>

<th class={cn("px-6 py-3", className)} {...rest}>
    {@render children()}
</th>
