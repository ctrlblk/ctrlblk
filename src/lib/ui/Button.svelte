<script>
    import { cn } from "/src/lib/utils.js";

    let {
        children,
        class: className = "",
        disabled = false,
        pill = false,
        outline = false,
        size = "md",
        href,
        onclick,
        ...rest
    } = $props();

    const sizeClasses = {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-2.5 text-base",
    };
</script>

{#if href}
    <a
        {href}
        class={cn(
            "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            outline
                ? "border border-primary-700 text-primary-700 hover:bg-primary-700 hover:text-white dark:border-primary-500 dark:text-primary-500 dark:hover:bg-primary-500 dark:hover:text-white"
                : "bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700",
            pill ? "rounded-full" : "rounded-lg",
            sizeClasses[size] || sizeClasses.md,
            disabled && "pointer-events-none opacity-50",
            className,
        )}
        {...rest}
    >
        {@render children()}
    </a>
{:else}
    <button
        {disabled}
        {onclick}
        class={cn(
            "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            outline
                ? "border border-primary-700 text-primary-700 hover:bg-primary-700 hover:text-white dark:border-primary-500 dark:text-primary-500 dark:hover:bg-primary-500 dark:hover:text-white"
                : "bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700",
            pill ? "rounded-full" : "rounded-lg",
            sizeClasses[size] || sizeClasses.md,
            disabled && "pointer-events-none opacity-50",
            className,
        )}
        {...rest}
    >
        {@render children()}
    </button>
{/if}
