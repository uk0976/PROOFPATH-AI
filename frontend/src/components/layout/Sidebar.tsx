import React from "react"
import { NavLink, useParams } from "react-router-dom"
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  GitBranch,
  HelpCircle,
  CheckSquare,
  FileCheck2,
  Clock,
  ArrowLeft,
} from "lucide-react"

export const Sidebar: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  if (!id) return null

  const navItems = [
    { label: "Readiness Dossier", path: `/investigation/${id}`, icon: LayoutDashboard },
    { label: "Sources & Provenance", path: `/sources/${id}`, icon: FileText },
    { label: "Gap & Missing Info", path: `/gaps/${id}`, icon: AlertTriangle },
    { label: "Evidence Graph", path: `/graph/${id}`, icon: GitBranch },
    { label: "BlindSpot Discovery", path: `/blindspots/${id}`, icon: HelpCircle },
    { label: "Verification Planner", path: `/verification/${id}`, icon: CheckSquare },
    { label: "Executive Report", path: `/report/${id}`, icon: FileCheck2 },
  ]

  return (
    <aside className="w-60 border-r border-slate-200/90 bg-white min-h-[calc(100vh-3.5rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-4">
        <NavLink
          to="/dashboard"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-navy-900 transition-colors gap-1.5 py-1 px-2 rounded-md hover:bg-slate-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Investigations</span>
        </NavLink>

        <div className="pt-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Forensic Investigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === `/investigation/${id}`}
                  className={({ isActive }) =>
                    `flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-slate-100 text-navy-900 font-semibold shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-navy-900"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 px-2">
        <div className="text-[10px] text-slate-400 flex items-center justify-between">
          <span>PROOFPATH FORENSIC v2.0</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </aside>
  )
}
