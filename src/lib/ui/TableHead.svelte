<script>
    let { children, ...rest } = $props();
</script>

<thead class="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400" {...rest}>
    <tr>
        {@render children()}
    </tr>
</thead>
