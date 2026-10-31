import React, { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  FileText,
  Globe,
  Upload,
  Plus,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { sourceService } from "@/services/sourceService"
import { researchService } from "@/services/researchService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/utils/formatters"

export const SourcesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<"pdf" | "url" | "text">("pdf")
  const [urlInput, setUrlInput] = useState("")
  const [textTitle, setTextTitle] = useState("")
  const [textContent, setTextContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: sources, isLoading } = useQuery({
    queryKey: ["sources", id],
    queryFn: () => sourceService.listSources(id!),
    enabled: !!id,
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    try {
      setIsSubmitting(true)
      await sourceService.uploadPdf(id, file)
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddUrl = async () => {
    if (!id || !urlInput.trim()) return
    try {
      setIsSubmitting(true)
      await sourceService.addUrl(id, urlInput)
      setUrlInput("")
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddText = async () => {
    if (!id || !textContent.trim()) return
    try {
      setIsSubmitting(true)
      await sourceService.addText(id, textTitle || "Pasted Note", textContent)
      setTextTitle("")
      setTextContent("")
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRerun = async () => {
    if (!id) return
    try {
      await researchService.startInvestigation(id)
      queryClient.invalidateQueries({ queryKey: ["session", id] })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ingested Evidence Sources ({sources?.length || 0})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Original documents, whitepapers, and URLs forming the evidentiary foundation.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRerun} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-run Full Audit</span>
        </Button>
      </div>

      {/* Ingestion Drawer Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Add Additional Evidence Source
        </h3>

        {/* Tab Selector */}
        <div className="flex items-center space-x-1 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("pdf")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "pdf" ? "bg-slate-100 text-navy-900 font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Upload PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "url" ? "bg-slate-100 text-navy-900 font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Web URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "text" ? "bg-slate-100 text-navy-900 font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Raw Text
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "pdf" && (
          <label className="border border-dashed border-slate-300 hover:border-brand rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 bg-slate-50/50 hover:bg-slate-50">
            <Upload className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-semibold text-slate-800">Click to choose PDF</span>
            <span className="text-[11px] text-slate-400">Extracts pages, text, and metadata with PyMuPDF</span>
            <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isSubmitting} className="hidden" />
          </label>
        )}

        {activeTab === "url" && (
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://vendor.com/documentation/sla"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <Button size="md" variant="primary" onClick={handleAddUrl} disabled={isSubmitting || !urlInput.trim()}>
              Scrape & Ingest
            </Button>
          </div>
        )}

        {activeTab === "text" && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Document Title (e.g. Internal Architecture Review Meeting)"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
            />
            <textarea
              rows={3}
              placeholder="Paste raw memorandum, meeting transcript, or notes..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
            />
            <Button size="sm" variant="primary" onClick={handleAddText} disabled={isSubmitting || !textContent.trim()}>
              Add Text Document
            </Button>
          </div>
        )}
      </div>

      {/* Sources List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Currently Ingested Sources
        </h3>

        {isLoading ? (
          <div className="text-xs text-slate-500 py-6">Loading sources...</div>
        ) : sources?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-xl bg-white">
            No sources attached to this investigation yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources?.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-card space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1">
                      {s.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono shrink-0">
                      {s.source_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {s.uri || "Uploaded Document"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {s.chunk_count} Text Chunks
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {s.publication_date ? formatDate(s.publication_date) : "Undated"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
