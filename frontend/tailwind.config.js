/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
        display: ["Work Sans", "Noto Sans", "sans-serif"],
      },
      colors: {
        primary: "#0a44b8",
        "primary-hover": "#083696",
        "background-light": "#F9F7F2",
        "background-dark": "#111827",
        "surface-light": "#FFFFFF",
        "surface-dark": "#1F2937",
        "text-main-light": "#1A202C",
        "text-main-dark": "#F3F4F6",
        "text-sub-light": "#4B5563",
        "text-sub-dark": "#9CA3AF",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
