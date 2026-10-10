/** @type {import('tailwindcss').Config} */

// "Yellow paper" theme. The app was originally written for a dark UI, so
// instead of rewriting every class we remap the palette: `white` becomes
// dark ink, `slate` is inverted (low numbers = darkest ink), `indigo` is a
// coral highlighter, and light accent shades are darkened so they stay
// readable on paper.
const ink = "#1f2a44";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        white: ink,
        paper: "#fbf0b2",
        card: "#fff8cf",
        slate: {
          50: ink, 100: ink, 200: "#27324d", 300: "#374260", 400: "#4b5573",
          500: "#6b7290", 600: "#8a8fa6", 700: "#b5b3a0", 800: "#d9d3a8", 900: "#ece4b0",
        },
        indigo: {
          50: "#fff1ec", 100: "#fde0d6", 200: "#3b3b3b", 300: "#2b59c3", 400: "#2b59c3",
          500: "#f3a08d", 600: "#ef8f7a", 700: "#e07a63", 800: "#c9614b", 900: "#9a4636",
        },
        violet: { 300: "#6d28d9", 400: "#6d28d9", 500: "#c4a1f0", 600: "#b48be8" },
        purple: { 300: "#7e22ce", 400: "#7e22ce" },
        emerald: { 200: "#065f46", 300: "#047857", 400: "#047857" },
        green: { 300: "#15803d", 400: "#15803d" },
        teal: { 300: "#0f766e", 400: "#0f766e" },
        red: { 200: "#991b1b", 300: "#b91c1c", 400: "#c62828" },
        amber: { 300: "#a16207", 400: "#b45309" },
        yellow: { 200: "#854d0e", 300: "#a16207", 400: "#a16207" },
        blue: { 200: "#1e40af", 300: "#1d4ed8", 400: "#1d4ed8" },
      },
      // The UI uses /4 /6 /8 /12 /14 /16 opacities, which Tailwind 3 doesn't ship.
      opacity: { 4: "0.04", 6: "0.06", 8: "0.08", 12: "0.12", 14: "0.14", 16: "0.16" },
      fontFamily: {
        sans: ["Kalam", '"Patrick Hand"', "cursive"],
        hand: ["Caveat", '"Patrick Hand"', "cursive"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
