import React from "react"
import { Link, useLocation } from "react-router-dom"
import { ShieldCheck, Plus, Sparkles, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const Navbar: React.FC = () => {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <ShieldCheck className="w-4 h-4 text-brand-subtle" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                PROOFPATH <span className="text-brand font-bold text-xs uppercase tracking-wider">AI</span>
              </span>
            </div>
          </Link>
          <span className="text-slate-300">/</span>
          <Badge variant="secondary" className="font-mono text-[10px] text-slate-500 py-0.5">
            FORENSIC INTEL
          </Badge>
        </div>

        {/* Global Nav Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            to="/dashboard"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              location.pathname === "/dashboard"
                ? "bg-slate-100 text-navy-900"
                : "text-slate-600 hover:text-navy-900 hover:bg-slate-50"
            }`}
          >
            Dossiers
          </Link>
          <Link
            to="/research"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              location.pathname === "/research"
                ? "bg-slate-100 text-navy-900"
                : "text-slate-600 hover:text-navy-900 hover:bg-slate-50"
            }`}
          >
            New Audit
          </Link>
          <Link
            to="/settings"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              location.pathname === "/settings"
                ? "bg-slate-100 text-navy-900"
                : "text-slate-600 hover:text-navy-900 hover:bg-slate-50"
            }`}
          >
            Settings
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-2.5">
          <Link to="/research">
            <Button size="sm" variant="primary">
              <Plus className="w-3.5 h-3.5" />
              <span>Investigate</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
