import React, { useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Globe,
  Quote,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Scale,
  Calendar,
  MapPin,
  Users,
  Hash,
  ShieldAlert,
  ArrowRight,
  Info,
  X,
} from "lucide-react"
import { ContradictionItem, ClaimSnippet } from "@/types"
import { getSeverityBadge } from "@/utils/formatters"
import { Button } from "@/components/ui/button"

interface ContradictionCardProps {
  conflict: ContradictionItem
}

export const ContradictionCard: React.FC<ContradictionCardProps> = ({ conflict }) => {
  const [showScopeTable, setShowScopeTable] = useState(false)
  const [inspectEvidence, setInspectEvidence] = useState<{
    claim: ClaimSnippet
    label: string
  } | null>(null)

  const sev = getSeverityBadge(conflict.severity)
  const scope = conflict.scope_comparison
  const isGenuine = conflict.is_genuine !== false

  return (
    <div className={`border rounded-xl bg-white shadow-card transition-all ${
      isGenuine ? "border-slate-200/90 hover:border-rose-200" : "border-sky-200/90 bg-sky-50/10 hover:border-sky-300"
    }`}>
      {/* Top Banner / Header */}
      <div className="p-5 border-b border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isGenuine ? (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${sev.bgColor} ${sev.color} ${sev.borderColor} border`}>
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Genuine Contradiction ({conflict.severity.toUpperCase()})
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-sky-600" />
                False Conflict (Scope-Differentiated)
              </span>
            )}

            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
              {conflict.conflict_type.replace(/_/g, " ").toUpperCase()}
            </span>

            {conflict.requirement_text && (
              <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                Req: {conflict.requirement_text}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowScopeTable(!showScopeTable)}
            aria-label="Toggle 10 Scope Dimensions"
            data-testid="toggle-scope-dimensions"
            className="text-xs font-semibold text-secondary hover:text-navy-900 inline-flex items-center gap-1 transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            {showScopeTable ? "Hide Scope Dimensions" : "Compare 10 Scope Dimensions"}
            {showScopeTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <h4 className="text-sm font-bold text-slate-900 leading-snug">
          {conflict.conflicting_aspect}
        </h4>
      </div>

      {/* 10-Dimension Scope Comparison Matrix (Collapsible) */}
      {showScopeTable && scope && (
        <div className="bg-slate-50/80 p-4 border-b border-slate-200/80 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-secondary" />
              10-Dimensional Forensic Scope Comparator
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              scope.scope_alignment === "aligned" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
            }`}>
              Alignment: {scope.scope_alignment}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border border-slate-200 rounded-lg bg-white overflow-hidden text-[11px]">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-3 w-1/4">Scope Dimension</th>
                  <th className="py-1.5 px-3 w-3/8 text-navy-800">Source A ({conflict.claim_a.source_title.slice(0, 22)})</th>
                  <th className="py-1.5 px-3 w-3/8 text-navy-800">Source B ({conflict.claim_b.source_title.slice(0, 22)})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="py-1 px-3 font-medium text-slate-700 flex items-center gap-1"><Users className="w-3 h-3 text-slate-400" /> Applicant Category</td>
                  <td className="py-1 px-3 font-semibold text-slate-900">{scope.applicant_category_a || "General"}</td>
                  <td className="py-1 px-3 font-semibold text-slate-900">{scope.applicant_category_b || "General"}</td>
                </tr>
                <tr>
                  <td className="py-1 px-3 font-medium text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> Geographic Scope</td>
                  <td className="py-1 px-3">{scope.geographic_scope_a || "National"}</td>
                  <td className="py-1 px-3">{scope.geographic_scope_b || "National"}</td>
                </tr>
                <tr>
                  <td className="py-1 px-3 font-medium text-slate-700 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> Academic Year / Cycle</td>
                  <td className="py-1 px-3">{scope.academic_year_a || scope.application_cycle_a || "Current"}</td>
                  <td className="py-1 px-3">{scope.academic_year_b || scope.application_cycle_b || "Current"}</td>
                </tr>
                <tr>
                  <td className="py-1 px-3 font-medium text-slate-700 flex items-center gap-1"><Hash className="w-3 h-3 text-slate-400" /> Numerical Threshold</td>
                  <td className="py-1 px-3 font-bold text-slate-900">{scope.numerical_value_a ? `${scope.numerical_value_a} ${scope.unit_a || ""}` : "Not quantitative"}</td>
                  <td className="py-1 px-3 font-bold text-slate-900">{scope.numerical_value_b ? `${scope.numerical_value_b} ${scope.unit_b || ""}` : "Not quantitative"}</td>
                </tr>
                <tr>
                  <td className="py-1 px-3 font-medium text-slate-700">Conditions & Context</td>
                  <td className="py-1 px-3 italic">{scope.conditions_a || "Standard"}</td>
                  <td className="py-1 px-3 italic">{scope.conditions_b || "Standard"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {scope.divergence_reasons && scope.divergence_reasons.length > 0 && (
            <div className="bg-sky-50 border border-sky-100 rounded p-2 text-[11px] text-sky-800 space-y-1">
              <span className="font-semibold block">Scope Divergence Rationales:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {scope.divergence_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Side-by-side Competing Claims */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Claim A */}
        <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                {conflict.claim_a.source_type === "pdf" ? <FileText className="w-3.5 h-3.5 text-secondary" /> : <Globe className="w-3.5 h-3.5 text-secondary" />}
                <span className="font-bold text-slate-800 truncate">{conflict.claim_a.source_title}</span>
              </span>
              {conflict.claim_a.page_number && (
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                  Page {conflict.claim_a.page_number}
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-900 leading-relaxed">
              {conflict.claim_a.claim_text}
            </p>

            <div className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs flex items-start gap-1.5">
              <Quote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>"{conflict.claim_a.exact_quote}"</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 text-[11px]">
            <span className="text-slate-500 font-mono">ID: {conflict.claim_a.id.slice(0, 8)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectEvidence({ claim: conflict.claim_a, label: "Claim A" })}
              className="h-7 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <ExternalLink className="w-3 h-3" />
              Inspect Original Evidence
            </Button>
          </div>
        </div>

        {/* Claim B */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
          isGenuine ? "border-rose-200 bg-rose-50/20" : "border-slate-200/90 bg-slate-50/50"
        }`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                {conflict.claim_b.source_type === "pdf" ? <FileText className="w-3.5 h-3.5 text-secondary" /> : <Globe className="w-3.5 h-3.5 text-secondary" />}
                <span className="font-bold text-slate-800 truncate">{conflict.claim_b.source_title}</span>
              </span>
              {conflict.claim_b.page_number && (
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                  Page {conflict.claim_b.page_number}
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-900 leading-relaxed">
              {conflict.claim_b.claim_text}
            </p>

            <div className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs flex items-start gap-1.5">
              <Quote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>"{conflict.claim_b.exact_quote}"</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 text-[11px]">
            <span className="text-slate-500 font-mono">ID: {conflict.claim_b.id.slice(0, 8)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectEvidence({ claim: conflict.claim_b, label: "Claim B" })}
              className="h-7 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <ExternalLink className="w-3 h-3" />
              Inspect Original Evidence
            </Button>
          </div>
        </div>
      </div>

      {/* Forensic Verdict & Actionable Recommendation */}
      <div className="p-5 pt-0 space-y-3">
        {conflict.explanation && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-secondary" />
              Forensic Synthesis & Epistemic Evaluation
            </span>
            <p className="text-slate-700 leading-relaxed">
              {conflict.explanation}
            </p>
          </div>
        )}

        {conflict.recommended_action && (
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
            <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
              Recommended Verification Action
            </span>
            <p className="text-amber-800 leading-relaxed font-medium">
              {conflict.recommended_action}
            </p>
          </div>
        )}
      </div>

      {/* Slide-over / Modal for Full Evidence Inspection */}
      {inspectEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 relative">
            <button
              onClick={() => setInspectEvidence(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary" />
              <h3 className="text-base font-bold text-slate-900">
                Original Grounding Evidence — {inspectEvidence.label}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1 border border-slate-200">
                <span className="font-semibold text-slate-500 text-[10px] uppercase">Source Document</span>
                <p className="font-bold text-slate-900">{inspectEvidence.claim.source_title}</p>
                {inspectEvidence.claim.source_uri && (
                  <p className="text-[11px] text-secondary font-mono truncate">{inspectEvidence.claim.source_uri}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Page Reference</span>
                  <span className="font-semibold text-slate-800">
                    {inspectEvidence.claim.page_number ? `Page ${inspectEvidence.claim.page_number}` : "Full Document"}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Extraction Confidence</span>
                  <span className="font-semibold text-emerald-700">
                    {Math.round(inspectEvidence.claim.confidence_score * 100)}% Verified
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-700 text-[11px]">Atomic Claim Statement</span>
                <p className="p-3 bg-white rounded-lg border border-slate-200 font-medium text-slate-800">
                  {inspectEvidence.claim.claim_text}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-700 text-[11px]">Verbatim Passage Quote</span>
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/80 italic text-amber-900 leading-relaxed flex items-start gap-2">
                  <Quote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>"{inspectEvidence.claim.exact_quote}"</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setInspectEvidence(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
