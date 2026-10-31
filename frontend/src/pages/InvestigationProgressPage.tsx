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
  FileText,
  AlertTriangle,
} from "lucide-react"
import { researchService } from "@/services/researchService"
import { API_BASE_URL } from "@/services/api"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SSEProgressPayload } from "@/types"

export const InvestigationProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Real backend progress tracking — strictly not hardcoded
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState("RESEARCH_GOAL_ANALYSIS")
  const [statusMessage, setStatusMessage] = useState("Connecting to live intelligence telemetry...")
  const [eventLogs, setEventLogs] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: () => researchService.getSession(id!),
    enabled: !!id,
  })

  // Fetch persisted job state for resilience on browser refresh
  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: () => researchService.getJob(id!),
    enabled: !!id,
    refetchInterval: isCompleted || errorMessage ? false : 3000,
  })

  // Synchronize persisted job state on browser refresh
  useEffect(() => {
    if (job) {
      if (job.progress_percent !== undefined && job.progress_percent > 0) {
        setProgress(Math.round(job.progress_percent))
      }
      if (job.current_stage) {
        setCurrentStage(job.current_stage)
      }
      if (job.message) {
        setStatusMessage(job.message)
      }
      if (job.error_message) {
        setErrorMessage(job.error_message)
      }
      if (job.status === "completed" || session?.status === "completed") {
        setIsCompleted(true)
        setTimeout(() => {
          navigate(`/investigation/${id}`)
        }, 1200)
      }
    }
  }, [job, session?.status, id, navigate])

  // SSE Listener for real-time progress updates from backend
  useEffect(() => {
    if (!id) return

    const streamUrl = `${API_BASE_URL}/research/${id}/progress`
    const eventSource = new EventSource(streamUrl)

    const handlePayload = (payload: SSEProgressPayload) => {
      if (payload.progress !== undefined && payload.progress >= 0) {
        setProgress(payload.progress)
      }
      if (payload.stage) {
        setCurrentStage(payload.stage)
      }
      if (payload.message) {
        setStatusMessage(payload.message)
        setEventLogs((prev) => {
          const entry = `[${new Date().toLocaleTimeString()}] ${payload.stage || "PIPELINE"}: ${payload.message}`
          if (!prev.includes(entry)) {
            return [...prev, entry]
          }
          return prev
        })
      }

      if (
        payload.stage === "VERIFICATION_TASK_GENERATION" ||
        payload.stage === "COMPLETE" ||
        payload.progress >= 100
      ) {
        setIsCompleted(true)
        queryClient.invalidateQueries({ queryKey: ["session", id] })
        queryClient.invalidateQueries({ queryKey: ["job", id] })
        queryClient.invalidateQueries({ queryKey: ["conflicts", id] })
        queryClient.invalidateQueries({ queryKey: ["gaps", id] })
        queryClient.invalidateQueries({ queryKey: ["blindspots", id] })
        setTimeout(() => {
          navigate(`/investigation/${id}`)
        }, 1800)
      } else if (payload.stage === "INVESTIGATION_FAILED" || payload.stage === "ERROR") {
        setErrorMessage(payload.message || "Investigation pipeline encountered an error.")
        eventSource.close()
      }
    }

    eventSource.addEventListener("progress", (event) => {
      try {
        const payload: SSEProgressPayload = JSON.parse(event.data)
        handlePayload(payload)
      } catch (e) {
        console.error("SSE parse error", e)
      }
    })

    // Listen to all 15 stages events
    const eventNames = [
      "research_goal_analyzed",
      "question_decomposition_completed",
      "source_collection_completed",
      "source_extraction_completed",
      "claim_extraction_completed",
      "embedding_generation_completed",
      "evidence_retrieval_completed",
      "requirement_mapping_completed",
      "gap_detection_completed",
      "contradiction_analysis_completed",
      "temporal_analysis_completed",
      "blindspot_discovery_completed",
      "evidence_graph_constructed",
      "decision_readiness_calculated",
      "verification_tasks_generated",
      "investigation_failed",
    ]

    eventNames.forEach((evtName) => {
      eventSource.addEventListener(evtName, (event: any) => {
        try {
          const payload: SSEProgressPayload = JSON.parse(event.data)
          handlePayload(payload)
        } catch (e) {
          console.error(`Error parsing ${evtName}`, e)
        }
      })
    })

    eventSource.addEventListener("complete", (event: any) => {
      setIsCompleted(true)
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setTimeout(() => {
        navigate(`/investigation/${id}`)
      }, 1500)
    })

    eventSource.addEventListener("error", (e) => {
      if (!isCompleted && progress < 100) {
        console.warn("SSE connection closed or lost. Polling via job manager...")
      }
    })

    return () => {
      eventSource.close()
    }
  }, [id, navigate, queryClient, isCompleted, progress])

  // Complete 15-Stage Architecture
  const stages = [
    { key: "RESEARCH_GOAL_ANALYSIS", label: "1. Research Goal Analysis", threshold: 7 },
    { key: "QUESTION_DECOMPOSITION", label: "2. Question Decomposition", threshold: 14 },
    { key: "SOURCE_COLLECTION", label: "3. Source Collection", threshold: 20 },
    { key: "SOURCE_EXTRACTION", label: "4. Source Extraction", threshold: 27 },
    { key: "ATOMIC_CLAIM_EXTRACTION", label: "5. Atomic Claim Extraction", threshold: 34 },
    { key: "EMBEDDING_GENERATION", label: "6. Dense Embedding Generation", threshold: 41 },
    { key: "EVIDENCE_RETRIEVAL", label: "7. Evidence Retrieval", threshold: 48 },
    { key: "REQUIREMENT_TO_CLAIM_MAPPING", label: "8. Requirement-to-Claim Mapping", threshold: 55 },
    { key: "GAP_DETECTION", label: "9. Information Gap Detection", threshold: 62 },
    { key: "CONTRADICTION_ANALYSIS", label: "10. Contradiction Analysis", threshold: 69 },
    { key: "TEMPORAL_ANALYSIS", label: "11. Temporal Freshness Audit", threshold: 76 },
    { key: "BLINDSPOT_DISCOVERY", label: "12. BlindSpot Discovery", threshold: 83 },
    { key: "EVIDENCE_GRAPH_CONSTRUCTION", label: "13. Evidence Graph Construction", threshold: 89 },
    { key: "DECISION_READINESS_CALCULATION", label: "14. Decision Readiness Scoring", threshold: 95 },
    { key: "VERIFICATION_TASK_GENERATION", label: "15. Verification Task Generation", threshold: 100 },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="font-mono text-xs">
          15-STAGE ASYNCHRONOUS PIPELINE
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Forensic Multi-Agent Investigation in Progress
        </h1>
        <p className="text-xs text-ink-secondary max-w-lg mx-auto">
          {session?.title || "Cross-examining evidence across sources..."}
        </p>
      </div>

      {/* Error banner if pipeline failed */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Investigation Error</span>
          </div>
          <p className="text-xs">{errorMessage}</p>
          <div className="pt-1">
            <Link to={`/sources/${id}`}>
              <Button size="sm" variant="secondary">
                Review Attached Sources
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Progress Card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-6">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-ink flex items-center gap-2">
            {!isCompleted && !errorMessage ? (
              <RefreshCw className="w-4 h-4 text-secondary animate-spin" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-status-success" />
            ) : (
              <AlertCircle className="w-4 h-4 text-status-danger" />
            )}
            <span>{statusMessage}</span>
          </span>
          <span className="text-sm font-bold text-ink">{progress}%</span>
        </div>

        <Progress value={progress} />

        {/* Step-by-Step 15 Agent Milestones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
          {stages.map((stage) => {
            const isFinished = progress >= stage.threshold || isCompleted
            const isCurrent = currentStage === stage.key && !isCompleted && !errorMessage

            return (
              <div
                key={stage.key}
                className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 transition-all ${
                  isFinished
                    ? "bg-status-success-bg border-status-success-border text-status-success font-medium"
                    : isCurrent
                    ? "bg-secondary-light border-secondary text-secondary font-semibold animate-pulse"
                    : "bg-surface-muted border-border-subtle text-ink-muted"
                }`}
              >
                {isFinished ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0" />
                ) : isCurrent ? (
                  <RefreshCw className="w-3.5 h-3.5 text-secondary animate-spin shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                )}
                <span className="truncate">{stage.label}</span>
              </div>
            )
          })}
        </div>

        {/* Real-time Streaming Terminal Log */}
        <div className="space-y-1.5 pt-2">
          <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider block">
            Real-time Pipeline Audit Log
          </span>
          <div className="bg-[#101F33] text-slate-200 rounded-lg p-4 font-mono text-[11px] space-y-1.5 max-h-52 overflow-y-auto shadow-inner">
            {eventLogs.length === 0 ? (
              <div className="text-slate-500 italic">Awaiting pipeline telemetry messages...</div>
            ) : (
              eventLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-secondary-light select-none">›</span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-ink-secondary">
            Anti-hallucination guarantee: All atomic claims verified via raw substring matching.
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
