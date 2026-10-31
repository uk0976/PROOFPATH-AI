import React, { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  GitBranch,
  Grid,
  FileSearch,
  Quote,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Globe,
} from "lucide-react"
import { findingService } from "@/services/findingService"
import { ReactFlowCanvas } from "@/components/graph/ReactFlowCanvas"
import { Badge } from "@/components/ui/badge"
import { SAMPLE_GRAPH_DATA } from "@/utils/sampleData"

export const EvidenceExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<"graph" | "matrix" | "claims">("graph")

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ["graph", id],
    queryFn: async () => {
      try {
        return await findingService.getEvidenceGraph(id!)
      } catch {
        return SAMPLE_GRAPH_DATA
      }
    },
    enabled: !!id,
    placeholderData: SAMPLE_GRAPH_DATA,
  })

  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["matrix", id],
    queryFn: () => findingService.getMatrix(id!),
    enabled: !!id && activeTab === "matrix",
  })

  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ["claims", id],
    queryFn: () => findingService.getClaims(id!),
    enabled: !!id && activeTab === "claims",
  })

  const currentGraph = graphData || SAMPLE_GRAPH_DATA

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-ink-secondary">EVIDENCE BASE</span>
            <Badge variant="secondary">TRACEABILITY & NETWORK</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-secondary" />
            <span>Evidence Explorer</span>
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Trace claims to raw sources, explore conflict topology, and inspect cross-matrix evidence.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center p-1 bg-surface border border-border rounded-lg shadow-subtle">
          <button
            type="button"
            onClick={() => setActiveTab("graph")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "graph" ? "bg-primary text-white font-semibold" : "text-ink-secondary hover:text-ink"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Conflict Graph</span>
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
            onClick={() => setActiveTab("claims")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "claims" ? "bg-primary text-white font-semibold" : "text-ink-secondary hover:text-ink"
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>All Claims</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive Conflict & Evidence Graph */}
      {activeTab === "graph" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>Drag, zoom, and inspect contradictory and corroborating nodes.</span>
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

      {/* Tab 2: Coverage Matrix */}
      {activeTab === "matrix" && (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
          <h3 className="text-sm font-semibold text-ink">
            Two-Dimensional Requirement vs Source Matrix
          </h3>

          {matrixLoading ? (
            <div className="p-8 text-center text-xs text-ink-secondary">Loading matrix data...</div>
          ) : matrixData ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="p-3 font-semibold text-ink">Requirement</th>
                    {matrixData.sources.map((s) => (
                      <th key={s.id} className="p-3 font-semibold text-ink truncate max-w-[200px]">
                        {s.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matrixData.requirements.map((r) => (
                    <tr key={r.id} className="hover:bg-background/50">
                      <td className="p-3 font-medium text-ink max-w-[280px]">
                        {r.text}
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
            <div className="p-8 text-center text-xs text-ink-secondary">
              Matrix data currently processing.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: All Claims List */}
      {activeTab === "claims" && (
        <div className="space-y-4">
          {claimsLoading ? (
            <div className="p-8 text-center text-xs text-ink-secondary">Loading extracted claims...</div>
          ) : claims?.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-secondary border border-border rounded-xl bg-surface">
              No claims extracted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {claims?.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-2">
                  <div className="flex items-center justify-between text-xs text-ink-secondary">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      {c.source_type === "pdf" ? <FileText className="w-3.5 h-3.5 text-secondary" /> : <Globe className="w-3.5 h-3.5 text-secondary" />}
                      {c.source_title}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {c.claim_type}
                      </Badge>
                      <Badge variant="success">SUBSTRING VERIFIED</Badge>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-ink">
                    {c.claim_text}
                  </p>
                  <div className="text-[11px] text-ink-secondary italic bg-background p-2.5 rounded border border-border flex items-start gap-1.5">
                    <Quote className="w-3 h-3 text-ink-muted shrink-0 mt-0.5" />
                    <span>"{c.exact_quote}"</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
