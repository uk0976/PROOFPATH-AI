/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#172B45",
          hover: "#101F33",
          light: "#213C5E",
        },
        secondary: {
          DEFAULT: "#315B83",
          hover: "#264868",
          light: "#EBF1F7",
        },
        background: {
          DEFAULT: "#F7F8FA",
          subtle: "#EFF1F5",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F9FAFC",
        },
        ink: {
          DEFAULT: "#202B38", // Primary Text
          secondary: "#687586", // Secondary Text
          muted: "#8C9BAE",
          subtle: "#B0BCCB",
        },
        border: {
          DEFAULT: "#E5E9EF",
          strong: "#CDD4DF",
          subtle: "#F0F2F6",
        },
        status: {
          success: {
            DEFAULT: "#23865B",
            bg: "#EBF6F0",
            border: "#BCE4CF",
          },
          warning: {
            DEFAULT: "#C28A32",
            bg: "#FDF7EC",
            border: "#F5DFB5",
          },
          danger: {
            DEFAULT: "#C65353",
            bg: "#FDF2F2",
            border: "#F5C2C2",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(23, 43, 69, 0.04)",
        card: "0 1px 3px 0 rgba(23, 43, 69, 0.05), 0 1px 2px -1px rgba(23, 43, 69, 0.03)",
        elevated: "0 4px 12px -2px rgba(23, 43, 69, 0.08), 0 2px 6px -1px rgba(23, 43, 69, 0.04)",
      },
    },
  },
  plugins: [],
}
