import React from "react"
import { Link, useLocation } from "react-router-dom"
import { ShieldCheck, Plus, Sparkles, Terminal, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const Navbar: React.FC = () => {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-13 flex items-center justify-between">
        {/* Left Status Pill */}
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="font-mono text-[10px] text-ink-secondary py-0.5 border-border">
            FORENSIC INTEL PLATFORM
          </Badge>
          <span className="hidden sm:inline-block text-xs text-ink-muted">
            • "Know what's missing before you decide."
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <Link
            to="/demo"
            className="flex items-center space-x-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-medium px-2.5 py-1 rounded-md transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Demo Mode</span>
          </Link>
          <Link
            to="/dashboard"
            className="text-xs text-ink-secondary hover:text-ink font-medium px-2 py-1 rounded hover:bg-background transition-colors"
          >
            My Research
          </Link>
          <Link to="/research">
            <Button size="sm" variant="primary">
              <Plus className="w-3.5 h-3.5" />
              <span>New Investigation</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
