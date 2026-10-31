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

  const handleSaveAndPlan = async () => {
    if (!title.trim() || !goal.trim()) {
      setError("Please provide both an investigation title and research goal.")
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

      // 2. Ingest queued sources if any
      for (const item of sourcesQueue) {
        if (item.type === "pdf" && item.file) {
          await sourceService.uploadPdf(session.id, item.file, item.title)
        } else if (item.type === "url" && item.url) {
          await sourceService.addUrl(session.id, item.url, item.title)
        } else if (item.type === "text" && item.content) {
          await sourceService.addText(session.id, item.title, item.content)
        }
      }

      // 3. Navigate to Research Plan page
      navigate(`/research/${session.id}/plan`)
    } catch (err: any) {
      setError(err.message || "Failed to initiate research planner.")
      setIsSubmitting(false)
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-secondary-light text-secondary uppercase tracking-wider mb-2">
          Step 1: Investigation Setup
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Initiate Forensic Information Audit
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Define the primary question, target decision, and upload competing evidence sources to cross-examine.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-status-danger-bg border border-status-danger-border text-xs text-status-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset helpers */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
          Quick Start Enterprise Scenarios:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              applyPreset(
                "Government Postgraduate Scholarship & Grant Application",
                "I want to apply for a government scholarship. Tell me everything I should know before applying.",
                "Determine complete qualification and prepare all required documentation prior to deadline."
              )
            }
            className="text-xs bg-surface border border-secondary/30 hover:border-secondary hover:text-secondary px-3 py-1.5 rounded-lg text-ink transition-all shadow-subtle font-medium flex items-center gap-1.5"
          >
            <span>🎓</span>
            <span>Government Scholarship Inquiry</span>
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset(
                "B2B SaaS Commercial Feasibility & Market Opportunity",
                "Evaluate commercial viability, market opportunity, unit economics and competitors.",
                "Authorize market entry and go-to-market resource allocation."
              )
            }
            className="text-xs bg-surface border border-border hover:border-secondary hover:text-secondary px-3 py-1.5 rounded-lg text-ink transition-all shadow-subtle font-medium flex items-center gap-1.5"
          >
            <span>💼</span>
            <span>Business & Market Feasibility</span>
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset(
                "Public Healthcare & Disability Entitlement Assessment",
                "Determine entitlement criteria, required documentation proofs, and appeal rights for state disability insurance.",
                "File formal entitlement claim with certified evidence."
              )
            }
            className="text-xs bg-surface border border-border hover:border-secondary hover:text-secondary px-3 py-1.5 rounded-lg text-ink transition-all shadow-subtle font-medium flex items-center gap-1.5"
          >
            <span>🏛️</span>
            <span>Government Services & Benefits</span>
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset(
                "Kubernetes to AWS Serverless Migration Audit",
                "Evaluate cold-start latency SLAs, concurrency throttling limits, data egress costs, and banking VPC compliance for migrating our payment pipeline.",
                "Production architectural sign-off for Q3 migration"
              )
            }
            className="text-xs bg-surface border border-border hover:border-secondary hover:text-secondary px-3 py-1.5 rounded-lg text-ink transition-all shadow-subtle font-medium flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>Serverless vs Kubernetes</span>
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink uppercase tracking-wider">
            Investigation Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Serverless vs Kubernetes Architecture Audit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs sm:text-sm text-ink border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-background/50 focus:bg-surface"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink uppercase tracking-wider">
            Primary Research Goal / Question *
          </label>
          <textarea
            rows={3}
            placeholder="What exact claims, limits, or trade-offs need to be investigated and cross-examined?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full text-xs sm:text-sm text-ink border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-background/50 focus:bg-surface"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink uppercase tracking-wider">
            Target Decision Riding on this Audit (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Production cloud architecture sign-off for Q3"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            className="w-full text-xs sm:text-sm text-ink border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-background/50 focus:bg-surface"
          />
        </div>
      </div>

      {/* Sources Ingestion Section */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Ingest Evidence Sources
          </h3>
          <p className="text-xs text-ink-secondary">
            Add 2 or more competing sources to enable cross-source contradiction detection and verification.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* PDF File Upload */}
          <label className="border border-dashed border-border-strong hover:border-secondary rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 bg-background/50 hover:bg-surface shadow-subtle">
            <Upload className="w-5 h-5 text-ink-muted" />
            <span className="text-xs font-semibold text-ink">Upload PDF</span>
            <span className="text-[10px] text-ink-muted">Whitepapers, specs, slides</span>
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* URL Input */}
          <div className="border border-border rounded-xl p-3 flex flex-col justify-between space-y-2 bg-surface">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Globe className="w-4 h-4 text-secondary" />
              <span>Web URL</span>
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="text-xs border border-border rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-secondary bg-background/40 focus:bg-surface"
            />
            <Button size="sm" variant="secondary" onClick={handleAddUrl} disabled={!urlInput.trim()}>
              Add URL
            </Button>
          </div>

          {/* Text Paste */}
          <div className="border border-border rounded-xl p-3 flex flex-col justify-between space-y-2 bg-surface">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <FileText className="w-4 h-4 text-secondary" />
              <span>Paste Text</span>
            </div>
            <input
              type="text"
              placeholder="Title..."
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="text-xs border border-border rounded p-1.5 focus:outline-none bg-background/40 focus:bg-surface"
            />
            <textarea
              rows={2}
              placeholder="Paste raw memorandum or notes..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="text-xs border border-border rounded p-1.5 focus:outline-none resize-none bg-background/40 focus:bg-surface"
            />
            <Button size="sm" variant="secondary" onClick={handleAddText} disabled={!textInput.trim()}>
              Add Text
            </Button>
          </div>
        </div>

        {/* Queued Sources List */}
        {sourcesQueue.length > 0 && (
          <div className="pt-2 space-y-2">
            <span className="text-xs font-semibold text-ink">
              Queued Sources ({sourcesQueue.length}):
            </span>
            <div className="space-y-1.5">
              {sourcesQueue.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface text-xs shadow-subtle">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-status-success" />
                    <span className="font-medium text-ink">{s.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {s.type}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSourcesQueue(sourcesQueue.filter((_, i) => i !== idx))}
                    className="text-ink-muted hover:text-status-danger text-xs font-bold px-2 transition-colors"
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
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Button
          size="md"
          variant="outline"
          onClick={handleSaveAndPlan}
          disabled={isSubmitting}
          className="px-5 font-medium flex items-center gap-2 bg-surface"
        >
          <Sparkles className="w-4 h-4 text-secondary" />
          <span>Configure Research Plan (AI Planner)</span>
        </Button>

        <Button
          size="md"
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 font-semibold flex items-center gap-2 shadow-subtle"
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
