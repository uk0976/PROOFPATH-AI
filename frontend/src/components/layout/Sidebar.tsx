import React from "react"
import { NavLink, useParams, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  FileText,
  AlertTriangle,
  GitBranch,
  HelpCircle,
  CheckSquare,
  FileCheck2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { DEMO_SESSION_ID } from "@/utils/sampleData"

export const Sidebar: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useAppStore()

  // Use current session ID from URL or fallback to demo session
  const activeSessionId = id || DEMO_SESSION_ID

  const primaryNavItems = [
    { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { label: "New Investigation", path: "/research", icon: PlusCircle },
    { label: "My Research", path: "/dashboard", icon: FolderKanban },
  ]

  const forensicNavItems = [
    { label: "Intelligence Dossier", path: `/investigation/${activeSessionId}`, icon: ShieldCheck },
    { label: "Sources", path: `/sources/${activeSessionId}`, icon: FileText },
    { label: "Gap Analysis", path: `/gaps/${activeSessionId}`, icon: AlertTriangle },
    { label: "Evidence Explorer", path: `/evidence/${activeSessionId}`, icon: GitBranch },
    { label: "BlindSpot Discovery", path: `/blindspots/${activeSessionId}`, icon: HelpCircle },
    { label: "Verification Planner", path: `/verification/${activeSessionId}`, icon: CheckSquare },
    { label: "Reports", path: `/report/${activeSessionId}`, icon: FileCheck2 },
  ]

  return (
    <aside
      className={`border-r border-border bg-surface transition-all duration-200 shrink-0 flex flex-col justify-between z-30 select-none ${
        sidebarOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="p-3 space-y-6">
        {/* Brand / Logo Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <NavLink to="/" className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 shadow-subtle">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-ink text-sm tracking-tight flex items-center gap-1.5">
                  PROOFPATH <span className="text-secondary font-bold text-[10px] uppercase">AI</span>
                </span>
                <span className="text-[10px] text-ink-secondary truncate">
                  Forensic Intelligence
                </span>
              </div>
            )}
          </NavLink>

          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="text-ink-secondary hover:text-ink hover:bg-background rounded-md p-1 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Global Primary Navigation */}
        <div className="space-y-1">
          {sidebarOpen && (
            <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider px-2.5 mb-1.5">
              Workspace
            </div>
          )}
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <NavLink
                key={item.label}
                to={item.path}
                title={item.label}
                className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-secondary-light text-secondary font-semibold"
                    : "text-ink-secondary hover:bg-background hover:text-ink"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-secondary" : "text-ink-secondary"}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </div>

        {/* Forensic Investigation Navigation */}
        <div className="space-y-1 pt-2 border-t border-border-subtle">
          {sidebarOpen && (
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                Forensic Analysis
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
            </div>
          )}

          {forensicNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path.split("/")[1] ? `/${item.path.split("/")[1]}` : item.path)

            return (
              <NavLink
                key={item.label}
                to={item.path}
                title={item.label}
                className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-secondary-light text-secondary font-semibold"
                    : "text-ink-secondary hover:bg-background hover:text-ink"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-secondary" : "text-ink-secondary"}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Footer / Settings Link */}
      <div className="p-3 border-t border-border space-y-1">
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? "bg-secondary-light text-secondary font-semibold"
                : "text-ink-secondary hover:bg-background hover:text-ink"
            }`
          }
        >
          <Settings className="w-4 h-4 shrink-0 text-ink-secondary" />
          {sidebarOpen && <span className="truncate">Settings</span>}
        </NavLink>

        {sidebarOpen && (
          <div className="px-2 pt-2 text-[10px] text-ink-muted flex items-center justify-between">
            <span>PROOFPATH v2.0</span>
            <span className="font-mono text-[9px] bg-background px-1.5 py-0.5 rounded border border-border">
              READY
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
