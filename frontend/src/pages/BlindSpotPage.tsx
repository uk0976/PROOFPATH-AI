import React, { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  HelpCircle,
  PlusCircle,
  CheckCircle2,
  Circle,
  Star,
  EyeOff,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Quote,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react"
import { reportService } from "@/services/reportService"
import { researchService } from "@/services/researchService"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BlindSpotItem, BlindSpotSourceReference } from "@/types"
import { SAMPLE_SESSION_DETAIL, SAMPLE_BLINDSPOTS } from "@/utils/sampleData"

export const BlindSpotPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [activeFilter, setActiveFilter] = useState<"ALL" | "STARRED" | "UNCOVERED" | "ADDED" | "DISMISSED">("ALL")
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>({})

  // Session Query
  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      if (id === "demo") return SAMPLE_SESSION_DETAIL
      return await researchService.getSession(id!)
    },
    enabled: !!id,
  })

  // BlindSpots Query
  const {
    data: rawBlindspots,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["blindspots", id],
    queryFn: async () => {
      if (id === "demo") return SAMPLE_BLINDSPOTS
      return await reportService.getBlindspots(id!, { include_dismissed: true })
    },
    enabled: !!id,
  })

  // Mutation: Trigger BlindSpot Discovery
  const discoverMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === "demo") return []
      return await reportService.discoverBlindspots(id)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["blindspots", id], data)
      queryClient.invalidateQueries({ queryKey: ["blindspots", id] })
    },
  })

  // Mutation: Add to Research Plan
  const addToPlanMutation = useMutation({
    mutationFn: (spotId: string) => reportService.addToPlan(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blindspots", id] })
      queryClient.invalidateQueries({ queryKey: ["requirements", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
    },
  })

  // Mutation: Toggle Star
  const toggleStarMutation = useMutation({
    mutationFn: (spotId: string) => reportService.toggleStar(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blindspots", id] })
    },
  })

  // Mutation: Dismiss / Restore
  const dismissMutation = useMutation({
    mutationFn: (spotId: string) => reportService.dismissBlindspot(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blindspots", id] })
    },
  })

  // Mutation: Toggle Investigated / Resolved
  const investigateMutation = useMutation({
    mutationFn: (spotId: string) => reportService.toggleBlindspot(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blindspots", id] })
    },
  })

  const blindspots: BlindSpotItem[] = rawBlindspots || (id === "demo" ? SAMPLE_BLINDSPOTS : [])

  // Stats
  const totalCount = blindspots.length
  const activeCount = blindspots.filter((b) => !b.is_dismissed).length
  const starredCount = blindspots.filter((b) => b.is_starred && !b.is_dismissed).length
  const uncoveredCount = blindspots.filter((b) => b.evidence_coverage === "uncovered" && !b.is_dismissed).length
  const addedCount = blindspots.filter((b) => b.is_added_to_plan).length
  const dismissedCount = blindspots.filter((b) => b.is_dismissed).length

  // Filtered List
  const filteredSpots = blindspots.filter((spot) => {
    // 1. Status Filter
    if (activeFilter === "STARRED" && (!spot.is_starred || spot.is_dismissed)) return false
    if (activeFilter === "UNCOVERED" && (spot.evidence_coverage !== "uncovered" || spot.is_dismissed)) return false
    if (activeFilter === "ADDED" && !spot.is_added_to_plan) return false
    if (activeFilter === "DISMISSED" && !spot.is_dismissed) return false
    if (activeFilter === "ALL" && spot.is_dismissed) return false

    // 2. Priority Filter
    if (priorityFilter !== "ALL" && spot.priority !== priorityFilter) return false

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchQ = spot.question.toLowerCase().includes(q)
      const matchRat = spot.rationale.toLowerCase().includes(q)
      const matchExpl = spot.explanation?.toLowerCase().includes(q)
      const matchCat = spot.category.toLowerCase().includes(q)
      return matchQ || matchRat || matchExpl || matchCat
    }

    return true
  })

  const toggleExpandRef = (spotId: string) => {
    setExpandedRefs((prev) => ({ ...prev, [spotId]: !prev[spotId] }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-ink-secondary">PROOFPATH AI FORENSICS</span>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3 text-secondary" />
              AI STRATEGIC DISCOVERY
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-secondary" />
            BlindSpot Discovery — Questions You Forgot to Ask
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Proactive identification of unaddressed risk vectors, edge-case exceptions, and unasked critical criteria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={discoverMutation.isPending || isFetching}
            onClick={() => discoverMutation.mutate()}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${discoverMutation.isPending || isFetching ? "animate-spin" : ""}`} />
            <span>Discover New BlindSpots</span>
          </Button>

          <Link to={`/research/${id}/plan`}>
            <Button size="sm" variant="secondary">
              View Active Plan ({session?.requirement_count ?? 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* Prominent Epistemic Advisory Banner */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1.5">
        <div className="font-bold flex items-center gap-2 uppercase tracking-wider text-[11px] text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          AI-Generated Advisory • Non-Mandated Epistemic Disclaimer
        </div>
        <p className="leading-relaxed text-amber-800">
          Questions presented below are <strong>AI-generated strategic discovery hypotheses</strong>, constructed by simulating
          counter-factual scenarios, transfer restrictions, renewal hurdles, and operational dependencies.
          They are <strong>NEVER presented as officially mandated institutional requirements</strong> unless you review, approve,
          and add them directly into your active Research Plan.
        </p>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            Active Suggestions
          </span>
          <div className="text-2xl font-black text-ink">{activeCount}</div>
          <p className="text-[11px] text-ink-secondary">Candidate blindspots</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-1">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-600 fill-amber-500" /> Starred
          </span>
          <div className="text-2xl font-black text-amber-950">{starredCount}</div>
          <p className="text-[11px] text-amber-700">Marked as important</p>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 space-y-1">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Uncovered
          </span>
          <div className="text-2xl font-black text-rose-950">{uncoveredCount}</div>
          <p className="text-[11px] text-rose-700">Zero corpus evidence</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-1">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Added to Plan
          </span>
          <div className="text-2xl font-black text-emerald-950">{addedCount}</div>
          <p className="text-[11px] text-emerald-700">Promoted requirements</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
            <EyeOff className="w-3 h-3 text-slate-500" /> Dismissed
          </span>
          <div className="text-2xl font-black text-slate-800">{dismissedCount}</div>
          <p className="text-[11px] text-slate-600">Soft-dismissed</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> View:
          </span>
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "ALL" ? "bg-secondary text-white font-semibold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Suggestions ({activeCount})
          </button>
          <button
            onClick={() => setActiveFilter("STARRED")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "STARRED" ? "bg-amber-600 text-white font-semibold" : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            Starred ({starredCount})
          </button>
          <button
            onClick={() => setActiveFilter("UNCOVERED")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "UNCOVERED" ? "bg-rose-700 text-white font-semibold" : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            Uncovered in Corpus ({uncoveredCount})
          </button>
          <button
            onClick={() => setActiveFilter("ADDED")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "ADDED" ? "bg-emerald-700 text-white font-semibold" : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Added to Plan ({addedCount})
          </button>
          <button
            onClick={() => setActiveFilter("DISMISSED")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "DISMISSED" ? "bg-slate-700 text-white font-semibold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Dismissed ({dismissedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or rationale..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-secondary"
          />
        </div>
      </div>

      {/* BlindSpot Suggestions Cards List */}
      {isLoading ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-secondary animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Examining research goal and discovering unasked dimensions...</p>
        </div>
      ) : filteredSpots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3 p-8">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No BlindSpots in Current View</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeFilter === "DISMISSED"
              ? "You have not dismissed any suggestions."
              : activeFilter === "STARRED"
              ? "Star important questions to pin them to this view."
              : "All discovered questions match your research requirements or have been filtered out."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSpots.map((spot) => {
            const isUncovered = spot.evidence_coverage === "uncovered"
            const isPartial = spot.evidence_coverage === "partially_answered"
            const isAnswered = spot.evidence_coverage === "answered_in_sources"
            const hasRefs = spot.source_references && spot.source_references.length > 0
            const isExpanded = !!expandedRefs[spot.id]

            return (
              <div
                key={spot.id}
                className={`border rounded-2xl bg-white shadow-card transition-all p-5 space-y-4 ${
                  spot.is_dismissed
                    ? "opacity-60 border-slate-200 bg-slate-50/50"
                    : spot.is_added_to_plan
                    ? "border-emerald-300 ring-1 ring-emerald-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Card Top Row: Badges & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Explicit AI Label */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
                      AI Strategic Suggestion • Non-Mandated
                    </span>

                    {/* Risk Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      spot.risk_level === "high"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {spot.risk_level.toUpperCase()} RISK ({spot.priority})
                    </span>

                    {/* Coverage Status Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isAnswered
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : isPartial
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}>
                      {isAnswered
                        ? "Answered in Sources"
                        : isPartial
                        ? "Partially Addressed"
                        : "Uncovered in Corpus"}
                    </span>

                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {spot.category.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>

                  {/* Actions: Star, Dismiss, Investigate Check */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleStarMutation.mutate(spot.id)}
                      title={spot.is_starred ? "Unstar question" : "Mark as important question"}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        spot.is_starred
                          ? "bg-amber-50 border-amber-200 text-amber-600"
                          : "border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-slate-50"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${spot.is_starred ? "fill-amber-500" : ""}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => dismissMutation.mutate(spot.id)}
                      title={spot.is_dismissed ? "Restore suggestion" : "Dismiss suggestion"}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {spot.is_dismissed ? <RotateCcw className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => investigateMutation.mutate(spot.id)}
                      title={spot.is_resolved ? "Mark unresolved" : "Mark as verified/investigated"}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        spot.is_resolved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {spot.is_resolved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Circle className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{spot.is_resolved ? "Investigated" : "Pending"}</span>
                    </button>
                  </div>
                </div>

                {/* Question & Related Requirement */}
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {spot.question}
                  </h3>
                  {spot.related_requirement_text && (
                    <span className="text-xs text-slate-500 font-medium block">
                      Expands Requirement: <em>"{spot.related_requirement_text}"</em>
                    </span>
                  )}
                </div>

                {/* Detailed Rationale & Explanation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      Why This Question Matters (Forensic Rationale)
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {spot.rationale}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      Strategic Decision Risk
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {spot.explanation || spot.rationale}
                    </p>
                  </div>
                </div>

                {/* Recommended Verification Action */}
                {spot.recommended_action && (
                  <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200 text-xs text-sky-900 flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider text-sky-950 font-bold">
                        Recommended Verification Action
                      </strong>
                      <span className="text-slate-700">{spot.recommended_action}</span>
                    </div>
                  </div>
                )}

                {/* Evidence References (if partially answered or answered in sources) */}
                {hasRefs && (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpandRef(spot.id)}
                      className="text-xs font-semibold text-secondary hover:text-navy-900 flex items-center gap-1.5 transition-colors"
                    >
                      <Quote className="w-3.5 h-3.5" />
                      <span>{isExpanded ? "Hide" : "View"} Corroborating Source References ({spot.source_references.length})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200 animate-fadeIn">
                        {spot.source_references.map((ref: BlindSpotSourceReference, rIdx: number) => (
                          <div key={rIdx} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between text-slate-600 font-semibold text-[11px]">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-secondary" />
                                {ref.source_title}
                              </span>
                              {ref.page_number && <span className="font-mono text-slate-400">p.{ref.page_number}</span>}
                            </div>
                            {ref.claim_text && <p className="font-medium text-slate-800">{ref.claim_text}</p>}
                            {ref.exact_quote && (
                              <p className="italic text-slate-500 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                                "{ref.exact_quote}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Bar: Promotion to Active Research Requirement */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID: {spot.id.slice(0, 8)}
                  </div>

                  <div className="flex items-center gap-2">
                    {spot.is_added_to_plan ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Added to Plan as Active Requirement
                        </span>
                        <Link to={`/research/${id}/plan`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs border-slate-200">
                            View in Plan
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={addToPlanMutation.isPending || spot.is_dismissed}
                        onClick={() => addToPlanMutation.mutate(spot.id)}
                        className="gap-1.5 h-8 text-xs font-semibold shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Question to Research Plan</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
