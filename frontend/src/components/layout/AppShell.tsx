import React from "react"
import { Outlet, useLocation, useParams } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Sidebar } from "./Sidebar"
import { DemoBanner } from "@/components/demo/DemoBanner"
import { ThemeToggleFloating } from "@/components/common/ThemeToggleFloating"
import { DEMO_SESSION_ID, DEMO_ALIAS_ID } from "@/utils/sampleData"

export const AppShell: React.FC = () => {
  const location = useLocation()
  const { id } = useParams<{ id: string }>()

  // Check if active route is exploring the demonstration scenario
  const isDemo =
    id === DEMO_SESSION_ID ||
    id === DEMO_ALIAS_ID ||
    location.pathname.includes(DEMO_SESSION_ID) ||
    location.pathname.includes("/demo") ||
    location.search.includes("demo=true")

  const autoOpenTour = location.search.includes("tour=true")

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-ink transition-colors duration-200">
      <Navbar />
      {isDemo && <DemoBanner initialTourOpen={autoOpenTour} />}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {/* High-visibility floating theme switcher in bottom-right */}
      <ThemeToggleFloating />
    </div>
  )
}
