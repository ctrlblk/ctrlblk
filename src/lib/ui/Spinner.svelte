<script>
    import { cn } from "/src/lib/utils.js";

    let { size = 8, class: className = "", ...rest } = $props();
</script>

<svg
    class={cn(`w-${size} h-${size} animate-spin text-gray-200 fill-primary-600 dark:text-gray-600`, className)}
    viewBox="0 0 100 101"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="status"
    {...rest}
>
    <path d="M100 50.59c0 27.61-22.39 50-50 50S0 78.2 0 50.59 22.39.59 50 .59s50 22.39 50 50zm-90.92 0c0 22.6 18.32 40.92 40.92 40.92s40.92-18.32 40.92-40.92S72.6 9.67 50 9.67 9.08 28 9.08 50.59z" fill="currentColor"/>
    <path d="M93.97 39.04c2.43-.64 3.93-3.13 3.04-5.48A50.003 50.003 0 0058.54 1.02c-2.42-.42-4.36 1.58-3.94 4.01.42 2.42 2.41 4.31 4.83 4.73a41.003 41.003 0 0131.6 26.76c.76 2.3 3.51 3.16 5.94 2.52z" fill="currentFill"/>
</svg>
