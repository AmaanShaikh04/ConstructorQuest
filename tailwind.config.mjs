/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2541",
        "ink-soft": "#2C3A5E",
        "ink-line": "#3D4E7A",
        parchment: "#F4EFE1",
        "parchment-dim": "#E7DFC8",
        gold: "#C9A227",
        "gold-deep": "#9C7C15",
        forest: "#2F5233",
        rust: "#A13D2B",
        muted: "#9AA1B5",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
