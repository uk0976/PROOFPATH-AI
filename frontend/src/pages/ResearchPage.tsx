import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  ArrowRight,
  Upload,
  Globe,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react"
import { researchService } from "@/services/researchService"
import { sourceService } from "@/services/sourceService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const ResearchPage: React.FC = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState("")
  const [goal, setGoal] = useState("")
  const [decision, setDecision] = useState("")

  // Sources State
  const [urlInput, setUrlInput] = useState("")
  const [textInput, setTextInput] = useState("")
  const [textTitle, setTextTitle] = useState("")
  const [sourcesQueue, setSourcesQueue] = useState<Array<{ type: "pdf" | "url" | "text"; title: string; file?: File; url?: string; content?: string }>>([])

  // Preset Prompts
  const applyPreset = (presetTitle: string, presetGoal: string, presetDecision: string) => {
    setTitle(presetTitle)
    setGoal(presetGoal)
    setDecision(presetDecision)
  }

  const handleAddUrl = () => {
    if (!urlInput.trim()) return
    setSourcesQueue([...sourcesQueue, { type: "url", title: urlInput, url: urlInput }])
    setUrlInput("")
  }

  const handleAddText = () => {
    if (!textInput.trim()) return
    setSourcesQueue([
      ...sourcesQueue,
      { type: "text", title: textTitle || "Pasted Memorandum", content: textInput }
    ])
    setTextTitle("")
    setTextInput("")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSourcesQueue([...sourcesQueue, { type: "pdf", title: file.name, file }])
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !goal.trim()) {
      setError("Please provide both an investigation title and research goal.")
      return
    }
    if (sourcesQueue.length === 0) {
      setError("Please add at least one source document (PDF, URL, or Text memorandum).")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // 1. Create Session
      const session = await researchService.createSession({
        title,
        research_goal: goal,
        target_decision: decision,
      })

      // 2. Ingest queued sources
      for (const item of sourcesQueue) {
        if (item.type === "pdf" && item.file) {
          await sourceService.uploadPdf(session.id, item.file, item.title)
        } else if (item.type === "url" && item.url) {
          await sourceService.addUrl(session.id, item.url, item.title)
        } else if (item.type === "text" && item.content) {
          await sourceService.addText(session.id, item.title, item.content)
        }
      }

      // 3. Start Investigation Pipeline
      await researchService.startInvestigation(session.id)

      // 4. Navigate to live investigation progress page
      navigate(`/investigation/${session.id}/progress`)
    } catch (err: any) {
      setError(err.message || "Failed to initiate investigation.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase tracking-wider mb-2">
          Step 1: Investigation Setup
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Initiate Forensic Information Audit
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Define the primary question, target decision, and upload competing evidence sources to cross-examine.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset helpers */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Quick Start Enterprise Scenarios:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              applyPreset(
                "Kubernetes to AWS Serverless Migration Audit",
                "Evaluate cold-start latency SLAs, concurrency throttling limits, data egress costs, and banking VPC compliance for migrating our payment pipeline.",
                "Production architectural sign-off for Q3 migration"
              )
            }
            className="text-xs bg-white border border-slate-200 hover:border-brand hover:text-brand px-3 py-1.5 rounded-lg text-slate-700 transition-all shadow-xs"
          >
            Serverless vs Kubernetes Migration
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset(
                "Fintech Vendor SOC2 & Compliance Audit",
                "Audit vendor documentation for data residency, encryption at rest, GDPR cross-border transfer agreements, and disaster recovery RTO.",
                "Vendor vendor selection and procurement signoff"
              )
            }
            className="text-xs bg-white border border-slate-200 hover:border-brand hover:text-brand px-3 py-1.5 rounded-lg text-slate-700 transition-all shadow-xs"
          >
            Vendor SOC2 & Compliance Audit
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Investigation Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Serverless vs Kubernetes Architecture Audit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Primary Research Goal / Question *
          </label>
          <textarea
            rows={3}
            placeholder="What exact claims, limits, or trade-offs need to be investigated and cross-examined?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Target Decision Riding on this Audit (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Production cloud architecture sign-off for Q3"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            className="w-full text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>

      {/* Sources Ingestion Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Ingest Evidence Sources
          </h3>
          <p className="text-xs text-slate-500">
            Add 2 or more competing sources to enable cross-source contradiction detection and verification.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* PDF File Upload */}
          <label className="border border-dashed border-slate-300 hover:border-brand rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 bg-slate-50/50 hover:bg-slate-50">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Upload PDF</span>
            <span className="text-[10px] text-slate-400">Whitepapers, specs, slides</span>
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* URL Input */}
          <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2 bg-white">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Web URL</span>
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <Button size="sm" variant="secondary" onClick={handleAddUrl} disabled={!urlInput.trim()}>
              Add URL
            </Button>
          </div>

          {/* Text Paste */}
          <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2 bg-white">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Paste Text</span>
            </div>
            <input
              type="text"
              placeholder="Title..."
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="text-xs border border-slate-200 rounded p-1.5 focus:outline-none"
            />
            <textarea
              rows={2}
              placeholder="Paste raw memorandum or notes..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="text-xs border border-slate-200 rounded p-1.5 focus:outline-none resize-none"
            />
            <Button size="sm" variant="secondary" onClick={handleAddText} disabled={!textInput.trim()}>
              Add Text
            </Button>
          </div>
        </div>

        {/* Queued Sources List */}
        {sourcesQueue.length > 0 && (
          <div className="pt-2 space-y-2">
            <span className="text-xs font-semibold text-slate-700">
              Queued Sources ({sourcesQueue.length}):
            </span>
            <div className="space-y-1.5">
              {sourcesQueue.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-slate-900">{s.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {s.type}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSourcesQueue(sourcesQueue.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-600 text-xs font-bold px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          size="lg"
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8 font-semibold"
        >
          {isSubmitting ? (
            <span>Processing Ingestion & Pipeline...</span>
          ) : (
            <>
              <span>Run Forensic Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
