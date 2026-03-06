/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#2563EB",
                secondary: "#475569",
                accent: "#38bdf8",
            }
        },
    },
    plugins: [],
}
