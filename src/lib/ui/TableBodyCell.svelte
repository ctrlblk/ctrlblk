<script>
    import { cn } from "/src/lib/utils.js";

    let { children, class: className = "", colspan, ...rest } = $props();
</script>

<td class={cn("px-6 py-4", className)} {colspan} {...rest}>
    {@render children()}
</td>
