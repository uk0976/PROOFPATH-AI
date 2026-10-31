/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`
    }
    return `rgb(var(${variableName}))`
  }
}

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
          DEFAULT: withOpacity("--color-primary"),
          hover: withOpacity("--color-primary-hover"),
          light: withOpacity("--color-primary-light"),
        },
        secondary: {
          DEFAULT: withOpacity("--color-secondary"),
          hover: withOpacity("--color-secondary-hover"),
          light: withOpacity("--color-secondary-light"),
        },
        background: {
          DEFAULT: withOpacity("--color-background"),
          subtle: withOpacity("--color-background-subtle"),
        },
        surface: {
          DEFAULT: withOpacity("--color-surface"),
          muted: withOpacity("--color-surface-muted"),
        },
        ink: {
          DEFAULT: withOpacity("--color-ink"), // Primary Text
          secondary: withOpacity("--color-ink-secondary"), // Secondary Text
          muted: withOpacity("--color-ink-muted"),
          subtle: withOpacity("--color-ink-subtle"),
        },
        border: {
          DEFAULT: withOpacity("--color-border"),
          strong: withOpacity("--color-border-strong"),
          subtle: withOpacity("--color-border-subtle"),
        },
        status: {
          success: {
            DEFAULT: withOpacity("--color-status-success"),
            bg: withOpacity("--color-status-success-bg"),
            border: withOpacity("--color-status-success-border"),
          },
          warning: {
            DEFAULT: withOpacity("--color-status-warning"),
            bg: withOpacity("--color-status-warning-bg"),
            border: withOpacity("--color-status-warning-border"),
          },
          danger: {
            DEFAULT: withOpacity("--color-status-danger"),
            bg: withOpacity("--color-status-danger-bg"),
            border: withOpacity("--color-status-danger-border"),
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
