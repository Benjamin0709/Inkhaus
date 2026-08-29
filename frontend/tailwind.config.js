/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0908",
        ink2: "#111010",
        paper: "#f2ede8",
        paper2: "#e8e2db",
        red: { DEFAULT: "#c0392b", hover: "#e74c3c" },
        gold: "#c9a84c",
        muted: "#6b6560",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        italic: ["'Playfair Display'", "serif"],
      },
    },
  },
  plugins: [],
};
