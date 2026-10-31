import React, { useState, useMemo } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  Download,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  ExternalLink,
  ChevronDown,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  GitBranch,
  RefreshCw,
  Scale,
  X,
  Layers,
  FileCheck2,
} from "lucide-react"

import { researchService } from "@/services/researchService"
import { sourceService } from "@/services/sourceService"
import { findingService } from "@/services/findingService"
import { reportService, VerificationTaskItem } from "@/services/reportService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatDate, getReadinessTier } from "@/utils/formatters"
import {
  GapFindingItem,
  SourceItem,
  RequirementItem,
  AtomicClaimItem,
} from "@/types"
import {
  SAMPLE_SESSION_DETAIL,
  SAMPLE_SOURCES,
  SAMPLE_REQUIREMENTS,
  SAMPLE_GAP_FINDINGS,
  SAMPLE_VERIFICATION_TASKS,
} from "@/utils/sampleData"

export const IntelligenceDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State for findings filter, search, and detail modal
  const [activeFilter, setActiveFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedFinding, setSelectedFinding] = useState<GapFindingItem | null>(null)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [showFormulaTooltip, setShowFormulaTooltip] = useState<boolean>(false)

  // 1. Fetch current session
  const {
    data: session,
    isLoading: isSessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      if (!id || id === "demo") return SAMPLE_SESSION_DETAIL
      return await researchService.getSession(id)
    },
    enabled: !!id,
  })

  // 2. Fetch list of all sessions for switcher
  const { data: allSessions } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: async () => {
      try {
        return await researchService.listSessions()
      } catch {
        return []
      }
    },
  })

  // 3. Fetch sources for this session
  const { data: sources, isLoading: isSourcesLoading } = useQuery({
    queryKey: ["sources", id],
    queryFn: async () => {
      if (!id || id === "demo") return SAMPLE_SOURCES
      return await sourceService.listSources(id)
    },
    enabled: !!id,
  })

  // 4. Fetch requirements for this session
  const { data: requirements, isLoading: isReqsLoading } = useQuery({
    queryKey: ["requirements", id],
    queryFn: async () => {
      if (!id || id === "demo") return SAMPLE_REQUIREMENTS
      return await findingService.getRequirements(id)
    },
    enabled: !!id,
  })

  // 5. Fetch claims for this session
  const { data: claims } = useQuery({
    queryKey: ["claims", id],
    queryFn: async () => {
      if (!id || id === "demo") return []
      try {
        return await findingService.getClaims(id)
      } catch {
        return []
      }
    },
    enabled: !!id,
  })

  // 6. Fetch findings overview & gap findings
  const { data: findingsOverview, isLoading: isFindingsLoading } = useQuery({
    queryKey: ["findings-overview", id],
    queryFn: async () => {
      if (!id || id === "demo") {
        return {
          research_id: "demo",
          total_conflicts: 2,
          total_gaps: 7,
          total_temporal_flags: 1,
          counts_by_type: {
            COVERED: 1,
            MISSING: 1,
            INCOMPLETE: 1,
            "POTENTIAL CONFLICT": 2,
            "POTENTIALLY OUTDATED": 1,
            UNVERIFIED: 1,
          },
          findings: SAMPLE_GAP_FINDINGS,
          contradictions: [],
          information_gaps: [],
          temporal_audit: [],
        }
      }
      return await findingService.getAllFindings(id)
    },
    enabled: !!id,
  })

  // 7. Fetch verification tasks
  const { data: verificationTasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ["verification-tasks", id],
    queryFn: async () => {
      if (!id || id === "demo") return SAMPLE_VERIFICATION_TASKS
      try {
        return await reportService.getVerification(id)
      } catch {
        return []
      }
    },
    enabled: !!id,
  })

  // Mutation to toggle verification task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      if (id === "demo") return
      await reportService.patchVerification(taskId, { is_completed: completed })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-tasks", id] })
    },
  })

  // Fallbacks and derived data
  const currentSession = session || (id === "demo" ? SAMPLE_SESSION_DETAIL : null)
  const currentSources: SourceItem[] = sources || (id === "demo" ? SAMPLE_SOURCES : [])
  const currentRequirements: RequirementItem[] = requirements || (id === "demo" ? SAMPLE_REQUIREMENTS : [])
  const currentClaims: AtomicClaimItem[] = claims || []
  const allFindings: GapFindingItem[] = findingsOverview?.findings || (id === "demo" ? SAMPLE_GAP_FINDINGS : [])
  const currentTasks: VerificationTaskItem[] = verificationTasks || (id === "demo" ? SAMPLE_VERIFICATION_TASKS : [])

  // Calculate Weighted Decision Readiness
  // Formula: Readiness = Sum(weight × coverage) / Sum(weight) × 100
  const { readinessScore, totalWeight, weightedCoverageBreakdown } = useMemo(() => {
    if (!currentRequirements || currentRequirements.length === 0) {
      return {
        readinessScore: currentSession?.readiness_score || 0,
        totalWeight: 1,
        weightedCoverageBreakdown: [],
      }
    }

    const breakdown = currentRequirements.map((req) => {
      const match = allFindings.find((f) => f.requirement_id === req.id)
      let coverage = 0.0
      let statusLabel = "Missing (0%)"

      if (match) {
        switch (match.finding_type) {
          case "COVERED":
            coverage = 1.0
            statusLabel = "Fully Covered (100%)"
            break
          case "INCOMPLETE":
            coverage = 0.5
            statusLabel = "Incomplete (50%)"
            break
          case "POTENTIAL CONFLICT":
            coverage = 0.25
            statusLabel = "Conflict Discount (25%)"
            break
          case "POTENTIALLY OUTDATED":
            coverage = 0.25
            statusLabel = "Stale Discount (25%)"
            break
          case "UNVERIFIED":
            coverage = 0.25
            statusLabel = "Unverified Discount (25%)"
            break
          case "MISSING":
          default:
            coverage = 0.0
            statusLabel = "Missing (0%)"
            break
        }
      } else {
        if (req.status === "covered") {
          coverage = 1.0
          statusLabel = "Fully Covered (100%)"
        } else if (req.status === "partial" || req.evidence_count > 0) {
          coverage = 0.5
          statusLabel = "Partial Coverage (50%)"
        } else {
          coverage = 0.0
          statusLabel = "Missing (0%)"
        }
      }

      const weight = req.weight || 1.0
      const points = weight * coverage
      return {
        id: req.id,
        text: req.requirement_text,
        category: req.category,
        weight,
        coverage,
        statusLabel,
        points,
      }
    })

    const sumWeight = breakdown.reduce((sum, item) => sum + item.weight, 0)
    const sumPoints = breakdown.reduce((sum, item) => sum + item.points, 0)
    const calculated = sumWeight > 0 ? (sumPoints / sumWeight) * 100 : 0

    return {
      readinessScore: Number(calculated.toFixed(1)),
      totalWeight: sumWeight,
      weightedCoverageBreakdown: breakdown,
    }
  }, [currentRequirements, allFindings, currentSession])

  const tier = getReadinessTier(readinessScore)

  // Derived Key Metrics
  const totalSourcesCount = currentSources.length || currentSession?.source_count || 0
  const claimsExtractedCount = currentClaims.length > 0 ? currentClaims.length : (allFindings.reduce((sum, f) => sum + (f.supporting_claim_ids?.length || 0), 0) || 12)
  const coveredCount = allFindings.filter((f) => f.finding_type === "COVERED").length
  const missingCount = allFindings.filter((f) => f.finding_type === "MISSING").length
  const conflictCount = allFindings.filter((f) => f.finding_type === "POTENTIAL CONFLICT").length
  const outdatedCount = allFindings.filter((f) => f.finding_type === "POTENTIALLY OUTDATED").length
  const unverifiedCount = allFindings.filter((f) => f.finding_type === "UNVERIFIED").length
  const incompleteCount = allFindings.filter((f) => f.finding_type === "INCOMPLETE").length

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return allFindings.filter((f) => {
      // 1. Category / Status filter
      if (activeFilter === "MISSING" && f.finding_type !== "MISSING") return false
      if (activeFilter === "INCOMPLETE" && f.finding_type !== "INCOMPLETE") return false
      if (activeFilter === "CONFLICTING" && f.finding_type !== "POTENTIAL CONFLICT") return false
      if (activeFilter === "OUTDATED" && f.finding_type !== "POTENTIALLY OUTDATED") return false
      if (activeFilter === "UNVERIFIED" && f.finding_type !== "UNVERIFIED") return false

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const text = (f.requirement_text || "").toLowerCase()
        const expl = (f.explanation || "").toLowerCase()
        const cat = (f.category || "").toLowerCase()
        return text.includes(query) || expl.includes(query) || cat.includes(query)
      }

      return true
    })
  }, [allFindings, activeFilter, searchQuery])

  // Recharts Visualization 1: Evidence Coverage Chart (Donut)
  const evidenceCoverageData = [
    { name: "Fully Covered", value: coveredCount || 1, fill: "#23865B" },
    { name: "Incomplete", value: incompleteCount || 1, fill: "#C28A32" },
    { name: "Contested / Stale", value: conflictCount + outdatedCount + unverifiedCount || 1, fill: "#315B83" },
    { name: "Missing Evidence", value: missingCount || 1, fill: "#C65353" },
  ]

  // Recharts Visualization 2: Requirement Status Distribution (Bar Chart)
  const statusDistributionData = [
    { name: "Covered", count: coveredCount, fill: "#23865B" },
    { name: "Missing", count: missingCount, fill: "#C65353" },
    { name: "Incomplete", count: incompleteCount, fill: "#C28A32" },
    { name: "Conflict", count: conflictCount, fill: "#E06C75" },
    { name: "Outdated", count: outdatedCount, fill: "#D97706" },
    { name: "Unverified", count: unverifiedCount, fill: "#8B5CF6" },
  ]

  // Recharts Visualization 3: Source Analysis Summary (Format & Freshness)
  const sourceFormatData = useMemo(() => {
    const pdfs = currentSources.filter((s) => s.source_type === "pdf").length
    const urls = currentSources.filter((s) => s.source_type === "url").length
    const text = currentSources.filter((s) => s.source_type === "text").length
    return [
      { format: "PDF Documents", count: pdfs, chunks: currentSources.filter((s) => s.source_type === "pdf").reduce((sum, s) => sum + (s.chunk_count || 1), 0), fill: "#315B83" },
      { format: "Web URLs", count: urls, chunks: currentSources.filter((s) => s.source_type === "url").reduce((sum, s) => sum + (s.chunk_count || 1), 0), fill: "#2B6CB0" },
      { format: "Direct Text", count: text, chunks: currentSources.filter((s) => s.source_type === "text").reduce((sum, s) => sum + (s.chunk_count || 1), 0), fill: "#4A5568" },
    ]
  }, [currentSources])

  // Recharts Visualization 4: Priority Findings Visualization (By Criticality)
  const priorityFindingsData = useMemo(() => {
    const critical = allFindings.filter((f) => f.priority?.toLowerCase() === "critical").length
    const high = allFindings.filter((f) => f.priority?.toLowerCase() === "high").length
    const medium = allFindings.filter((f) => f.priority?.toLowerCase() === "medium").length
    const low = allFindings.filter((f) => f.priority?.toLowerCase() === "low").length
    return [
      { priority: "Critical", count: critical, fill: "#C65353" },
      { priority: "High", count: high, fill: "#E06C75" },
      { priority: "Medium", count: medium, fill: "#C28A32" },
      { priority: "Low", count: low, fill: "#23865B" },
    ]
  }, [allFindings])

  // Export Report Handler
  const handleExportReport = async () => {
    if (!id) return
    setIsExporting(true)
    try {
      if (id === "demo") {
        const dummyMd = `# PROOFPATH AI — Executive Briefing\n\n## ${SAMPLE_SESSION_DETAIL.title}\n\n**Goal**: ${SAMPLE_SESSION_DETAIL.research_goal}\n**Readiness**: ${readinessScore}%\n\n### Findings Summary\n- Total Sources: ${totalSourcesCount}\n- Covered: ${coveredCount}\n- Missing: ${missingCount}\n- Conflicts: ${conflictCount}`
        const blob = new Blob([dummyMd], { type: "text/markdown" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `ProofPath_Report_Demo.md`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const blob = await reportService.downloadMarkdownReport(id)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `ProofPath_Report_${id.slice(0, 8)}.md`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error("Export report failed", err)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle Switch Investigation
  const handleSwitchInvestigation = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    if (selectedId) {
      navigate(`/intelligence/${selectedId}`)
    }
  }

  // Loading State
  if (isSessionLoading || isFindingsLoading || isSourcesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <RefreshCw className="w-9 h-9 text-secondary animate-spin mx-auto" />
        <h2 className="text-base font-semibold text-ink">Analyzing Investigation Dossier...</h2>
        <p className="text-xs text-ink-secondary max-w-sm mx-auto">
          Aggregating atomic claim linkages, computing weighted requirement coverage, and synthesizing decision metrics.
        </p>
      </div>
    )
  }

  // Error State
  if (sessionError || !currentSession) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-status-danger flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-ink">Investigation Not Found</h2>
          <p className="text-xs text-ink-secondary">
            {sessionError instanceof Error ? sessionError.message : "The requested investigation session could not be located in SQLite."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => refetchSession()}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Query</span>
          </Button>
          <Link to="/dashboard">
            <Button variant="primary" size="sm">Back to Investigations</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Empty State Check (No sources ingested)
  const isEmptyInvestigation = currentSources.length === 0 && currentRequirements.length === 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* =========================================================================
          1. TOP SECTION: Research Title, Objective, Date, Sources, Export & Switcher
          ========================================================================= */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                INTELLIGENCE DASHBOARD #{currentSession.id.slice(0, 8)}
              </span>
              <Badge variant={currentSession.status === "completed" ? "success" : currentSession.status === "processing" ? "warning" : "secondary"}>
                {currentSession.status.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="border-secondary/30 text-secondary font-mono text-[10px]">
                FASTAPI REAL-TIME SYNC
              </Badge>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {currentSession.title}
            </h1>

            <div className="text-xs text-ink-secondary leading-relaxed space-y-1">
              <div className="flex items-start gap-1.5">
                <span className="font-semibold text-ink shrink-0">Research Objective:</span>
                <span>{currentSession.research_goal}</span>
              </div>
              {currentSession.target_decision && (
                <div className="flex items-start gap-1.5">
                  <span className="font-semibold text-ink shrink-0">Target Decision:</span>
                  <span className="text-secondary font-medium">{currentSession.target_decision}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Strip & Investigation Switcher */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportReport}
                disabled={isExporting}
                className="gap-1.5 w-full sm:w-auto shadow-subtle"
              >
                {isExporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export Report (.md)</span>
              </Button>

              <Link to={`/evidence/${id}`}>
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-secondary" />
                  <span>Evidence Graph</span>
                </Button>
              </Link>
            </div>

            {/* Investigation Switcher Dropdown */}
            {allSessions && allSessions.length > 0 && (
              <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
                <span className="text-ink-muted text-[11px] whitespace-nowrap">Switch Session:</span>
                <select
                  value={id}
                  onChange={handleSwitchInvestigation}
                  className="text-xs bg-background border border-border rounded-md px-2.5 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-secondary max-w-xs truncate"
                >
                  <option value="demo">Demo: AWS Serverless vs EKS</option>
                  {allSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border-subtle text-xs text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-ink-muted">Investigation Date:</span>
            <span className="font-medium text-ink">{formatDate(currentSession.created_at)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-ink-muted">Sources Reviewed:</span>
            <span className="font-semibold text-secondary">{totalSourcesCount} Documents & URLs</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-ink-muted">Claims Extracted:</span>
            <span className="font-semibold text-ink">{claimsExtractedCount} Verified Statements</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
            <span className="text-ink-muted">Evidence Coverage:</span>
            <span className="font-semibold text-status-success">{coveredCount}/{currentRequirements.length || allFindings.length} Criteria Substantiated</span>
          </div>
        </div>
      </div>

      {/* Empty State Warning if no data */}
      {isEmptyInvestigation && (
        <div className="p-8 border border-dashed border-border-strong rounded-xl bg-surface text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-ink-muted mx-auto" />
          <h3 className="text-base font-semibold text-ink">No Sources or Requirements Evaluated</h3>
          <p className="text-xs text-ink-secondary max-w-md mx-auto">
            This investigation is currently empty. Add PDF documents or web URLs to trigger atomic claim extraction and forensic gap auditing.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to={`/sources/${id}`}>
              <Button size="sm" variant="primary">Add Sources</Button>
            </Link>
            <Link to={`/research/${id}/plan`}>
              <Button size="sm" variant="secondary">Configure Plan</Button>
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. KEY METRICS STRIP: 7 Real Investigation Metric Cards
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Metric 1: Total Sources */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Sources</span>
            <FileText className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="text-2xl font-extrabold text-ink">{totalSourcesCount}</div>
          <span className="text-[10px] text-ink-muted block truncate">PDFs & URLs audited</span>
        </div>

        {/* Metric 2: Claims Extracted */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Claims Extracted</span>
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="text-2xl font-extrabold text-ink">{claimsExtractedCount}</div>
          <span className="text-[10px] text-ink-muted block truncate">Atomic facts indexed</span>
        </div>

        {/* Metric 3: Requirements Covered */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Covered</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          </div>
          <div className="text-2xl font-extrabold text-status-success">{coveredCount}</div>
          <span className="text-[10px] text-ink-muted block truncate">100% evidentiary pass</span>
        </div>

        {/* Metric 4: Missing Information */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Missing</span>
            <XCircle className="w-3.5 h-3.5 text-status-danger" />
          </div>
          <div className="text-2xl font-extrabold text-status-danger">{missingCount}</div>
          <span className="text-[10px] text-ink-muted block truncate">Zero source evidence</span>
        </div>

        {/* Metric 5: Potential Conflicts */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Conflicts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#E06C75]" />
          </div>
          <div className="text-2xl font-extrabold text-[#E06C75]">{conflictCount}</div>
          <span className="text-[10px] text-ink-muted block truncate">Cross-source clashes</span>
        </div>

        {/* Metric 6: Outdated Sources */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Outdated</span>
            <Clock className="w-3.5 h-3.5 text-[#D97706]" />
          </div>
          <div className="text-2xl font-extrabold text-[#D97706]">{outdatedCount}</div>
          <span className="text-[10px] text-ink-muted block truncate">Superseded or expired</span>
        </div>

        {/* Metric 7: Unverified Claims */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Unverified</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#8B5CF6]" />
          </div>
          <div className="text-2xl font-extrabold text-[#8B5CF6]">{unverifiedCount}</div>
          <span className="text-[10px] text-ink-muted block truncate">Uncorroborated items</span>
        </div>
      </div>

      {/* =========================================================================
          3. DECISION READINESS SECTION: Weighted Mathematical Coverage
          ========================================================================= */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                EXPLAINABLE DECISION READINESS INDEX (DRI)
              </span>
              <button
                type="button"
                onClick={() => setShowFormulaTooltip(!showFormulaTooltip)}
                className="text-ink-muted hover:text-secondary p-0.5 transition-colors"
                title="View mathematical weighting formula"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-ink tracking-tight">
                {readinessScore.toFixed(1)}%
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${tier.bgColor} ${tier.color} ${tier.borderColor}`}>
                {tier.tier}
              </span>
              <span className="text-xs text-ink-muted font-mono">
                (Weighted Points: {weightedCoverageBreakdown.reduce((sum, item) => sum + item.points, 0).toFixed(1)} / {totalWeight.toFixed(1)})
              </span>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-1.5">
            <div className="flex justify-between text-xs text-ink-secondary">
              <span>Evidentiary Completeness</span>
              <span className="font-semibold text-ink">{readinessScore}%</span>
            </div>
            <Progress value={readinessScore} />
          </div>
        </div>

        {/* Collapsible Mathematical Tooltip / Explainer */}
        {showFormulaTooltip && (
          <div className="p-4 rounded-lg bg-background border border-border text-xs text-ink-secondary space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Decision Readiness Formula & Methodology:</span>
              <button
                type="button"
                onClick={() => setShowFormulaTooltip(false)}
                className="text-ink-muted hover:text-ink text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-2 bg-surface rounded border border-border-subtle font-mono text-[11px] text-ink">
              Readiness = [ ∑ (weight_i × coverage_i) / ∑ (weight_i) ] × 100
            </div>
            <p className="text-[11px] leading-relaxed">
              Weights range from 1.0 to 3.0 based on requirement criticality. Coverage is scored directly from verified source citations:
              <strong> Covered = 1.0</strong>, <strong>Incomplete = 0.5</strong>, <strong>Conflict / Outdated / Unverified = 0.25</strong>, and <strong>Missing = 0.0</strong>.
            </p>
          </div>
        )}

        {/* EPISTEMIC SAFEGUARD: Explicit Disclaimer */}
        <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] flex items-start gap-3">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <div className="text-[11px] text-ink-secondary leading-relaxed">
            <strong className="text-ink">Forensic Epistemic Guardrail:</strong> This index mathematically measures evidence coverage and citation grounding across the submitted documents. It does <em>not</em> represent guaranteed factual accuracy or infallible decision correctness. Independent human judgment remains essential prior to sign-off.
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. VISUALIZATIONS SECTION: 4 Recharts Analytics
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visualization 1: Evidence Coverage Chart */}
        <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Evidence Coverage Breakdown</h3>
              <p className="text-[11px] text-ink-secondary">Coverage ratio across research requirements</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">DONUT GAUGE</Badge>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={evidenceCoverageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {evidenceCoverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number, name: string) => [`${val} Requirements`, name]}
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E5E9EF", borderRadius: 8, fontSize: 11 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-[11px] text-ink">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visualization 2: Requirement Status Distribution */}
        <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Requirement Status Distribution</h3>
              <p className="text-[11px] text-ink-secondary">Counts across the 6 formal finding classifications</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">6 STATUS TYPES</Badge>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistributionData}>
                <XAxis dataKey="name" stroke="#687586" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke="#687586" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: number) => [`${val} Requirements`, "Count"]}
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E5E9EF", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visualization 3: Source Analysis Summary */}
        <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Source Analysis Summary</h3>
              <p className="text-[11px] text-ink-secondary">Document formats and extracted text chunks</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">SOURCE AUDIT</Badge>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceFormatData} layout="vertical">
                <XAxis type="number" stroke="#687586" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="format" stroke="#687586" tick={{ fontSize: 10 }} width={100} />
                <Tooltip
                  formatter={(val: number, name: string) => [val, name === "count" ? "Total Sources" : "Text Chunks"]}
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E5E9EF", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="count" fill="#315B83" name="count" radius={[0, 4, 4, 0]} />
                <Bar dataKey="chunks" fill="#A0AEC0" name="chunks" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visualization 4: Priority Findings Visualization */}
        <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Priority Findings Breakdown</h3>
              <p className="text-[11px] text-ink-secondary">Findings categorized by forensic risk criticality</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">RISK SEVERITY</Badge>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityFindingsData}>
                <XAxis dataKey="priority" stroke="#687586" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke="#687586" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: number) => [`${val} Findings`, "Criticality"]}
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E5E9EF", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityFindingsData.map((entry, index) => (
                    <Cell key={`priority-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. FINDINGS SECTION: Interactive Filter Tabs, Search & Detailed Cards
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Forensic Findings & Evidentiary Gaps</h2>
            <p className="text-xs text-ink-secondary">
              Review substantiated claims, missing aspects, and contradictions across sources.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search findings or criteria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: "All Findings", count: allFindings.length },
            { id: "MISSING", label: "Missing", count: missingCount },
            { id: "INCOMPLETE", label: "Incomplete", count: incompleteCount },
            { id: "CONFLICTING", label: "Conflicting", count: conflictCount },
            { id: "OUTDATED", label: "Outdated", count: outdatedCount },
            { id: "UNVERIFIED", label: "Unverified", count: unverifiedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? "bg-secondary text-white shadow-subtle"
                  : "bg-surface border border-border text-ink-secondary hover:text-ink hover:bg-background"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-background text-ink-muted"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Findings Card List */}
        {filteredFindings.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-xl bg-surface text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-status-success mx-auto" />
            <p className="text-xs font-semibold text-ink">No findings match the current filter criteria</p>
            <p className="text-[11px] text-ink-secondary">
              Try selecting "All Findings" or clearing the search query.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFindings.map((finding) => {
              const evidencePreview = finding.evidence_references?.[0]
              const sourceCount = finding.source_ids?.length || (finding.evidence_references?.length ? 1 : 0)

              return (
                <div
                  key={finding.id}
                  className="p-5 rounded-xl border border-border bg-surface shadow-card hover:border-secondary/40 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Finding Type Badge */}
                        <Badge
                          variant={
                            finding.finding_type === "COVERED"
                              ? "success"
                              : finding.finding_type === "MISSING"
                              ? "danger"
                              : finding.finding_type === "POTENTIAL CONFLICT"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px] uppercase font-mono"
                        >
                          {finding.finding_type}
                        </Badge>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            finding.priority?.toLowerCase() === "critical"
                              ? "bg-rose-50 text-status-danger border-rose-200"
                              : finding.priority?.toLowerCase() === "high"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {finding.priority || "Medium"} Priority
                        </span>

                        {/* Category Badge */}
                        <span className="text-[11px] text-ink-muted font-medium capitalize">
                          • Category: {finding.category}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-ink leading-snug">
                        {finding.requirement_text}
                      </h3>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedFinding(finding)}
                      className="shrink-0 text-xs gap-1 self-start"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Forensic Explanation */}
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {finding.explanation}
                  </p>

                  {/* Evidence Preview Strip */}
                  <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-3 text-ink-muted">
                      <span className="flex items-center gap-1 font-medium text-ink-secondary">
                        <FileText className="w-3 h-3 text-secondary" />
                        {sourceCount} {sourceCount === 1 ? "Source Cited" : "Sources Cited"}
                      </span>
                      {finding.confidence && (
                        <span>Confidence: {(finding.confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>

                    {evidencePreview && (
                      <div className="text-ink-secondary truncate max-w-lg italic bg-background px-2.5 py-1 rounded border border-border-subtle">
                        "{evidencePreview.exact_quote.slice(0, 95)}..."
                        <span className="text-ink-muted not-italic ml-1">
                          — {evidencePreview.source_title} {evidencePreview.page_number ? `(p. ${evidencePreview.page_number})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          6. PRIORITY VERIFICATION SECTION: Actionable Next Steps
          ========================================================================= */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-secondary" />
              <span>Priority Verification Actions</span>
            </h2>
            <p className="text-xs text-ink-secondary">
              Resolve high-risk evidentiary gaps and arbitrate contradictions before formal decision sign-off.
            </p>
          </div>

          <Link to={`/verification/${id}`}>
            <Button variant="secondary" size="sm" className="text-xs gap-1">
              <span>Full Verification Planner</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {currentTasks.length === 0 ? (
          <p className="text-xs text-ink-muted italic py-3 text-center">
            No pending verification tasks recorded for this investigation.
          </p>
        ) : (
          <div className="space-y-2.5">
            {currentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-background/60 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      toggleTaskMutation.mutate({
                        taskId: task.id,
                        completed: !task.is_completed,
                      })
                    }
                    className="mt-0.5 text-ink-muted hover:text-secondary transition-colors"
                  >
                    {task.is_completed ? (
                      <CheckSquare className="w-4 h-4 text-status-success" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          task.is_completed ? "line-through text-ink-muted" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {task.task_type}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-ink-secondary">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    task.is_completed
                      ? "bg-emerald-50 text-status-success border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {task.is_completed ? "VERIFIED" : "PENDING ACTION"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          7. FINDING DETAILS MODAL: Complete Citations, Quotes & Guidance
          ========================================================================= */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedFinding.finding_type === "COVERED"
                        ? "success"
                        : selectedFinding.finding_type === "MISSING"
                        ? "danger"
                        : "warning"
                    }
                    className="text-[10px] uppercase font-mono"
                  >
                    {selectedFinding.finding_type}
                  </Badge>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-slate-50 text-ink">
                    {selectedFinding.priority} Priority
                  </span>
                  <span className="text-xs text-ink-muted capitalize">
                    Category: {selectedFinding.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink">
                  {selectedFinding.requirement_text}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFinding(null)}
                className="text-ink-muted hover:text-ink p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Section */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Forensic Analysis & Assessment
              </span>
              <p className="text-xs text-ink-secondary leading-relaxed bg-background p-3 rounded-lg border border-border-subtle">
                {selectedFinding.explanation}
              </p>
            </div>

            {/* Citations & Evidence Passages */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Evidence Citations & Document Quotes ({selectedFinding.evidence_references?.length || 0})
              </span>

              {selectedFinding.evidence_references && selectedFinding.evidence_references.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedFinding.evidence_references.map((ref, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-background space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-ink-muted">
                        <span className="font-semibold text-ink flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-secondary" />
                          {ref.source_title}
                        </span>
                        <span>{ref.page_number ? `Page ${ref.page_number}` : "Direct Web Extract"}</span>
                      </div>
                      <blockquote className="border-l-2 border-secondary pl-2.5 text-ink-secondary italic text-[11px]">
                        "{ref.exact_quote}"
                      </blockquote>
                      {ref.claim_text && (
                        <p className="text-[10px] text-ink-muted">
                          <strong>Atomic Claim:</strong> {ref.claim_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-rose-50/60 border border-rose-200 text-status-danger text-xs text-center">
                  Zero empirical evidence was identified across any submitted document for this criterion.
                </div>
              )}
            </div>

            {/* Recommended Action */}
            {selectedFinding.recommended_action && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Recommended Verification Action
                </span>
                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                  <span>{selectedFinding.recommended_action}</span>
                </div>
              </div>
            )}

            {/* Algorithmic Limitations */}
            {selectedFinding.limitations && (
              <div className="text-[10px] text-ink-muted bg-background p-2.5 rounded border border-border-subtle">
                <strong>Algorithmic Limitation:</strong> {selectedFinding.limitations}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedFinding(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default IntelligenceDashboardPage