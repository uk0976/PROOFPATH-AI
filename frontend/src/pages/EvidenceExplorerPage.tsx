import React, { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  FileSearch,
  GitBranch,
  Grid,
  Quote,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Globe,
  FileCheck,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Eye,
  X,
  Layers,
  Calendar,
  Clock,
  ArrowRight,
  Hash,
  CheckCircle2,
} from "lucide-react"
import { findingService } from "@/services/findingService"
import { sourceService } from "@/services/sourceService"
import { ReactFlowCanvas } from "@/components/graph/ReactFlowCanvas"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AtomicClaimItem, SourceItem } from "@/types"
import { SAMPLE_GRAPH_DATA, DEMO_SESSION_ID, SAMPLE_CLAIMS } from "@/utils/sampleData"
import { formatDate } from "@/utils/formatters"

const CATEGORIES = [
  "All",
  "Eligibility",
  "Academic",
  "Income",
  "Documentation",
  "Deadlines",
  "Financial",
  "Technical",
  "Governance",
  "General",
]

export const EvidenceExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"claims" | "matrix" | "graph">("claims")

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedSourceType, setSelectedSourceType] = useState("all")
  const [onlyVerified, setOnlyVerified] = useState(false)

  // Drawer / Inspection state
  const [previewClaim, setPreviewClaim] = useState<AtomicClaimItem | null>(null)
  const [previewSource, setPreviewSource] = useState<SourceItem | null>(null)
  const [isLoadingSource, setIsLoadingSource] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Queries
  const { data: claims, isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ["claims", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          const res = await findingService.getClaims(id!)
          return res.length > 0 ? res : SAMPLE_CLAIMS
        } catch {
          return SAMPLE_CLAIMS
        }
      }
      return await findingService.getClaims(id!)
    },
    enabled: !!id,
  })

  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["matrix", id],
    queryFn: () => findingService.getMatrix(id!),
    enabled: !!id && activeTab === "matrix",
  })

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ["graph", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          return await findingService.getEvidenceGraph(id!)
        } catch {
          return SAMPLE_GRAPH_DATA
        }
      }
      return await findingService.getEvidenceGraph(id!)
    },
    enabled: !!id && activeTab === "graph",
  })

  // Mutations for AI extraction & evidence mapping
  const extractClaimsMutation = useMutation({
    mutationFn: () => findingService.extractClaims(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["claims", id] })
      queryClient.invalidateQueries({ queryKey: ["matrix", id] })
      queryClient.invalidateQueries({ queryKey: ["graph", id] })
      setStatusMessage(`Successfully extracted ${data.length} atomic claims with verbatim quote grounding.`)
      setTimeout(() => setStatusMessage(null), 4500)
    },
  })

  const retrieveEvidenceMutation = useMutation({
    mutationFn: () => findingService.retrieveEvidence(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["claims", id] })
      queryClient.invalidateQueries({ queryKey: ["matrix", id] })
      queryClient.invalidateQueries({ queryKey: ["graph", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setStatusMessage(
        `Evidence mapping complete: ${data.evidence_links_created} requirement links created (${data.coverage_percentage}% coverage).`
      )
      setTimeout(() => setStatusMessage(null), 5000)
    },
  })

  // Filtered claims computation
  const filteredClaims = useMemo(() => {
    if (!claims) return []
    return claims.filter((claim) => {
      // Category filter
      if (selectedCategory !== "All") {
        const cat = (claim.category || "General").toLowerCase()
        if (cat !== selectedCategory.toLowerCase()) return false
      }

      // Source type filter
      if (selectedSourceType !== "all") {
        if (claim.source_type !== selectedSourceType) return false
      }

      // Verified filter
      if (onlyVerified && !claim.is_verified) {
        return false
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const textMatch = claim.claim_text.toLowerCase().includes(query)
        const quoteMatch = (claim.exact_quote || claim.original_evidence_text || "")
          .toLowerCase()
          .includes(query)
        const sourceMatch = (claim.source_title || "").toLowerCase().includes(query)
        const catMatch = (claim.category || "").toLowerCase().includes(query)
        return textMatch || quoteMatch || sourceMatch || catMatch
      }

      return true
    })
  }, [claims, selectedCategory, selectedSourceType, onlyVerified, searchQuery])

  // Stats
  const totalClaims = claims?.length || 0
  const verifiedCount = claims?.filter((c) => c.is_verified).length || 0
  const uniqueSources = new Set(claims?.map((c) => c.source_id)).size

  // Inspect source passage
  const handleInspectSource = async (claim: AtomicClaimItem) => {
    setPreviewClaim(claim)
    if (claim.source_id) {
      try {
        setIsLoadingSource(true)
        const src = await sourceService.getSourceDetail(claim.source_id)
        setPreviewSource(src)
      } catch (err) {
        console.error("Failed to load source details:", err)
      } finally {
        setIsLoadingSource(false)
      }
    }
  }

  const currentGraph = graphData || (id === "demo" ? SAMPLE_GRAPH_DATA : { nodes: [], edges: [] })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-ink-secondary">FORENSIC TRACEABILITY ENGINE</span>
            <Badge variant="secondary">EVIDENCE & ATOMIC CLAIMS</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-secondary" />
            <span>Evidence Explorer</span>
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Atomic statements extracted from ingested sources, grounded in verbatim quotes with page-level provenance.
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => extractClaimsMutation.mutate()}
            disabled={extractClaimsMutation.isPending}
            className="text-xs gap-1.5 border-border"
          >
            <Sparkles className={`w-3.5 h-3.5 text-secondary ${extractClaimsMutation.isPending ? "animate-spin" : ""}`} />
            <span>{extractClaimsMutation.isPending ? "Extracting..." : "Re-extract Claims"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => retrieveEvidenceMutation.mutate()}
            disabled={retrieveEvidenceMutation.isPending}
            className="text-xs gap-1.5 border-border"
          >
            <Layers className={`w-3.5 h-3.5 text-secondary ${retrieveEvidenceMutation.isPending ? "animate-spin" : ""}`} />
            <span>{retrieveEvidenceMutation.isPending ? "Indexing..." : "Retrieve & Map"}</span>
          </Button>

          <div className="flex items-center p-1 bg-surface border border-border rounded-lg shadow-subtle ml-2">
            <button
              type="button"
              onClick={() => setActiveTab("claims")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "claims" ? "bg-primary text-white font-semibold" : "text-ink-secondary hover:text-ink"
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Claims ({totalClaims})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "matrix" ? "bg-primary text-white font-semibold" : "text-ink-secondary hover:text-ink"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Coverage Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("graph")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "graph" ? "bg-primary text-white font-semibold" : "text-ink-secondary hover:text-ink"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Knowledge Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 text-xs bg-status-success-bg border border-status-success-border text-status-success rounded-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
          <span className="text-[11px] font-medium text-ink-secondary">Extracted Claims</span>
          <p className="text-2xl font-bold text-ink">{totalClaims}</p>
          <span className="text-[10px] text-ink-muted">Atomic verifiable statements</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
          <span className="text-[11px] font-medium text-ink-secondary">Verbatim Grounded</span>
          <p className="text-2xl font-bold text-status-success">
            {totalClaims > 0 ? `${Math.round((verifiedCount / totalClaims) * 100)}%` : "100%"}
          </p>
          <span className="text-[10px] text-ink-muted">{verifiedCount} exact quote verified</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
          <span className="text-[11px] font-medium text-ink-secondary">Cited Sources</span>
          <p className="text-2xl font-bold text-ink">{uniqueSources}</p>
          <span className="text-[10px] text-ink-muted">PDFs, Webpages & Memos</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
          <span className="text-[11px] font-medium text-ink-secondary">Semantic Model</span>
          <p className="text-sm font-semibold text-ink font-mono mt-1">all-MiniLM-L6-v2</p>
          <span className="text-[10px] text-ink-muted">FAISS FlatIP 384-dim Index</span>
        </div>
      </div>

      {/* TAB 1: ALL CLAIMS VIEW */}
      {activeTab === "claims" && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search claims, quotes, or source titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Source Type Filter */}
              <select
                value={selectedSourceType}
                onChange={(e) => setSelectedSourceType(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-3 py-2 text-ink focus:outline-none"
              >
                <option value="all">All Source Types</option>
                <option value="pdf">PDF Documents</option>
                <option value="url">Web URLs</option>
                <option value="text">Memorandums</option>
              </select>

              {/* Only Verified Toggle */}
              <button
                type="button"
                onClick={() => setOnlyVerified(!onlyVerified)}
                className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-colors ${
                  onlyVerified
                    ? "bg-status-success-bg border-status-success-border text-status-success font-medium"
                    : "bg-background border-border text-ink-secondary hover:text-ink"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Only</span>
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar">
              <span className="text-[11px] font-medium text-ink-muted mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Category:
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-white"
                      : "bg-background text-ink-secondary hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-ink-secondary px-1">
            <span>
              Showing {filteredClaims.length} of {totalClaims} atomic claims
            </span>
            {(searchQuery || selectedCategory !== "All" || selectedSourceType !== "all" || onlyVerified) && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("All")
                  setSelectedSourceType("all")
                  setOnlyVerified(false)
                }}
                className="text-secondary hover:underline text-xs"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Claims List */}
          {claimsLoading ? (
            <div className="p-12 text-center text-xs text-ink-secondary bg-surface border border-border rounded-xl">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-ink-muted mb-2" />
              Retrieving and verifying atomic claims...
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="p-12 text-center text-xs text-ink-secondary border border-dashed border-border rounded-xl bg-surface space-y-2">
              <FileSearch className="w-8 h-8 text-ink-muted mx-auto" />
              <p className="font-semibold text-ink">No Claims Match Your Criteria</p>
              <p className="text-ink-secondary max-w-sm mx-auto">
                Try clearing your search query or adjusting the category filters above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-surface border border-border rounded-xl p-5 shadow-card hover:border-slate-300 transition-all space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono font-semibold">
                        {claim.category || "General"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                        {claim.claim_type}
                      </Badge>
                      {claim.applicable_period && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-background border border-border text-ink-secondary">
                          <Calendar className="w-3 h-3 text-ink-muted" />
                          {claim.applicable_period}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {claim.is_verified ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verbatim Verified</span>
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px] gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Heuristic</span>
                        </Badge>
                      )}
                      <span className="text-[10px] font-mono text-ink-muted">
                        {Math.round((claim.extraction_confidence || claim.confidence_score || 0.95) * 100)}% Conf
                      </span>
                    </div>
                  </div>

                  {/* Atomic Statement */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink leading-snug">
                      {claim.claim_text}
                    </p>
                  </div>

                  {/* Verbatim Grounding Quote Box */}
                  <div className="bg-background/80 border border-border rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-ink-muted uppercase tracking-wider">
                      <Quote className="w-3 h-3 text-secondary" />
                      <span>Verbatim Evidence Quote</span>
                    </div>
                    <p className="font-mono text-xs text-ink-secondary italic leading-relaxed pl-1 select-text">
                      &quot;{claim.original_evidence_text || claim.exact_quote}&quot;
                    </p>
                  </div>

                  {/* Provenance Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/70 text-xs text-ink-secondary">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 font-medium text-ink truncate max-w-xs">
                        {claim.source_type === "pdf" && <FileText className="w-3.5 h-3.5 text-secondary shrink-0" />}
                        {claim.source_type === "url" && <Globe className="w-3.5 h-3.5 text-secondary shrink-0" />}
                        {claim.source_type === "text" && <FileCheck className="w-3.5 h-3.5 text-secondary shrink-0" />}
                        <span className="truncate">{claim.source_title}</span>
                      </span>

                      {claim.page_number && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-background border border-border text-ink-secondary">
                          Page {claim.page_number}
                        </span>
                      )}

                      {claim.paragraph_reference && !claim.page_number && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-background border border-border text-ink-secondary">
                          {claim.paragraph_reference}
                        </span>
                      )}

                      {claim.linked_requirements_count !== undefined && claim.linked_requirements_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
                          <Layers className="w-3 h-3" />
                          {claim.linked_requirements_count} Linked Criteria
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleInspectSource(claim)}
                        className="h-7 px-2.5 text-[11px] gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Passage</span>
                      </Button>

                      {claim.source_type === "url" && claim.source_uri && (
                        <a
                          href={claim.source_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-ink-muted hover:text-ink hover:bg-background rounded"
                          title="Open Original Source URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COVERAGE MATRIX VIEW */}
      {activeTab === "matrix" && (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Two-Dimensional Requirement vs Source Matrix</h2>
              <p className="text-xs text-ink-secondary">
                Cross-validates evidence coverage and highlights contradictory claims between sources.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <Badge variant="success">Supported (2+ Claims)</Badge>
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="warning">Partial (1 Claim)</Badge>
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="danger">Conflict Detected</Badge>
              </span>
            </div>
          </div>

          {matrixLoading ? (
            <div className="p-12 text-center text-xs text-ink-secondary">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-ink-muted mb-2" />
              Computing evidence matrix...
            </div>
          ) : matrixData && matrixData.requirements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="p-3 font-semibold text-ink w-1/3">Research Criterion</th>
                    {matrixData.sources.map((s) => (
                      <th key={s.id} className="p-3 font-semibold text-ink truncate max-w-[200px]">
                        {s.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matrixData.requirements.map((r) => (
                    <tr key={r.id} className="hover:bg-background/40">
                      <td className="p-3 font-medium text-ink">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono uppercase text-ink-muted">
                            {r.category}
                          </span>
                          <p className="text-xs font-medium text-ink">{r.text}</p>
                        </div>
                      </td>
                      {matrixData.sources.map((s) => {
                        const cell = matrixData.cells.find(
                          (c) => c.requirement_id === r.id && c.source_id === s.id
                        )

                        return (
                          <td key={s.id} className="p-3">
                            {cell?.status === "conflict" ? (
                              <Badge variant="danger">CONFLICT</Badge>
                            ) : cell?.status === "supported" ? (
                              <Badge variant="success">{cell.claim_count} Claims</Badge>
                            ) : cell?.status === "partial" ? (
                              <Badge variant="warning">1 Claim</Badge>
                            ) : (
                              <span className="text-ink-subtle">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-ink-secondary border border-dashed rounded-xl">
              No matrix data generated yet. Click &quot;Retrieve &amp; Map&quot; to build evidence coverage.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REACT FLOW GRAPH VIEW */}
      {activeTab === "graph" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>Explore topology connecting Goals, Requirements, Claims, Evidence, and Conflicts.</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-primary" /> Goal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded border border-ink-secondary bg-surface" /> Requirement
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded border border-status-success bg-status-success-bg" /> Claim
              </span>
              <span className="flex items-center gap-1.5 text-status-danger font-semibold">
                <span className="w-3 h-0.5 bg-status-danger" /> Contradiction
              </span>
            </div>
          </div>

          <ReactFlowCanvas nodes={currentGraph.nodes} edges={currentGraph.edges} />
        </div>
      )}

      {/* SLIDE-OVER SOURCE PASSAGE INSPECTOR DRAWER */}
      {previewClaim && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-surface h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-start justify-between bg-background">
              <div className="space-y-1 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {previewClaim.category || "General"}
                  </Badge>
                  <span className="text-[11px] text-ink-muted font-mono">
                    Claim ID: {previewClaim.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-ink leading-snug">
                  {previewClaim.claim_text}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPreviewClaim(null)}
                className="p-1 text-ink-muted hover:text-ink rounded-lg hover:bg-background"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Grounding Status */}
              <div className="bg-status-success-bg border border-status-success-border rounded-lg p-3 text-xs text-status-success flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-status-success" />
                  <span className="font-semibold">Verbatim Anti-Hallucination Grounding</span>
                </div>
                <span className="font-mono text-[11px]">
                  {Math.round((previewClaim.extraction_confidence || 0.95) * 100)}% Confidence
                </span>
              </div>

              {/* Exact Quote */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                  Verbatim Quote
                </label>
                <div className="bg-background border border-border rounded-lg p-3 text-xs font-mono text-ink italic leading-relaxed">
                  &quot;{previewClaim.original_evidence_text || previewClaim.exact_quote}&quot;
                </div>
              </div>

              {/* Source Document Context */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                  Source Provenance
                </label>
                <div className="bg-background border border-border rounded-lg p-3 divide-y divide-border text-xs">
                  <div className="pb-2 flex items-center justify-between">
                    <span className="text-ink-secondary">Document Title</span>
                    <span className="font-semibold text-ink">{previewClaim.source_title}</span>
                  </div>
                  {previewClaim.page_number && (
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-ink-secondary">Page Number</span>
                      <span className="font-mono text-ink">Page {previewClaim.page_number}</span>
                    </div>
                  )}
                  {previewClaim.paragraph_reference && (
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-ink-secondary">Paragraph Reference</span>
                      <span className="font-mono text-ink">{previewClaim.paragraph_reference}</span>
                    </div>
                  )}
                  {previewClaim.applicable_period && (
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-ink-secondary">Applicable Period</span>
                      <span className="font-mono text-ink">{previewClaim.applicable_period}</span>
                    </div>
                  )}
                  {previewClaim.source_uri && (
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-ink-secondary">URI / Link</span>
                      <span className="font-mono text-ink-muted truncate max-w-xs">{previewClaim.source_uri}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Source Content Preview if Loaded */}
              {isLoadingSource ? (
                <div className="p-4 text-center text-xs text-ink-muted">
                  <RefreshCw className="w-4 h-4 mx-auto animate-spin mb-1" />
                  Loading original source document...
                </div>
              ) : previewSource ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                    Full Source Context
                  </label>
                  <div className="bg-background border border-border rounded-lg p-3 text-xs font-mono text-ink-secondary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto select-text">
                    {previewSource.cleaned_content || previewSource.raw_content || "Passage content loaded."}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border bg-background flex items-center justify-end">
              <Button size="sm" variant="outline" onClick={() => setPreviewClaim(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
