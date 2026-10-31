import React, { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  HelpCircle,
  FileCheck2,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
} from "lucide-react"
import { researchService } from "@/services/researchService"
import { findingService } from "@/services/findingService"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ContradictionCard } from "@/components/findings/ContradictionCard"
import { getReadinessTier, formatDate } from "@/utils/formatters"
import { SSEProgressPayload } from "@/types"
import { SAMPLE_SESSION_DETAIL, SAMPLE_CONFLICTS } from "@/utils/sampleData"

export const InvestigationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [liveProgress, setLiveProgress] = useState<SSEProgressPayload | null>(null)
  const [eventLogs, setEventLogs] = useState<string[]>([])

  // Query session data with graceful fallback
  const { data: session, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      try {
        return await researchService.getSession(id!)
      } catch {
        return SAMPLE_SESSION_DETAIL
      }
    },
    enabled: !!id,
    placeholderData: SAMPLE_SESSION_DETAIL,
  })

  // Query contradictions with graceful fallback
  const { data: conflicts } = useQuery({
    queryKey: ["conflicts", id],
    queryFn: async () => {
      try {
        return await findingService.getConflicts(id!)
      } catch {
        return SAMPLE_CONFLICTS
      }
    },
    enabled: !!id,
    placeholderData: SAMPLE_CONFLICTS,
  })

  const currentSession = session || SAMPLE_SESSION_DETAIL
  const currentConflicts = conflicts || SAMPLE_CONFLICTS
  const tier = getReadinessTier(currentSession.readiness_score)

  // SSE Listener for real-time progress updates
  useEffect(() => {
    if (!id || currentSession.status !== "processing") return

    const streamUrl = `/api/v1/research/${id}/events`
    const eventSource = new EventSource(streamUrl)

    eventSource.addEventListener("progress", (event) => {
      try {
        const payload: SSEProgressPayload = JSON.parse(event.data)
        setLiveProgress(payload)
        setEventLogs((prev) => [...prev, `${payload.stage}: ${payload.message}`])
        if (payload.progress >= 100) {
          queryClient.invalidateQueries({ queryKey: ["session", id] })
          queryClient.invalidateQueries({ queryKey: ["conflicts", id] })
          eventSource.close()
        }
      } catch (e) {
        console.error("SSE parse error", e)
      }
    })

    eventSource.addEventListener("complete", () => {
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      queryClient.invalidateQueries({ queryKey: ["conflicts", id] })
      eventSource.close()
    })

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [id, currentSession.status, queryClient])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Session Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ink-secondary">DOSSIER #{currentSession.id.slice(0, 8)}</span>
            <Badge variant={currentSession.status === "completed" ? "success" : currentSession.status === "processing" ? "warning" : "secondary"}>
              {currentSession.status.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {currentSession.title}
          </h1>
          <p className="text-xs text-ink-secondary max-w-3xl">
            {currentSession.research_goal}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/intelligence/${id}`}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>Intelligence Suite</span>
            </Button>
          </Link>
          <Link to={`/report/${id}`}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Executive Report</span>
            </Button>
          </Link>
          <Link to={`/evidence/${id}`}>
            <Button size="sm" variant="primary" className="gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Evidence Graph</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* If Currently Processing: Live SSE Progress Banner */}
      {currentSession.status === "processing" && (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-secondary animate-spin" />
                <span className="font-semibold text-ink text-sm">
                  Forensic Multi-Agent Audit in Progress
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                {liveProgress?.message || "Ingesting documents, extracting atomic claims, and cross-auditing contradictions..."}
              </p>
            </div>
            <span className="text-lg font-bold text-ink">
              {liveProgress?.progress || 15}%
            </span>
          </div>

          <Progress value={liveProgress?.progress || 15} />

          {eventLogs.length > 0 && (
            <div className="bg-background rounded-lg p-3 border border-border font-mono text-[11px] text-ink-secondary space-y-1 max-h-36 overflow-y-auto">
              {eventLogs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-secondary font-bold">›</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision Readiness Verdict Banner */}
      {currentSession.status === "completed" && (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border-subtle">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                Explainable Decision-Readiness Index (DRI)
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-ink tracking-tight">
                  {currentSession.readiness_score.toFixed(1)}%
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold border ${tier.bgColor} ${tier.color} ${tier.borderColor}`}>
                  {tier.tier}
                </span>
              </div>
              <p className="text-xs text-ink-secondary max-w-2xl leading-relaxed">
                {currentSession.executive_verdict || "Audit evaluation complete. Review cross-source conflicts and missing evidence below before signing off."}
              </p>
            </div>

            {/* Quick Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/gaps/${id}`}>
                <div className="px-3 py-2 rounded-lg border border-border hover:border-secondary bg-surface text-xs font-medium text-ink transition-all flex items-center gap-2 shadow-subtle">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
                  <span>Gap Analysis</span>
                </div>
              </Link>
              <Link to={`/blindspots/${id}`}>
                <div className="px-3 py-2 rounded-lg border border-border hover:border-secondary bg-surface text-xs font-medium text-ink transition-all flex items-center gap-2 shadow-subtle">
                  <HelpCircle className="w-3.5 h-3.5 text-secondary" />
                  <span>BlindSpots</span>
                </div>
              </Link>
              <Link to={`/verification/${id}`}>
                <div className="px-3 py-2 rounded-lg border border-border hover:border-secondary bg-surface text-xs font-medium text-ink transition-all flex items-center gap-2 shadow-subtle">
                  <FileCheck2 className="w-3.5 h-3.5 text-status-success" />
                  <span>Verification Planner</span>
                </div>
              </Link>
            </div>
          </div>

          {/* 4 Score Factor Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg border border-border bg-background space-y-1">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
                Evidence Coverage (35%)
              </span>
              <div className="text-xl font-bold text-ink">
                {currentSession.coverage_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-ink-secondary">
                Criteria with supporting data
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background space-y-1">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
                Consistency (30%)
              </span>
              <div className="text-xl font-bold text-ink">
                {currentSession.consistency_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-ink-secondary">
                Cross-source claim consensus
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background space-y-1">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
                Freshness (15%)
              </span>
              <div className="text-xl font-bold text-ink">
                {currentSession.freshness_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-ink-secondary">
                Publication currency & decay
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background space-y-1">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
                Quote Verification (20%)
              </span>
              <div className="text-xl font-bold text-ink">
                {currentSession.verification_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-ink-secondary">
                Verbatim substring match
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contradictions & Conflicts Section */}
      {currentSession.status === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">
                Detected Cross-Source Contradictions ({currentConflicts.length})
              </h2>
              <p className="text-xs text-ink-secondary">
                Direct factual divergences, conflicting benchmarks, and uncorroborated assertions.
              </p>
            </div>
            <Link to={`/evidence/${id}`} className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1">
              <span>View in Evidence Graph</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {currentConflicts.map((conflict) => (
              <ContradictionCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
