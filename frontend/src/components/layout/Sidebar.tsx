import React, { useEffect } from "react"
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
  ListOrdered,
  Scale,
  Layers,
  X,
  Sun,
  Moon,
} from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { DEMO_SESSION_ID } from "@/utils/sampleData"

export const Sidebar: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const {
    sidebarOpen,
    toggleSidebar,
    mobileSidebarOpen,
    closeMobileSidebar,
    theme,
    toggleTheme,
  } = useAppStore()

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  // Use current session ID from URL or fallback to demo session
  const activeSessionId = id || DEMO_SESSION_ID

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar()
  }, [location.pathname, closeMobileSidebar])

  const primaryNavItems = [
    { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { label: "New Investigation", path: "/research", icon: PlusCircle },
    { label: "My Research", path: "/dashboard", icon: FolderKanban },
    { label: "Demo Mode", path: "/demo", icon: Sparkles, badge: "SAMPLE" },
  ]

  const forensicNavItems = [
    { label: "Intelligence Dashboard", path: `/intelligence/${activeSessionId}`, icon: ShieldCheck },
    { label: "Investigation Dossier", path: `/investigation/${activeSessionId}`, icon: Layers },
    { label: "Research Plan", path: `/research/${activeSessionId}/plan`, icon: ListOrdered },
    { label: "Sources", path: `/sources/${activeSessionId}`, icon: FileText },
    { label: "Gap Analysis", path: `/gaps/${activeSessionId}`, icon: AlertTriangle },
    { label: "Contradictions & Temporal", path: `/contradictions/${activeSessionId}`, icon: Scale },
    { label: "Evidence Explorer", path: `/evidence/${activeSessionId}`, icon: GitBranch },
    { label: "BlindSpot Discovery", path: `/blindspots/${activeSessionId}`, icon: HelpCircle },
    { label: "Verification Planner", path: `/verification/${activeSessionId}`, icon: CheckSquare },
    { label: "Reports", path: `/report/${activeSessionId}`, icon: FileCheck2 },
  ]

  const renderContent = (isMobileView: boolean) => (
    <div className="flex flex-col h-full justify-between">
      <div className="p-3 space-y-5">
        {/* Brand / Logo Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <NavLink
            to="/"
            onClick={() => isMobileView && closeMobileSidebar()}
            className="flex items-center space-x-2.5 overflow-hidden"
          >
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white shrink-0 shadow-subtle">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            {(sidebarOpen || isMobileView) && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-ink text-xs tracking-tight flex items-center gap-1">
                  PROOFPATH <span className="text-secondary font-bold text-[9px] uppercase">AI</span>
                </span>
                <span className="text-[10px] text-ink-secondary truncate">
                  Forensic Intelligence
                </span>
              </div>
            )}
          </NavLink>

          {isMobileView ? (
            <button
              type="button"
              onClick={closeMobileSidebar}
              aria-label="Close mobile menu"
              className="text-ink-secondary hover:text-ink hover:bg-background rounded-md p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="text-ink-secondary hover:text-ink hover:bg-background rounded-md p-1 transition-colors"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Global Primary Navigation */}
        <div className="space-y-0.5">
          {(sidebarOpen || isMobileView) && (
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
                onClick={() => isMobileView && closeMobileSidebar()}
                title={item.label}
                className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-secondary-light/70 text-secondary font-semibold"
                    : "text-ink-secondary hover:bg-background hover:text-ink"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-secondary" : item.badge ? "text-amber-600" : "text-ink-secondary"}`} />
                {(sidebarOpen || isMobileView) && (
                  <div className="flex items-center justify-between flex-1 overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="font-mono text-[9px] bg-amber-100/90 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded shrink-0 ml-1">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            )
          })}
        </div>

        {/* Forensic Investigation Navigation */}
        <div className="space-y-0.5 pt-2 border-t border-border-subtle">
          {(sidebarOpen || isMobileView) && (
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                Forensic Analysis
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
            </div>
          )}

          {forensicNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(
              item.path.split("/")[1] ? `/${item.path.split("/")[1]}` : item.path
            )

            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={() => isMobileView && closeMobileSidebar()}
                title={item.label}
                className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-secondary-light/70 text-secondary font-semibold"
                    : "text-ink-secondary hover:bg-background hover:text-ink"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-secondary" : "text-ink-secondary"}`} />
                {(sidebarOpen || isMobileView) && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Footer / Settings & Theme Link */}
      <div className="p-3 border-t border-border space-y-1">
        <div className="flex items-center justify-between">
          <NavLink
            to="/settings"
            onClick={() => isMobileView && closeMobileSidebar()}
            title="Settings"
            className={({ isActive }) =>
              `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 ${
                isActive
                  ? "bg-secondary-light/70 text-secondary font-semibold"
                  : "text-ink-secondary hover:bg-background hover:text-ink"
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0 text-ink-secondary" />
            {(sidebarOpen || isMobileView) && <span className="truncate">Settings</span>}
          </NavLink>

          {(sidebarOpen || isMobileView) && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-1.5 text-ink-secondary hover:text-ink hover:bg-background rounded-md transition-colors ml-1"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-ink-secondary" />
              )}
            </button>
          )}
        </div>

        {(sidebarOpen || isMobileView) && (
          <div className="px-2 pt-1.5 text-[10px] text-ink-muted flex items-center justify-between">
            <span>PROOFPATH v2.0</span>
            <span className="font-mono text-[9px] bg-background px-1.5 py-0.5 rounded border border-border">
              {isDark ? "DARK" : "LIGHT"}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex border-r border-border bg-surface transition-all duration-200 shrink-0 flex-col justify-between z-30 select-none ${
          sidebarOpen ? "w-60" : "w-16"
        }`}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={closeMobileSidebar}
          />
          {/* Drawer Sheet */}
          <div className="relative w-72 max-w-[85vw] bg-surface h-full shadow-elevated border-r border-border z-10 animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
