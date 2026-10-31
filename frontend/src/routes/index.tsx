import React from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { LandingPage } from "@/pages/LandingPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ResearchPage } from "@/pages/ResearchPage"
import { InvestigationPage } from "@/pages/InvestigationPage"
import { InvestigationProgressPage } from "@/pages/InvestigationProgressPage"
import { IntelligenceDashboardPage } from "@/pages/IntelligenceDashboardPage"
import { SourcesPage } from "@/pages/SourcesPage"
import { GapAnalysisPage } from "@/pages/GapAnalysisPage"
import { EvidenceExplorerPage } from "@/pages/EvidenceExplorerPage"
import { BlindSpotPage } from "@/pages/BlindSpotPage"
import { VerificationPage } from "@/pages/VerificationPage"
import { ReportPage } from "@/pages/ReportPage"
import { SettingsPage } from "@/pages/SettingsPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      // 1. Landing Page
      { index: true, element: <LandingPage /> },

      // 2. Dashboard / My Research
      { path: "dashboard", element: <DashboardPage /> },

      // 3. Research Workspace
      { path: "research", element: <ResearchPage /> },

      // 4. Investigation Progress
      { path: "investigation/:id/progress", element: <InvestigationProgressPage /> },

      // 5. Intelligence Dashboard / Investigation Dossier
      { path: "investigation/:id", element: <InvestigationPage /> },
      { path: "intelligence/:id", element: <IntelligenceDashboardPage /> },

      // 6. Source Explorer
      { path: "sources/:id", element: <SourcesPage /> },

      // 7. Gap Analysis
      { path: "gaps/:id", element: <GapAnalysisPage /> },

      // 8. Evidence Explorer / Graph
      { path: "evidence/:id", element: <EvidenceExplorerPage /> },
      { path: "graph/:id", element: <EvidenceExplorerPage /> },

      // 9. BlindSpot Discovery
      { path: "blindspots/:id", element: <BlindSpotPage /> },

      // 10. Verification Planner
      { path: "verification/:id", element: <VerificationPage /> },

      // 11. Final Report
      { path: "report/:id", element: <ReportPage /> },

      // 12. Settings
      { path: "settings", element: <SettingsPage /> },

      // Fallback redirect
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
])
