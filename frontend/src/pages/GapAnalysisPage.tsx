import React, { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Quote,
  FileText,
  Globe,
  FileCheck,
  ExternalLink,
  X,
  Info,
  ShieldCheck,
  Layers,
} from "lucide-react"
import { findingService } from "@/services/findingService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GapFindingItem, EvidenceReferenceItem } from "@/types"

// The 6 canonical finding categories
const FINDING_TYPES = [
  { id: "ALL", label: "All Findings", countKey: "all", color: "bg-slate-100 text-slate-800" },
  { id: "COVERED", label: "Covered", countKey: "COVERED", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { id: "MISSING", label: "Missing", countKey: "MISSING", color: "bg-rose-50 text-rose-800 border-rose-200" },
  { id: "INCOMPLETE", label: "Incomplete", countKey: "INCOMPLETE", color: "bg-amber-50 text-amber-800 border-amber-200" },
  { id: "POTENTIAL CONFLICT", label: "Potential Conflict", countKey: "POTENTIAL CONFLICT", color: "bg-purple-50 text-purple-800 border-purple-200" },
  { id: "POTENTIALLY OUTDATED", label: "Potentially Outdated", countKey: "POTENTIALLY OUTDATED", color: "bg-orange-50 text-orange-800 border-orange-200" },
  { id: "UNVERIFIED", label: "Unverified", countKey: "UNVERIFIED", color: "bg-slate-100 text-slate-800 border-slate-200" },
]

export const GapAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [selectedFilter, setSelectedFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({})
  const [inspectFinding, setInspectFinding] = useState<GapFindingItem | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Query findings
  const { data: findings, isLoading, refetch } = useQuery({
    queryKey: ["gap-findings", id],
    queryFn: () => findingService.getGapFindings(id!),
    enabled: !!id,
  })

  // Mutation to re-evaluate gaps
  const evaluateGapsMutation = useMutation({
    mutationFn: () => findingService.evaluateGaps(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gap-findings", id] })
      queryClient.invalidateQueries({ queryKey: ["findings", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setStatusMessage(`Gap detection completed: ${data.total_findings} criteria evaluated across 6 finding categories.`)
      setTimeout(() => setStatusMessage(null), 4500)
    },
  })

  // Compute counts per category
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: findings?.length || 0,
      COVERED: 0,
      MISSING: 0,
      INCOMPLETE: 0,
      "POTENTIAL CONFLICT": 0,
      "POTENTIALLY OUTDATED": 0,
      UNVERIFIED: 0,
    }
    findings?.forEach((f) => {
      if (map[f.finding_type] !== undefined) {
        map[f.finding_type] += 1
      }
    })
    return map
  }, [findings])

  // Extract unique requirement categories
  const categories = useMemo(() => {
    if (!findings) return ["All"]
    const set = new Set(findings.map((f) => f.category || "General"))
    return ["All", ...Array.from(set)]
  }, [findings])

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    if (!findings) return []
    return findings.filter((f) => {
      // Type filter
      if (selectedFilter !== "ALL" && f.finding_type !== selectedFilter) {
        return false
      }

      // Category filter
      if (selectedCategory !== "All" && (f.category || "General").toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const reqMatch = f.requirement_text.toLowerCase().includes(query)
        const explMatch = f.explanation.toLowerCase().includes(query)
        const actionMatch = f.recommended_action.toLowerCase().includes(query)
        const catMatch = (f.category || "").toLowerCase().includes(query)
        return reqMatch || explMatch || actionMatch || catMatch
      }

      return true
    })
  }, [findings, selectedFilter, selectedCategory, searchQuery])

  const toggleExpand = (findingId: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }))
  }

  const getFindingBadge = (type: string) => {
    switch (type) {
      case "COVERED":
        return <Badge variant="success" className="gap-1 font-semibold uppercase text-[10px]"><CheckCircle2 className="w-3 h-3" /> Covered</Badge>
      case "MISSING":
        return <Badge variant="danger" className="gap-1 font-semibold uppercase text-[10px]"><EyeOff className="w-3 h-3" /> Missing</Badge>
      case "INCOMPLETE":
        return <Badge variant="warning" className="gap-1 font-semibold uppercase text-[10px]"><AlertTriangle className="w-3 h-3" /> Incomplete</Badge>
      case "POTENTIAL CONFLICT":
        return <Badge variant="danger" className="gap-1 font-semibold uppercase text-[10px] bg-purple-100 text-purple-900 border-purple-200"><ShieldAlert className="w-3 h-3 text-purple-700" /> Conflict</Badge>
      case "POTENTIALLY OUTDATED":
        return <Badge variant="warning" className="gap-1 font-semibold uppercase text-[10px] bg-orange-100 text-orange-900 border-orange-200"><Clock className="w-3 h-3 text-orange-700" /> Outdated</Badge>
      case "UNVERIFIED":
        return <Badge variant="outline" className="gap-1 font-semibold uppercase text-[10px]"><HelpCircle className="w-3 h-3 text-slate-500" /> Unverified</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return <Badge variant="danger" className="text-[10px] font-mono uppercase">Critical</Badge>
      case "high":
        return <Badge variant="warning" className="text-[10px] font-mono uppercase">High</Badge>
      case "medium":
        return <Badge variant="secondary" className="text-[10px] font-mono uppercase">Medium</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] font-mono uppercase">Low</Badge>
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500 uppercase">CORE INTELLIGENCE MODULE</span>
            <Badge variant="secondary" className="text-[10px]">6-CATEGORY EVALUATION</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <EyeOff className="w-6 h-6 text-slate-800" />
            <span>Information Gap & Sufficiency Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Determines whether ingested evidence is sufficient, missing, incomplete, conflicting, outdated, or unverified.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {id && (
            <Link to={`/research/${id}/evidence`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200">
                <Layers className="w-3.5 h-3.5 text-navy-800" />
                <span>Evidence Explorer</span>
              </Button>
            </Link>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={() => evaluateGapsMutation.mutate()}
            disabled={evaluateGapsMutation.isPending}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluateGapsMutation.isPending ? "animate-spin" : ""}`} />
            <span>Re-run Gap Detection</span>
          </Button>
        </div>
      </div>

      {/* Epistemic Boundary Alert */}
      <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4 text-xs text-navy-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-navy-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-semibold text-navy-950">
            Epistemic Boundary Principle: Absence of Evidence Is Not Proof of Falsehood
          </p>
          <p className="text-navy-700 text-[11px]">
            A finding marked <strong className="text-rose-700 font-bold">MISSING</strong> signifies that the reviewed documents are silent on this criterion. It must never be interpreted as confirmation that a policy, condition, or limitation does not exist.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 6 Finding Type Cards / Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {FINDING_TYPES.filter((t) => t.id !== "ALL").map((type) => {
          const isSelected = selectedFilter === type.id
          const count = counts[type.countKey] || 0

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedFilter(isSelected ? "ALL" : type.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                isSelected
                  ? "ring-2 ring-navy-900 border-navy-900 bg-white shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-semibold text-slate-600 truncate">{type.label}</span>
                <span className="text-xs font-mono font-bold text-slate-900">{count}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full ${
                    type.id === "COVERED" ? "bg-emerald-500" :
                    type.id === "MISSING" ? "bg-rose-500" :
                    type.id === "INCOMPLETE" ? "bg-amber-500" :
                    type.id === "POTENTIAL CONFLICT" ? "bg-purple-500" :
                    type.id === "POTENTIALLY OUTDATED" ? "bg-orange-500" : "bg-slate-500"
                  }`}
                  style={{ width: `${counts.all > 0 ? (count / counts.all) * 100 : 0}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search requirements, explanations, or recommended actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Finding Type Dropdown */}
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Finding Types ({counts.all})</option>
            <option value="COVERED">Covered ({counts.COVERED || 0})</option>
            <option value="MISSING">Missing Evidence ({counts.MISSING || 0})</option>
            <option value="INCOMPLETE">Incomplete Coverage ({counts.INCOMPLETE || 0})</option>
            <option value="POTENTIAL CONFLICT">Potential Conflict ({counts["POTENTIAL CONFLICT"] || 0})</option>
            <option value="POTENTIALLY OUTDATED">Potentially Outdated ({counts["POTENTIALLY OUTDATED"] || 0})</option>
            <option value="UNVERIFIED">Unverified Claims ({counts.UNVERIFIED || 0})</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing {filteredFindings.length} of {findings?.length || 0} findings
          {selectedFilter !== "ALL" && ` (Filtered by ${selectedFilter})`}
        </span>
        {(selectedFilter !== "ALL" || selectedCategory !== "All" || searchQuery) && (
          <button
            onClick={() => {
              setSelectedFilter("ALL")
              setSelectedCategory("All")
              setSearchQuery("")
            }}
            className="text-xs text-navy-800 hover:underline"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Findings List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
          <RefreshCw className="w-5 h-5 mx-auto animate-spin text-slate-400 mb-2" />
          Evaluating evidence sufficiency across all criteria...
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white space-y-2">
          <EyeOff className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">No Findings Match Your Filters</p>
          <p className="text-slate-400 max-w-sm mx-auto">
            Try adjusting your finding category selection or resetting search terms.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const isExpanded = !!expandedFindings[finding.id]
            const isMissing = finding.finding_type === "MISSING"
            const isConflict = finding.finding_type === "POTENTIAL CONFLICT"
            const isOutdated = finding.finding_type === "POTENTIALLY OUTDATED"
            const isIncomplete = finding.finding_type === "INCOMPLETE"
            const isUnverified = finding.finding_type === "UNVERIFIED"

            return (
              <div
                key={finding.id}
                className={`bg-white border rounded-xl p-5 shadow-card transition-all space-y-4 ${
                  isMissing ? "border-rose-200/90 hover:border-rose-300" :
                  isConflict ? "border-purple-200/90 hover:border-purple-300" :
                  isOutdated ? "border-orange-200/90 hover:border-orange-300" :
                  isIncomplete ? "border-amber-200/90 hover:border-amber-300" :
                  "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Header: Title, Category, Finding Badge, Priority */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getFindingBadge(finding.finding_type)}
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {finding.category || "General"}
                      </Badge>
                      {getPriorityBadge(finding.priority)}
                      <span className="text-[10px] font-mono text-slate-400">
                        {Math.round((finding.confidence || 0.90) * 100)}% Confidence
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {finding.requirement_text}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setInspectFinding(finding)}
                      className="h-7 px-2.5 text-[11px] gap-1"
                    >
                      <span>Full Diagnostic</span>
                    </Button>
                  </div>
                </div>

                {/* Explanation Prose */}
                <div className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                  isMissing ? "bg-rose-50/50 border-rose-100 text-rose-950" :
                  isConflict ? "bg-purple-50/50 border-purple-100 text-purple-950" :
                  isOutdated ? "bg-orange-50/50 border-orange-100 text-orange-950" :
                  isIncomplete ? "bg-amber-50/50 border-amber-100 text-amber-950" :
                  "bg-slate-50 border-slate-100 text-slate-800"
                }`}>
                  <p>{finding.explanation}</p>
                </div>

                {/* Recommended Verification Action */}
                <div className="flex items-start gap-2 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
                  <ArrowRight className="w-3.5 h-3.5 text-navy-800 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900">Recommended Action: </span>
                    <span className="text-slate-700">{finding.recommended_action}</span>
                  </div>
                </div>

                {/* Expandable Evidence Passages */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpand(finding.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1 font-medium"
                    >
                      <span>
                        {isExpanded ? "Hide Evidence & Grounding" : `View Cited Evidence (${finding.evidence_references?.length || 0} Passages)`}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-[10px] text-slate-400 font-mono">
                      Limitation: {finding.limitations ? finding.limitations.slice(0, 45) + "..." : "Corpus bounded"}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2.5 animate-in fade-in duration-150">
                      {finding.evidence_references && finding.evidence_references.length > 0 ? (
                        finding.evidence_references.map((ref, rIdx) => (
                          <div
                            key={rIdx}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200/60 pb-1">
                              <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                                {ref.source_type === "pdf" ? <FileText className="w-3 h-3 text-red-600" /> : <Globe className="w-3 h-3 text-blue-600" />}
                                <span className="truncate">{ref.source_title}</span>
                              </span>
                              <div className="flex items-center gap-2 font-mono text-[10px]">
                                {ref.page_number && (
                                  <span className="px-1.5 py-0.2 rounded bg-white border border-slate-200">
                                    Page {ref.page_number}
                                  </span>
                                )}
                                {ref.paragraph_reference && (
                                  <span className="px-1.5 py-0.2 rounded bg-white border border-slate-200">
                                    {ref.paragraph_reference}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="font-mono text-[11px] text-slate-700 italic select-text pl-1 leading-relaxed">
                              &quot;{ref.exact_quote}&quot;
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          No cited evidence passages recorded in reviewed corpus.
                        </div>
                      )}

                      {/* Explicit Limitations Box */}
                      <div className="p-2.5 rounded bg-slate-100/70 border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                        <span className="font-semibold text-slate-800 uppercase text-[10px]">Methodological Limitation:</span>
                        <p>{finding.limitations}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FULL DIAGNOSTIC SLIDE-OVER DRAWER */}
      {inspectFinding && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div className="space-y-1 max-w-[85%]">
                <div className="flex items-center gap-2">
                  {getFindingBadge(inspectFinding.finding_type)}
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {inspectFinding.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 leading-snug">
                  {inspectFinding.requirement_text}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectFinding(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Finding Type & Priority */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Classification</span>
                  <p className="font-bold text-slate-900 mt-0.5">{inspectFinding.finding_type}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Audit Priority</span>
                  <p className="font-bold text-slate-900 mt-0.5 uppercase">{inspectFinding.priority}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Confidence</span>
                  <p className="font-bold text-slate-900 mt-0.5">{Math.round((inspectFinding.confidence || 0.90) * 100)}%</p>
                </div>
              </div>

              {/* Forensic Explanation */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Forensic Explanation
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 leading-relaxed">
                  {inspectFinding.explanation}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Recommended Verification Action
                </label>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{inspectFinding.recommended_action}</span>
                </div>
              </div>

              {/* Methodological Limitations */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Methodological Limitations
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
                  {inspectFinding.limitations}
                </div>
              </div>

              {/* Attached Evidence References */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Attached Evidence References ({inspectFinding.evidence_references?.length || 0})
                </label>
                {inspectFinding.evidence_references && inspectFinding.evidence_references.length > 0 ? (
                  <div className="space-y-2">
                    {inspectFinding.evidence_references.map((ref: EvidenceReferenceItem, rIdx: number) => (
                      <div
                        key={rIdx}
                        className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-1">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {ref.source_type === "pdf" ? <FileText className="w-3.5 h-3.5 text-red-600" /> : <Globe className="w-3.5 h-3.5 text-blue-600" />}
                            {ref.source_title}
                          </span>
                          <span className="font-mono text-[10px]">
                            {ref.page_number ? `Page ${ref.page_number}` : ref.paragraph_reference || "Direct Passage"}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-700 italic select-text pl-1 leading-relaxed">
                          &quot;{ref.exact_quote}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No evidence was cited across any ingested document.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <Button size="sm" variant="outline" onClick={() => setInspectFinding(null)}>
                Close Diagnostic
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
