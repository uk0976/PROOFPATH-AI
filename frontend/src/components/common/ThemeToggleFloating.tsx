import React from "react"
import { Sun, Moon } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"

export const ThemeToggleFloating: React.FC = () => {
  const { theme, toggleTheme } = useAppStore()

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Click to switch to Light Mode" : "Click to switch to Dark Mode"}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/90 hover:bg-surface border border-border shadow-elevated text-xs font-medium text-ink backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer group"
    >
      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-background border border-border/80 group-hover:border-secondary transition-colors">
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-secondary" />
        )}
      </div>
      <span className="font-semibold text-[11px] tracking-tight">
        {isDark ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  )
}

export default ThemeToggleFloating
