
const config = {
    content: ["./src/**/*.{html,js,svelte,ts}", , './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'],

    theme: {
        extend: {
            colors: {
               	// zinc
                primary: {
                    "50": "#fafafa",
                    "100": "#f4f4f5",
                    "200": "#e4e4e7",
                    "300": "#d4d4d8",
                    "400": "#a1a1aa",
                    "500": "#71717a",
                    "600": "#52525b",
                    "700": "#3f3f46",
                    "800": "#27272a",
                    "900": "#18181b",
                }
            }
        },
    },

    plugins: [require('flowbite/plugin')],
};

module.exports = config;
