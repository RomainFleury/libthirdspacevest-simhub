import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vest: {
          primary: "#0ea5e9",
          accent: "#22d3ee",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

