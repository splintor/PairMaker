import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // lavender-periwinkle, blue-led, soft
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#3730a3",
        },
        peach: { 100: "#fff7ed", 200: "#fcd9b6", 700: "#b45309" },
      },
      borderRadius: { xl2: "1rem" },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Noto Sans Hebrew', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
