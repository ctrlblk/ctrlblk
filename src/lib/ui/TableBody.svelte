<script>
    import { cn } from "/src/lib/utils.js";

    let { children, class: className = "", ...rest } = $props();
</script>

<tbody class={cn(className)} {...rest}>
    {@render children()}
</tbody>
