import React from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { LandingPage } from "@/pages/LandingPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ResearchPage } from "@/pages/ResearchPage"
import { InvestigationPage } from "@/pages/InvestigationPage"
import { SourcesPage } from "@/pages/SourcesPage"
import { GapAnalysisPage } from "@/pages/GapAnalysisPage"
import { EvidenceGraphPage } from "@/pages/EvidenceGraphPage"
import { BlindSpotPage } from "@/pages/BlindSpotPage"
import { VerificationPage } from "@/pages/VerificationPage"
import { ReportPage } from "@/pages/ReportPage"
import { SettingsPage } from "@/pages/SettingsPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "research", element: <ResearchPage /> },
      { path: "investigation/:id", element: <InvestigationPage /> },
      { path: "sources/:id", element: <SourcesPage /> },
      { path: "gaps/:id", element: <GapAnalysisPage /> },
      { path: "graph/:id", element: <EvidenceGraphPage /> },
      { path: "blindspots/:id", element: <BlindSpotPage /> },
      { path: "verification/:id", element: <VerificationPage /> },
      { path: "report/:id", element: <ReportPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
])
