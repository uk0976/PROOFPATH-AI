import React, { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Scale,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Globe,
  AlertTriangle,
  History,
  FileX,
  FileQuestion,
  ExternalLink,
  ChevronRight,
} from "lucide-react"
import { findingService } from "@/services/findingService"
import { researchService } from "@/services/researchService"
import { ContradictionCard } from "@/components/findings/ContradictionCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ContradictionItem, TemporalAuditItem, TemporalAuditOverviewData } from "@/types"
import { SAMPLE_SESSION_DETAIL, SAMPLE_CONFLICTS, DEMO_SESSION_ID } from "@/utils/sampleData"

export const ContradictionExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<"contradictions" | "temporal">("contradictions")
  const [conflictFilter, setConflictFilter] = useState<"ALL" | "GENUINE" | "FALSE_CONFLICT">("ALL")
  const [severityFilter, setSeverityFilter] = useState<string>("ALL")
  const [temporalStatusFilter, setTemporalStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // 1. Session Detail
  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          return await researchService.getSession(id!)
        } catch {
          return SAMPLE_SESSION_DETAIL
        }
      }
      return await researchService.getSession(id!)
    },
    enabled: !!id,
  })

  // 2. Cross-Source Contradictions
  const {
    data: rawConflicts,
    isLoading: loadingConflicts,
    isFetching: fetchingConflicts,
  } = useQuery({
    queryKey: ["contradictions", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          return await findingService.getConflicts(id!)
        } catch {
          return SAMPLE_CONFLICTS
        }
      }
      return await findingService.getConflicts(id!)
    },
    enabled: !!id,
  })

  // 3. Temporal Intelligence Audit
  const {
    data: temporalData,
    isLoading: loadingTemporal,
    isFetching: fetchingTemporal,
  } = useQuery({
    queryKey: ["temporal-audit", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          return await findingService.getForensicTemporalAudit(id!)
        } catch {
          return {
            research_id: DEMO_SESSION_ID,
            total_sources: 3,
            active_sources: 2,
            superseded_sources: 1,
            expired_sources: 0,
            differing_cycle_sources: 0,
            missing_metadata_sources: 0,
            audits: [
              {
                source_id: "demo-src-3",
                source_title: "[SAMPLE DATA] 2023 National Student Assistance Circular (Superseded Text)",
                source_type: "text",
                publication_date: "2023-08-01T00:00:00Z",
                status: "SUPERSEDED",
                applicability_verdict: "Superseded by 2026 guidelines",
                decay_risk: "medium",
                rationale: "August 2023 circular specifies a superseded $65,000 threshold that was replaced by 2026 statutory guidelines ($75,000).",
                recommended_action: "Confirm current financial eligibility using 2026 guidelines.",
                stale_claims: [],
              } as TemporalAuditItem,
            ],
          } as TemporalAuditOverviewData
        }
      }
      return await findingService.getForensicTemporalAudit(id!)
    },
    enabled: !!id,
  })

  // Mutation: Re-evaluate Contradictions
  const evaluateConflictsMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === "demo") return []
      return await findingService.evaluateContradictions(id)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["contradictions", id], data)
      queryClient.invalidateQueries({ queryKey: ["contradictions", id] })
    },
  })

  // Mutation: Re-evaluate Temporal Intelligence
  const evaluateTemporalMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === "demo") return null
      return await findingService.evaluateTemporal(id)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["temporal-audit", id], data)
      queryClient.invalidateQueries({ queryKey: ["temporal-audit", id] })
    },
  })

  const conflicts: ContradictionItem[] = rawConflicts || (id === "demo" ? SAMPLE_CONFLICTS : [])
  const audits: TemporalAuditItem[] = temporalData?.audits || []

  // Stats
  const genuineCount = conflicts.filter((c) => c.is_genuine !== false).length
  const falseConflictCount = conflicts.filter((c) => c.is_genuine === false).length
  const activeSourcesCount = temporalData?.active_sources ?? audits.filter((a) => a.status === "CURRENT_ACTIVE").length
  const supersededCount = temporalData?.superseded_sources ?? audits.filter((a) => a.status === "SUPERSEDED").length
  const expiredCount = temporalData?.expired_sources ?? audits.filter((a) => a.status === "EXPIRED").length
  const differingCycleCount = temporalData?.differing_cycle_sources ?? audits.filter((a) => a.status === "DIFFERENT_CYCLE").length
  const missingMetaCount = temporalData?.missing_metadata_sources ?? audits.filter((a) => a.status === "MISSING_METADATA").length

  // Filtered Contradictions
  const filteredConflicts = conflicts.filter((c) => {
    // 1. Conflict type filter
    if (conflictFilter === "GENUINE" && c.is_genuine === false) return false
    if (conflictFilter === "FALSE_CONFLICT" && c.is_genuine !== false) return false

    // 2. Severity filter
    if (severityFilter !== "ALL" && c.severity.toLowerCase() !== severityFilter.toLowerCase()) return false

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchAspect = c.conflicting_aspect?.toLowerCase().includes(q)
      const matchA = c.claim_a.claim_text?.toLowerCase().includes(q)
      const matchB = c.claim_b.claim_text?.toLowerCase().includes(q)
      const matchExpl = c.explanation?.toLowerCase().includes(q)
      return matchAspect || matchA || matchB || matchExpl
    }

    return true
  })

  // Filtered Temporal Audits
  const filteredAudits = audits.filter((a) => {
    if (temporalStatusFilter !== "ALL" && a.status !== temporalStatusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = a.source_title?.toLowerCase().includes(q)
      const matchVerdict = a.applicability_verdict?.toLowerCase().includes(q)
      const matchCycle = a.academic_year?.toLowerCase().includes(q) || a.application_cycle?.toLowerCase().includes(q)
      return matchTitle || matchVerdict || matchCycle
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-ink-secondary">PROOFPATH AI FORENSICS</span>
            <Badge variant="secondary">EPISTEMIC INTELLIGENCE</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-secondary" />
            Contradiction & Temporal Intelligence
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            10-dimensional cross-source scope comparisons, false conflict arbitration, and document applicability assessments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "contradictions" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={evaluateConflictsMutation.isPending || fetchingConflicts}
              onClick={() => evaluateConflictsMutation.mutate()}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${evaluateConflictsMutation.isPending || fetchingConflicts ? "animate-spin" : ""}`} />
              <span>Re-Evaluate Contradictions</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={evaluateTemporalMutation.isPending || fetchingTemporal}
              onClick={() => evaluateTemporalMutation.mutate()}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${evaluateTemporalMutation.isPending || fetchingTemporal ? "animate-spin" : ""}`} />
              <span>Re-Audit Temporal Freshness</span>
            </Button>
          )}

          <Link to={`/investigation/${id}`}>
            <Button size="sm" variant="secondary">
              Investigation Dossier
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 space-y-1">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Genuine Conflicts
          </span>
          <div className="text-2xl font-black text-rose-950">{genuineCount}</div>
          <p className="text-[11px] text-rose-700">Same cohort & cycle clash</p>
        </div>

        <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/20 space-y-1">
          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-sky-600" /> False Conflicts
          </span>
          <div className="text-2xl font-black text-sky-950">{falseConflictCount}</div>
          <p className="text-[11px] text-sky-700">Scope / cohort differentiated</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-1">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Operative Sources
          </span>
          <div className="text-2xl font-black text-emerald-950">{activeSourcesCount}</div>
          <p className="text-[11px] text-emerald-700">Currently applicable</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-1">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <History className="w-3 h-3 text-amber-600" /> Superseded / Expired
          </span>
          <div className="text-2xl font-black text-amber-950">{supersededCount + expiredCount}</div>
          <p className="text-[11px] text-amber-700">{supersededCount} superseded, {expiredCount} expired</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
            <FileQuestion className="w-3 h-3 text-slate-500" /> Metadata Gaps
          </span>
          <div className="text-2xl font-black text-slate-900">{missingMetaCount}</div>
          <p className="text-[11px] text-slate-600">Undated notices</p>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-border text-sm font-semibold">
        <button
          onClick={() => setActiveTab("contradictions")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "contradictions"
              ? "border-secondary text-secondary"
              : "border-transparent text-ink-secondary hover:text-ink"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Cross-Source Contradictions ({conflicts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("temporal")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "temporal"
              ? "border-secondary text-secondary"
              : "border-transparent text-ink-secondary hover:text-ink"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Temporal Intelligence & Applicability ({audits.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CROSS-SOURCE CONTRADICTIONS & SCOPE COMPARISONS   */}
      {/* ======================================================== */}
      {activeTab === "contradictions" && (
        <div className="space-y-6">
          {/* Epistemic Guidance Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <ShieldAlert className="w-4 h-4 text-secondary" />
              Epistemic Scope Comparison Mandate
            </div>
            <p className="leading-relaxed">
              Divergent statements across sources are not automatically contradictions. PROOFPATH AI decomposes statements across
              10 dimensions (applicant cohort, geographic scope, academic year, application cycle, numerical values, and conditions).
              Differences between distinct cohorts (e.g. Undergraduate 60% vs Postgraduate 65%) are classified as <strong>Compatible Scope Differentiations</strong>,
              while incompatible assertions for the same cohort and cycle are flagged as <strong>Genuine Contradictions</strong>.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Type:
              </span>
              <button
                onClick={() => setConflictFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  conflictFilter === "ALL" ? "bg-secondary text-white font-semibold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All ({conflicts.length})
              </button>
              <button
                onClick={() => setConflictFilter("GENUINE")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  conflictFilter === "GENUINE" ? "bg-rose-700 text-white font-semibold" : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                Genuine Conflicts ({genuineCount})
              </button>
              <button
                onClick={() => setConflictFilter("FALSE_CONFLICT")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  conflictFilter === "FALSE_CONFLICT" ? "bg-sky-700 text-white font-semibold" : "bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
                }`}
              >
                Scope Differentiations ({falseConflictCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claims or aspects..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          {/* Cards List */}
          {loadingConflicts ? (
            <div className="text-center py-12 space-y-2">
              <RefreshCw className="w-6 h-6 text-secondary animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Cross-auditing claims across competing sources...</p>
            </div>
          ) : filteredConflicts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Contradictions Matching Filters</h3>
              <p className="text-xs text-slate-500">
                All reviewed claims are compatible or no conflicts match your current filter parameters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConflicts.map((c) => (
                <ContradictionCard key={c.id} conflict={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TEMPORAL INTELLIGENCE & DOCUMENT APPLICABILITY    */}
      {/* ======================================================== */}
      {activeTab === "temporal" && (
        <div className="space-y-6">
          {/* Epistemic Guidance Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <Clock className="w-4 h-4 text-secondary" />
              Epistemic Temporal Applicability Standard
            </div>
            <p className="leading-relaxed">
              PROOFPATH AI evaluates <strong>operative applicability</strong>, not merely publication age. Older foundational
              statutes and institutional charters remain authoritative unless explicitly repealed or superseded. Conversely,
              a newer draft or unverified circular does not automatically take precedence. Sources are checked for explicit
              superseding references, formal expiry dates, and academic cycle alignment.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              {["ALL", "CURRENT_ACTIVE", "SUPERSEDED", "EXPIRED", "DIFFERENT_CYCLE", "MISSING_METADATA"].map((st) => (
                <button
                  key={st}
                  onClick={() => setTemporalStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    temporalStatusFilter === st
                      ? "bg-secondary text-white font-semibold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {st.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search source titles or cycles..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          {/* Temporal Source Cards */}
          {loadingTemporal ? (
            <div className="text-center py-12 space-y-2">
              <RefreshCw className="w-6 h-6 text-secondary animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Auditing document timelines, supersessions, and expiry dates...</p>
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Sources Found for Filter</h3>
              <p className="text-xs text-slate-500">Ingest documents with dates or clear the active filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAudits.map((audit) => {
                const isSuper = audit.status === "SUPERSEDED"
                const isExpired = audit.status === "EXPIRED"
                const isDiffCycle = audit.status === "DIFFERENT_CYCLE"
                const isMissing = audit.status === "MISSING_METADATA"

                return (
                  <div
                    key={audit.source_id}
                    className={`p-5 rounded-xl border bg-white shadow-card space-y-4 transition-all ${
                      isExpired ? "border-rose-300" : isSuper ? "border-amber-300" : isDiffCycle ? "border-purple-200" : "border-slate-200"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            isExpired
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : isSuper
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : isDiffCycle
                              ? "bg-purple-100 text-purple-800 border border-purple-300"
                              : isMissing
                              ? "bg-slate-100 text-slate-700 border border-slate-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}>
                            {audit.status.replace(/_/g, " ")}
                          </span>

                          <span className="text-[10px] text-slate-500 font-mono">
                            Risk: {audit.decay_risk.toUpperCase()}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {audit.source_type === "pdf" ? <FileText className="w-4 h-4 text-secondary" /> : <Globe className="w-4 h-4 text-secondary" />}
                          {audit.source_title}
                        </h3>
                      </div>

                      {audit.uri && (
                        <span className="text-xs text-secondary font-mono truncate max-w-xs bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                          {audit.uri}
                        </span>
                      )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Publication Date</span>
                        <span className="font-medium text-slate-800">{audit.publication_date || "Not detected"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Effective Date</span>
                        <span className="font-medium text-slate-800">{audit.effective_date || "Immediate"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Expiry / Validity</span>
                        <span className={`font-semibold ${isExpired ? "text-rose-700" : "text-slate-800"}`}>
                          {audit.expiry_date || "Ongoing (No explicit expiration)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Cycle / Academic Year</span>
                        <span className="font-medium text-slate-800">{audit.academic_year || audit.application_cycle || "General"}</span>
                      </div>
                    </div>

                    {/* Forensic Applicability Verdict */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-secondary" />
                        Forensic Applicability Verdict
                      </span>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {audit.applicability_verdict}
                      </p>
                    </div>

                    {/* Superseded Warning Banner if applicable */}
                    {audit.superseded_by_title && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Superseded by:</strong> '{audit.superseded_by_title}'. All future decisions should prioritize the newer revision.
                        </span>
                      </div>
                    )}

                    {/* Prescribed Action */}
                    {audit.recommended_action && (
                      <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200 text-xs text-sky-900 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                          <span><strong>Recommended Verification Action:</strong> {audit.recommended_action}</span>
                        </div>
                      </div>
                    )}

                    {/* Stale Claims List if any */}
                    {audit.stale_claims && audit.stale_claims.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="font-bold text-slate-700 text-[11px] block">
                          Cycle-Bound or Historical Claims ({audit.stale_claims.length}):
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {audit.stale_claims.map((sc) => (
                            <div key={sc.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-1">
                              <span className="text-secondary font-mono text-[10px] block font-semibold">
                                Applicable Period: {sc.date_reference || sc.applicable_period || "Historical"}
                              </span>
                              <p className="text-slate-800 font-medium">{sc.claim_text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
