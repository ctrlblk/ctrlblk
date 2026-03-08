<script>
    import { cn } from "/src/lib/utils.js";

    let { children, class: className = "", ...rest } = $props();
</script>

<div class="relative overflow-x-auto">
    <table class={cn("w-full text-left text-sm text-gray-500 dark:text-gray-400", className)} {...rest}>
        {@render children()}
    </table>
</div>
