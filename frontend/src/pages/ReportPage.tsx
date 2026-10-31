import React from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Download,
  Printer,
  FileCheck2,
  AlertTriangle,
  Quote,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react"
import { researchService } from "@/services/researchService"
import { sourceService } from "@/services/sourceService"
import { findingService } from "@/services/findingService"
import { reportService } from "@/services/reportService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, getReadinessTier } from "@/utils/formatters"

export const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => researchService.getSession(id!),
    enabled: !!id,
  })

  const { data: sources } = useQuery({
    queryKey: ["sources", id],
    queryFn: () => sourceService.listSources(id!),
    enabled: !!id,
  })

  const { data: requirements } = useQuery({
    queryKey: ["requirements", id],
    queryFn: () => findingService.getRequirements(id!),
    enabled: !!id,
  })

  const { data: conflicts } = useQuery({
    queryKey: ["conflicts", id],
    queryFn: () => findingService.getConflicts(id!),
    enabled: !!id,
  })

  const { data: blindspots } = useQuery({
    queryKey: ["blindspots", id],
    queryFn: () => reportService.getBlindspots(id!),
    enabled: !!id,
  })

  const handleDownloadMarkdown = async () => {
    if (!id) return
    try {
      const blob = await reportService.downloadMarkdownReport(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ProofPath_Report_${id.slice(0, 8)}.md`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Failed to download markdown report", err)
    }
  }

  if (isLoading || !session) {
    return <div className="p-12 text-center text-xs text-slate-500">Generating report...</div>
  }

  const tier = getReadinessTier(session.readiness_score)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 print:p-0">
      {/* Action Header (Hidden in Print) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Executive Briefing Dossier
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Printable, audit-grade verification report for stakeholders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownloadMarkdown} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Download Markdown</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-card space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Dossier Header */}
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>PROOFPATH AI — FORENSIC INFORMATION AUDIT</span>
            <span>GENERATED: {formatDate(new Date().toISOString())}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {session.title}
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl">
            <span className="font-semibold text-slate-900">Research Goal: </span>
            {session.research_goal}
          </p>
          {session.target_decision && (
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Target Decision: </span>
              {session.target_decision}
            </p>
          )}
        </div>

        {/* Section 1: Executive Verdict & DRI */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            1. Executive Verdict & Decision Readiness Index (DRI)
          </h3>

          <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-slate-900">
                  {session.readiness_score.toFixed(1)}%
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${tier.bgColor} ${tier.color} ${tier.borderColor}`}>
                  {tier.tier}
                </span>
              </div>
              <p className="text-xs text-slate-700 max-w-xl">
                {session.executive_verdict}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Coverage</span>
                <span className="font-bold text-slate-900">{session.coverage_score.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Consistency</span>
                <span className="font-bold text-slate-900">{session.consistency_score.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Freshness</span>
                <span className="font-bold text-slate-900">{session.freshness_score.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Verification</span>
                <span className="font-bold text-slate-900">{session.verification_score.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Ingested Sources */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            2. Evidentiary Sources ({sources?.length || 0})
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="p-2.5">Source Title</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Publication Date</th>
                  <th className="p-2.5">Extracted Chunks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sources?.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2.5 font-medium text-slate-900">{s.title}</td>
                    <td className="p-2.5 uppercase font-mono text-[10px] text-slate-500">{s.source_type}</td>
                    <td className="p-2.5 text-slate-500">{s.publication_date ? formatDate(s.publication_date) : "Undated"}</td>
                    <td className="p-2.5 text-slate-500">{s.chunk_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Evaluation Criteria Matrix */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            3. Evaluation Criteria & Coverage ({requirements?.length || 0})
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="p-2.5">Criterion</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Evidence Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements?.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2.5 font-medium text-slate-900">{r.requirement_text}</td>
                    <td className="p-2.5 text-slate-500">{r.category}</td>
                    <td className="p-2.5">
                      <Badge variant={r.status === "covered" ? "success" : r.status === "conflict" ? "danger" : "warning"}>
                        {r.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-slate-500">{r.evidence_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Cross-Source Contradictions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            4. Cross-Source Contradictions ({conflicts?.length || 0})
          </h3>
          {conflicts?.map((c, idx) => (
            <div key={c.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Conflict #{idx + 1}: {c.conflicting_aspect}
                </span>
                <Badge variant={c.severity === "high" ? "danger" : "warning"}>
                  {c.severity.toUpperCase()} SEVERITY
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{c.claim_a.source_title}:</span>
                  <span className="text-slate-700 italic">"{c.claim_a.exact_quote}"</span>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{c.claim_b.source_title}:</span>
                  <span className="text-slate-700 italic">"{c.claim_b.exact_quote}"</span>
                </div>
              </div>
              <p className="text-slate-600 pt-1">
                <span className="font-semibold text-slate-800">Forensic Verdict: </span>
                {c.synthesis_verdict}
              </p>
            </div>
          ))}
        </div>

        {/* Section 5: BlindSpot Signoff */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            5. BlindSpot Discovery Sign-Off ({blindspots?.length || 0})
          </h3>
          <div className="space-y-2 text-xs">
            {blindspots?.map((b, idx) => (
              <div key={b.id} className="p-3 rounded-lg border border-slate-100 flex items-start gap-3">
                <span className="font-mono text-slate-400 font-bold">{idx + 1}.</span>
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-900">{b.question}</span>
                  <p className="text-slate-500 text-[11px]">{b.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signoff Footer */}
        <div className="border-t border-slate-200 pt-6 flex items-center justify-between text-xs text-slate-400">
          <span>ProofPath AI Automated Forensic Verification</span>
          <span>Approved By: ___________________________</span>
        </div>
      </div>
    </div>
  )
}
