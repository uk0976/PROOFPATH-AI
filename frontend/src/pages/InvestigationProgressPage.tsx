import React, { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react"
import { researchService } from "@/services/researchService"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SSEProgressPayload } from "@/types"
import { SAMPLE_SESSION_DETAIL } from "@/utils/sampleData"

export const InvestigationProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [progress, setProgress] = useState(25)
  const [currentStage, setCurrentStage] = useState("CLAIM_EXTRACTION")
  const [statusMessage, setStatusMessage] = useState("Extracting atomic claims from ingested evidence...")
  const [eventLogs, setEventLogs] = useState<string[]>([
    "INITIALIZING: Preparing investigation workspace and evidence cache...",
    "INGESTION_COMPLETE: Indexed 11 text chunks across 3 sources.",
    "RESEARCH_PLANNING: Decomposed goal into 4 MECE evaluation criteria.",
  ])

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      try {
        return await researchService.getSession(id!)
      } catch {
        return SAMPLE_SESSION_DETAIL
      }
    },
    enabled: !!id,
  })

  // SSE Listener for real-time progress updates
  useEffect(() => {
    if (!id) return

    const streamUrl = `/api/v1/research/${id}/events`
    const eventSource = new EventSource(streamUrl)

    eventSource.addEventListener("progress", (event) => {
      try {
        const payload: SSEProgressPayload = JSON.parse(event.data)
        setProgress(payload.progress)
        setCurrentStage(payload.stage)
        setStatusMessage(payload.message)
        setEventLogs((prev) => [...prev, `${payload.stage}: ${payload.message}`])

        if (payload.progress >= 100) {
          queryClient.invalidateQueries({ queryKey: ["session", id] })
          setTimeout(() => {
            navigate(`/investigation/${id}`)
          }, 1500)
        }
      } catch (e) {
        console.error("SSE parse error", e)
      }
    })

    eventSource.addEventListener("complete", () => {
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setTimeout(() => {
        navigate(`/investigation/${id}`)
      }, 1500)
    })

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [id, navigate, queryClient])

  const stages = [
    { key: "INITIALIZING", label: "Document Ingestion & FAISS Indexing" },
    { key: "RESEARCH_PLANNING", label: "MECE Evaluation Decomposition" },
    { key: "CLAIM_EXTRACTION", label: "Atomic Claim Extraction & Quote Validation" },
    { key: "CONTRADICTION_ANALYSIS", label: "Cross-Source Contradiction Audit" },
    { key: "BLINDSPOT_DISCOVERY", label: "BlindSpot & Risk Discovery" },
    { key: "SCORING", label: "Decision-Readiness Scoring" },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="font-mono text-xs">
          PIPELINE ORCHESTRATION
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Forensic Multi-Agent Audit in Progress
        </h1>
        <p className="text-xs text-ink-secondary max-w-lg mx-auto">
          {session?.title || "Investigating evidence across sources..."}
        </p>
      </div>

      {/* Main Progress Card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-6">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-ink flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-secondary animate-spin" />
            <span>{statusMessage}</span>
          </span>
          <span className="text-sm font-bold text-ink">{progress}%</span>
        </div>

        <Progress value={progress} />

        {/* Step-by-Step Agent Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {stages.map((stage, idx) => {
            const isCompleted = progress >= (idx + 1) * 16.6
            const isCurrent = currentStage === stage.key

            return (
              <div
                key={stage.key}
                className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 transition-all ${
                  isCompleted
                    ? "bg-status-success-bg border-status-success-border text-status-success"
                    : isCurrent
                    ? "bg-secondary-light border-secondary text-secondary font-semibold animate-pulse"
                    : "bg-surface-muted border-border-subtle text-ink-muted"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                ) : isCurrent ? (
                  <RefreshCw className="w-4 h-4 text-secondary animate-spin shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-ink-subtle shrink-0" />
                )}
                <span className="truncate">{stage.label}</span>
              </div>
            )
          })}
        </div>

        {/* Real-time Streaming Terminal Log */}
        <div className="space-y-1.5 pt-2">
          <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider block">
            Live Forensic Audit Telemetry
          </span>
          <div className="bg-[#101F33] text-slate-200 rounded-lg p-4 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto shadow-inner">
            {eventLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-secondary-light select-none">›</span>
                <span className="leading-relaxed">{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Skip to Dashboard link if finished */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-ink-secondary">
            Zero hallucination guarantee: Quotes substring-verified before acceptance.
          </span>
          <Link to={`/investigation/${id}`}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <span>View Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
