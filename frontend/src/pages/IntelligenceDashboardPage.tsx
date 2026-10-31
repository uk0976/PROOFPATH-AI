import React from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import {
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { researchService } from "@/services/researchService"
import { findingService } from "@/services/findingService"
import { reportService } from "@/services/reportService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getReadinessTier, formatDate } from "@/utils/formatters"
import {
  SAMPLE_SESSION_DETAIL,
  SAMPLE_CONFLICTS,
  SAMPLE_GAPS,
  SAMPLE_BLINDSPOTS,
} from "@/utils/sampleData"

export const IntelligenceDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: session, isLoading, error } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      if (id === "demo") return SAMPLE_SESSION_DETAIL
      return await researchService.getSession(id!)
    },
    enabled: !!id,
  })

  const { data: conflicts } = useQuery({
    queryKey: ["conflicts", id],
    queryFn: async () => {
      if (id === "demo") return SAMPLE_CONFLICTS
      return await findingService.getConflicts(id!)
    },
    enabled: !!id,
  })

  const currentSession = session || (id === "demo" ? SAMPLE_SESSION_DETAIL : null)
  const currentConflicts = conflicts || (id === "demo" ? SAMPLE_CONFLICTS : [])
  const tier = currentSession ? getReadinessTier(currentSession.readiness_score) : getReadinessTier(0)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-secondary animate-spin mx-auto" />
        <p className="text-sm text-ink-secondary">Loading intelligence suite...</p>
      </div>
    )
  }

  if (error || !currentSession) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-ink">Investigation Not Found</h2>
        <p className="text-xs text-ink-secondary">{error instanceof Error ? error.message : "The requested investigation could not be located."}</p>
        <Link to="/dashboard">
          <Button variant="secondary" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  // Radar Data for Recharts
  const radarData = [
    { subject: "Coverage", score: currentSession.coverage_score, fullMark: 100 },
    { subject: "Consistency", score: currentSession.consistency_score, fullMark: 100 },
    { subject: "Freshness", score: currentSession.freshness_score, fullMark: 100 },
    { subject: "Verification", score: currentSession.verification_score, fullMark: 100 },
  ]

  // Severity Distribution
  const conflictSeverityData = [
    { name: "High Severity", count: currentConflicts.filter((c) => c.severity === "high").length, fill: "#C65353" },
    { name: "Medium Severity", count: currentConflicts.filter((c) => c.severity === "medium").length, fill: "#C28A32" },
    { name: "Low Severity", count: currentConflicts.filter((c) => c.severity === "low").length, fill: "#315B83" },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-ink-secondary">INTELLIGENCE SUITE</span>
            <Badge variant="secondary">ANALYTICS & RADAR</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {currentSession.title}
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Holistic forensic breakdown across the 4 Decision-Readiness dimensions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/report/${id}`}>
            <Button size="sm" variant="secondary">
              View Executive Report
            </Button>
          </Link>
          <Link to={`/evidence/${id}`}>
            <Button size="sm" variant="primary">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Evidence Graph</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
            Decision Readiness
          </span>
          <div className="text-3xl font-extrabold text-ink">
            {currentSession.readiness_score.toFixed(1)}%
          </div>
          <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${tier.bgColor} ${tier.color} ${tier.borderColor}`}>
            {tier.tier}
          </span>
        </div>

        <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
            Cross-Source Conflicts
          </span>
          <div className="text-3xl font-extrabold text-status-danger">
            {currentConflicts.length}
          </div>
          <p className="text-[11px] text-ink-secondary">
            Divergent metrics or assertions
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
            Evidence Coverage
          </span>
          <div className="text-3xl font-extrabold text-secondary">
            {currentSession.coverage_score.toFixed(1)}%
          </div>
          <p className="text-[11px] text-ink-secondary">
            Substantiated criteria ratio
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
            Quote Verification
          </span>
          <div className="text-3xl font-extrabold text-status-success">
            {currentSession.verification_score.toFixed(1)}%
          </div>
          <p className="text-[11px] text-ink-secondary">
            Zero hallucination match rate
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Decision Readiness Radar
            </h3>
            <span className="text-[11px] text-ink-secondary">Benchmark vs Ideal</span>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#E5E9EF" />
                <PolarAngleAxis dataKey="subject" stroke="#687586" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#E5E9EF" tick={{ fontSize: 9 }} />
                <Radar name="Readiness" dataKey="score" stroke="#315B83" fill="#315B83" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakdown Bar Chart */}
        <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Conflict Severity Distribution
            </h3>
            <span className="text-[11px] text-ink-secondary">By Criticality</span>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conflictSeverityData}>
                <XAxis dataKey="name" stroke="#687586" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} stroke="#687586" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E5E9EF", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
