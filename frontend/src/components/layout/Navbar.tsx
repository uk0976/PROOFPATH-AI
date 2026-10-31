import React from "react"
import { Link, useLocation } from "react-router-dom"
import { ShieldCheck, Plus, Sparkles, Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/store/useAppStore"

export const Navbar: React.FC = () => {
  const location = useLocation()
  const { toggleMobileSidebar, theme, toggleTheme } = useAppStore()

  // Determine if active mode is dark
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-13 flex items-center justify-between">
        {/* Left: Mobile Toggle & Brand Pill */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            aria-label="Open mobile menu"
            className="lg:hidden p-1.5 rounded-md text-ink-secondary hover:text-ink hover:bg-background transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white shrink-0 shadow-subtle">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-ink text-sm tracking-tight flex items-center gap-1.5">
              PROOFPATH <span className="text-secondary font-bold text-[10px] uppercase">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-2 border-l border-border pl-3 ml-1">
            <Badge variant="secondary" className="font-mono text-[9px] text-ink-secondary py-0.5 border-border bg-background">
              FORENSIC INTEL
            </Badge>
            <span className="text-[11px] text-ink-muted">
              Know what's missing before you decide.
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-1.5 rounded-md text-ink-secondary hover:text-ink hover:bg-background border border-transparent hover:border-border transition-colors flex items-center justify-center"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-ink-secondary" />
            )}
          </button>

          <Link
            to="/demo"
            className="flex items-center space-x-1.5 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-300/80 font-medium px-2 sm:px-2.5 py-1 rounded-md transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden xs:inline">Demo Mode</span>
            <span className="xs:hidden">Demo</span>
          </Link>

          <Link
            to="/dashboard"
            className="hidden sm:inline-flex text-xs text-ink-secondary hover:text-ink font-medium px-2 py-1 rounded-md hover:bg-background transition-colors"
          >
            My Research
          </Link>

          <Link to="/research">
            <Button size="sm" variant="primary" className="h-8 text-xs px-2.5 sm:px-3">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">New Investigation</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
