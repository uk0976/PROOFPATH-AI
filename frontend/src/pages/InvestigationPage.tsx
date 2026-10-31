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
  Quote,
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

export const InvestigationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  // Live SSE streaming state
  const [liveProgress, setLiveProgress] = useState<SSEProgressPayload | null>(null)
  const [eventLogs, setEventLogs] = useState<string[]>([])

  // Query session data
  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ["session", id],
    queryFn: () => researchService.getSession(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      // If processing, poll every 3s as fallback to SSE
      return query.state.data?.status === "processing" ? 3000 : false
    },
  })

  // Query contradictions
  const { data: conflicts } = useQuery({
    queryKey: ["conflicts", id],
    queryFn: () => findingService.getConflicts(id!),
    enabled: !!id && session?.status === "completed",
  })

  // SSE Listener for real-time progress updates
  useEffect(() => {
    if (!id || session?.status !== "processing") return

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
        console.error("Failed to parse SSE payload", e)
      }
    })

    eventSource.addEventListener("complete", (event) => {
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
  }, [id, session?.status, queryClient])

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Loading investigation dossier...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-xs text-rose-600">
        Investigation session not found.
      </div>
    )
  }

  const tier = getReadinessTier(session.readiness_score)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Session Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">DOSSIER #{session.id.slice(0, 8)}</span>
            <Badge variant={session.status === "completed" ? "success" : session.status === "processing" ? "warning" : "secondary"}>
              {session.status.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {session.title}
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl">
            {session.research_goal}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/report/${session.id}`}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Executive Report</span>
            </Button>
          </Link>
          <Link to={`/graph/${session.id}`}>
            <Button size="sm" variant="primary" className="gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Evidence Graph</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* If Currently Processing: Live SSE Progress Banner */}
      {session.status === "processing" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-brand animate-spin" />
                <span className="font-semibold text-slate-900 text-sm">
                  Forensic Multi-Agent Audit in Progress
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {liveProgress?.message || "Ingesting documents, extracting atomic claims, and cross-auditing contradictions..."}
              </p>
            </div>
            <span className="text-lg font-bold text-slate-900">
              {liveProgress?.progress || 15}%
            </span>
          </div>

          <Progress value={liveProgress?.progress || 15} />

          {/* Real-time Stage Log */}
          {eventLogs.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 font-mono text-[11px] text-slate-600 space-y-1 max-h-36 overflow-y-auto">
              {eventLogs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-brand">›</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision Readiness Verdict Banner */}
      {session.status === "completed" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Explainable Decision-Readiness Index (DRI)
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {session.readiness_score.toFixed(1)}%
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold border ${tier.bgColor} ${tier.color} ${tier.borderColor}`}>
                  {tier.tier}
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {session.executive_verdict || "Audit evaluation complete. Review cross-source conflicts and missing evidence below before signing off."}
              </p>
            </div>

            {/* Quick Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/gaps/${session.id}`}>
                <div className="px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Gap Analysis</span>
                </div>
              </Link>
              <Link to={`/blindspots/${session.id}`}>
                <div className="px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-brand" />
                  <span>BlindSpots</span>
                </div>
              </Link>
              <Link to={`/verification/${session.id}`}>
                <div className="px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all flex items-center gap-2">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verification Planner</span>
                </div>
              </Link>
            </div>
          </div>

          {/* 4 Score Factor Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Evidence Coverage (35%)
              </span>
              <div className="text-xl font-bold text-slate-900">
                {session.coverage_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-slate-500">
                Criteria with supporting data
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Consistency (30%)
              </span>
              <div className="text-xl font-bold text-slate-900">
                {session.consistency_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-slate-500">
                Cross-source claim consensus
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Freshness (15%)
              </span>
              <div className="text-xl font-bold text-slate-900">
                {session.freshness_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-slate-500">
                Publication currency & decay
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quote Verification (20%)
              </span>
              <div className="text-xl font-bold text-slate-900">
                {session.verification_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-slate-500">
                Verbatim substring match
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contradictions & Conflicts Section */}
      {session.status === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Detected Cross-Source Contradictions ({conflicts?.length || 0})
              </h2>
              <p className="text-xs text-slate-500">
                Direct factual divergences, conflicting benchmarks, and uncorroborated assertions.
              </p>
            </div>
            <Link to={`/graph/${session.id}`} className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              <span>View in Conflict Graph</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {conflicts && conflicts.length > 0 ? (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <ContradictionCard key={conflict.id} conflict={conflict} />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-slate-200 bg-white text-center text-xs text-slate-500">
              No cross-source contradictions detected. Sources are mutually consistent across criteria.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
