import React, { useState, useRef, useId } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  FileText,
  Globe,
  Upload,
  Plus,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
  ExternalLink,
  X,
  FileCheck,
  AlertTriangle,
  Hash,
  ShieldCheck,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { sourceService } from "@/services/sourceService"
import { researchService } from "@/services/researchService"
import { SourceItem, SourceChunkItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/utils/formatters"
import { DEMO_SESSION_ID, SAMPLE_SOURCES } from "@/utils/sampleData"

export const SourcesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const fileInputId = useId()

  const [activeTab, setActiveTab] = useState<"pdf" | "url" | "text">("pdf")
  const [urlMode, setUrlMode] = useState<"single" | "batch">("single")

  // Form states
  const [singleUrl, setSingleUrl] = useState("")
  const [singleUrlTitle, setSingleUrlTitle] = useState("")
  const [batchUrlsText, setBatchUrlsText] = useState("")
  const [textTitle, setTextTitle] = useState("")
  const [textContent, setTextContent] = useState("")

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Loading & notification states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Preview drawer state
  const [previewSource, setPreviewSource] = useState<SourceItem | null>(null)
  const [previewTab, setPreviewTab] = useState<"content" | "chunks" | "metadata">("content")
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Queries
  const { data: sources, isLoading } = useQuery({
    queryKey: ["sources", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          return await sourceService.listSources(id!)
        } catch {
          return SAMPLE_SOURCES
        }
      }
      return await sourceService.listSources(id!)
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Auto-poll if any source is in pending or processing state
      const hasPending = query.state.data?.some(
        (s) => s.processing_status === "pending" || s.processing_status === "processing"
      )
      return hasPending ? 3000 : false
    },
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (sourceId: string) => sourceService.deleteSource(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      if (previewSource) setPreviewSource(null)
      setStatusMessage("Source successfully removed.")
      setTimeout(() => setStatusMessage(null), 3500)
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.detail || "Failed to delete source.")
    },
  })

  const retryMutation = useMutation({
    mutationFn: (sourceId: string) => sourceService.retrySource(sourceId),
    onSuccess: (updatedSource) => {
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      if (previewSource && previewSource.id === updatedSource.id) {
        setPreviewSource(updatedSource)
      }
      setStatusMessage(`Extraction retried: ${updatedSource.title}`)
      setTimeout(() => setStatusMessage(null), 3500)
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.detail || "Failed to re-extract source.")
    },
  })

  // PDF Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const pdfFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf"
      )
      if (pdfFiles.length === 0) {
        setErrorMessage("Please drop valid PDF documents only.")
        return
      }
      setSelectedFiles((prev) => [...prev, ...pdfFiles])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...files])
    }
  }

  const handleRemoveSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUploadFiles = async () => {
    if (!id || selectedFiles.length === 0) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setStatusMessage(`Uploading and processing ${selectedFiles.length} PDF(s)...`)

    try {
      if (selectedFiles.length === 1) {
        await sourceService.uploadPdf(id, selectedFiles[0])
      } else {
        await sourceService.uploadMultiplePdfs(id, selectedFiles)
      }
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setStatusMessage("All PDF documents processed and ingested.")
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to process PDF documents.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // URL Handlers
  const handleAddSingleUrl = async () => {
    if (!id || !singleUrl.trim()) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setStatusMessage(`Scraping webpage with anti-SSRF verification: ${singleUrl}...`)

    try {
      await sourceService.addUrl(id, singleUrl.trim(), singleUrlTitle.trim() || undefined)
      setSingleUrl("")
      setSingleUrlTitle("")
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setStatusMessage("URL content verified, extracted, and indexed.")
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to fetch webpage.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddBatchUrls = async () => {
    if (!id || !batchUrlsText.trim()) return
    const urls = batchUrlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0)

    if (urls.length === 0) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setStatusMessage(`Scraping and verifying ${urls.length} URLs in batch...`)

    try {
      const result = await sourceService.addUrlsBatch(id, urls)
      setBatchUrlsText("")
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setStatusMessage(
        `Batch completed: ${result.total_successful} successful, ${result.total_failed} failed.`
      )
      setTimeout(() => setStatusMessage(null), 5000)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to execute batch URL extraction.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Plain Text Handlers
  const handleAddText = async () => {
    if (!id || !textContent.trim()) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setStatusMessage("Normalizing and indexing memorandum...")

    try {
      await sourceService.addText(
        id,
        textTitle.trim() || "Policy / Audit Memorandum",
        textContent.trim()
      )
      setTextTitle("")
      setTextContent("")
      queryClient.invalidateQueries({ queryKey: ["sources", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setStatusMessage("Text document ingested successfully.")
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to ingest text document.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Drawer Preview
  const handleOpenPreview = async (source: SourceItem) => {
    setIsLoadingPreview(true)
    setPreviewTab("content")
    try {
      const detailed = await sourceService.getSourceDetail(source.id)
      setPreviewSource(detailed)
    } catch (err) {
      setPreviewSource(source)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleRerun = async () => {
    if (!id) return
    try {
      setIsSubmitting(true)
      setStatusMessage("Starting 15-stage investigative pipeline...")
      await researchService.startInvestigation(id)
      queryClient.invalidateQueries({ queryKey: ["session", id] })
      setStatusMessage("Investigation started in background.")
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to trigger audit.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Multi-Source Ingestion Engine
            </h1>
            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 font-medium">
              {sources?.length || 0} Sources
            </Badge>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Official PDFs, online URLs, and policy memorandums verified with anti-SSRF and Tesseract OCR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {id && (
            <Link to={`/research/${id}/plan`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border bg-surface">
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                <span>Research Plan</span>
              </Button>
            </Link>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRerun}
            disabled={isSubmitting}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
            <span>Re-run Investigation</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center justify-between p-3 text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Ingestion Hub Card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Add Investigation Sources
          </h2>
          <span className="text-[11px] text-ink-muted">Strictly anti-hallucination grounded</span>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-1 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("pdf")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "pdf"
                ? "bg-primary text-white shadow-subtle"
                : "text-ink-secondary hover:text-ink hover:bg-background"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Documents</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "url"
                ? "bg-primary text-white shadow-subtle"
                : "text-ink-secondary hover:text-ink hover:bg-background"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web URLs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "text"
                ? "bg-primary text-white shadow-subtle"
                : "text-ink-secondary hover:text-ink hover:bg-background"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Plain Text / Memo</span>
          </button>
        </div>

        {/* 1. PDF TAB */}
        {activeTab === "pdf" && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                isDragging
                  ? "border-secondary bg-secondary-light/40 scale-[1.01]"
                  : "border-border-strong hover:border-secondary bg-background/50 hover:bg-surface"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-secondary-light text-secondary flex items-center justify-center">
                <Upload className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">
                  Click to select or drag & drop PDF files here
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Supports multiple PDF uploads (up to 50MB each). Scanned pages automatically use Tesseract OCR.
                </p>
              </div>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />
            </div>

            {/* Selected Files Staging List */}
            {selectedFiles.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>Selected Files to Upload ({selectedFiles.length})</span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-surface px-3 py-1.5 rounded border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span className="truncate font-medium text-ink">{file.name}</span>
                        <span className="text-[10px] text-ink-muted shrink-0">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(idx)}
                        className="text-ink-muted hover:text-status-danger p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleUploadFiles}
                    disabled={isSubmitting}
                    className="gap-1.5 text-xs shadow-subtle"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Process {selectedFiles.length} Document(s)</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. URL TAB */}
        {activeTab === "url" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-ink-secondary font-medium">Mode:</span>
              <button
                type="button"
                onClick={() => setUrlMode("single")}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  urlMode === "single"
                    ? "bg-secondary-light text-secondary font-semibold"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Single Webpage
              </button>
              <button
                type="button"
                onClick={() => setUrlMode("batch")}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  urlMode === "batch"
                    ? "bg-secondary-light text-secondary font-semibold"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Batch Multiple URLs
              </button>
            </div>

            {urlMode === "single" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                      Web URL (Strict anti-SSRF inspection applied)
                    </label>
                    <input
                      type="url"
                      placeholder="https://grants.gov/opportunity/eligibility-criteria"
                      value={singleUrl}
                      onChange={(e) => setSingleUrl(e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-secondary bg-background/50 focus:bg-surface text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                      Custom Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Official Grants Portal"
                      value={singleUrlTitle}
                      onChange={(e) => setSingleUrlTitle(e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-secondary bg-background/50 focus:bg-surface text-ink"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-ink-muted flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                    Private RFC 1918 IPs and localhost addresses are rejected.
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleAddSingleUrl}
                    disabled={isSubmitting || !singleUrl.trim()}
                    className="text-xs shadow-subtle"
                  >
                    Scrape & Ingest URL
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                    Enter one URL per line:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="https://scholarships.gov/faqs&#10;https://university.edu/admissions/financial-aid&#10;https://education.gov/grants/income-limits"
                    value={batchUrlsText}
                    onChange={(e) => setBatchUrlsText(e.target.value)}
                    className="w-full text-xs font-mono border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-secondary bg-background/50 focus:bg-surface text-ink"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-muted">
                    Each URL is independently scraped with Trafilatura and BeautifulSoup.
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleAddBatchUrls}
                    disabled={isSubmitting || !batchUrlsText.trim()}
                    className="text-xs shadow-subtle"
                  >
                    Ingest URL Batch
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PLAIN TEXT TAB */}
        {activeTab === "text" && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                Document / Memorandum Title
              </label>
              <input
                type="text"
                placeholder="e.g. Internal Financial Verification Meeting Minutes (May 2024)"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-secondary bg-background/50 focus:bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                Raw Content or Text Excerpt
              </label>
              <textarea
                rows={5}
                placeholder="Paste verbatim memorandum, policy text, email confirmation, or transcript..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full text-xs border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-secondary font-sans leading-relaxed bg-background/50 focus:bg-surface text-ink"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-ink-muted">
                {textContent.length} characters • {textContent.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={handleAddText}
                disabled={isSubmitting || !textContent.trim()}
                className="text-xs shadow-subtle"
              >
                Ingest Memorandum
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ingested Sources Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ingested Sources & Evidentiary Base ({sources?.length || 0})
          </h2>
          <span className="text-[11px] text-slate-400">
            Click &quot;Inspect&quot; to review extracted text and chunks
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin text-slate-400 mb-2" />
            Loading attached sources...
          </div>
        ) : !sources || sources.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No Sources Ingested Yet</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Upload PDF documents or submit web URLs above to supply evidentiary proof for this investigation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((source) => {
              const isFailed = source.processing_status === "failed"
              const isProcessing =
                source.processing_status === "pending" || source.processing_status === "processing"

              return (
                <div
                  key={source.id}
                  className={`bg-white border rounded-xl p-5 shadow-card flex flex-col justify-between transition-all ${
                    isFailed
                      ? "border-red-200 bg-red-50/20"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Title and Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {source.source_type === "pdf" && (
                          <FileText className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                        {source.source_type === "url" && (
                          <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        {source.source_type === "text" && (
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                          {source.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-mono px-1.5 py-0.5"
                        >
                          {source.source_type}
                        </Badge>
                        {isFailed ? (
                          <Badge variant="danger" className="text-[10px] uppercase font-mono">
                            Failed
                          </Badge>
                        ) : isProcessing ? (
                          <Badge variant="warning" className="text-[10px] uppercase font-mono animate-pulse">
                            Processing
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] uppercase font-mono">
                            Processed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* URI / Domain */}
                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="font-mono text-[11px] truncate text-slate-600">
                        {source.uri || "Uploaded Document"}
                      </p>
                      {source.domain && (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 font-mono">
                          {source.domain}
                        </span>
                      )}
                    </div>

                    {/* Error Banner if Failed */}
                    {isFailed && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800 space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span className="font-medium">Extraction Failure:</span>
                        </div>
                        <p className="text-[11px] text-red-700 font-mono leading-relaxed pl-5">
                          {source.error_details || "Unable to extract readable text."}
                        </p>
                      </div>
                    )}

                    {/* Metrics: Word count, Chunks, Date */}
                    {!isFailed && (
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>{source.chunk_count || 0} Chunks</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <span>{source.word_count || 0} Words</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {source.publication_date ? formatDate(source.publication_date) : "Undated"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Bar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                      Added {formatDate(source.created_at)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isFailed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate(source.id)}
                          disabled={retryMutation.isPending}
                          className="h-7 px-2 text-[11px] gap-1 text-red-700 border-red-200 hover:bg-red-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </Button>
                      )}

                      {!isFailed && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenPreview(source)}
                          className="h-7 px-2.5 text-[11px] gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </Button>
                      )}

                      {source.source_type === "url" && source.uri && (
                        <a
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="Open Original URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove source "${source.title}"?`)) {
                            deleteMutation.mutate(source.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Source Detail & Inspection Slide-Over Drawer */}
      {previewSource && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div className="space-y-1 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {previewSource.source_type}
                  </Badge>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {previewSource.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                  {previewSource.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {previewSource.uri || "Direct Document Upload"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewSource(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 px-5 bg-white text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab("content")}
                className={`py-3 px-3 font-medium border-b-2 transition-colors ${
                  previewTab === "content"
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-secondary hover:text-ink"
                }`}
              >
                Cleaned Full Text
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("chunks")}
                className={`py-3 px-3 font-medium border-b-2 transition-colors ${
                  previewTab === "chunks"
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-secondary hover:text-ink"
                }`}
              >
                Chunks & Provenance ({previewSource.chunks?.length || previewSource.chunk_count || 0})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("metadata")}
                className={`py-3 px-3 font-medium border-b-2 transition-colors ${
                  previewTab === "metadata"
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-secondary hover:text-ink"
                }`}
              >
                Forensic Metadata & Hash
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoadingPreview ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin text-slate-400 mb-2" />
                  Retrieving source details...
                </div>
              ) : (
                <>
                  {previewTab === "content" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {previewSource.word_count || 0} Words • {previewSource.char_count || 0} Characters
                        </span>
                        <span className="text-[11px] text-slate-400">Normalized via NFKC & smart punctuation harmonizer</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto text-slate-800 select-text">
                        {previewSource.cleaned_content || previewSource.raw_content || "No extracted text available."}
                      </div>
                    </div>
                  )}

                  {previewTab === "chunks" && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Segmented with sliding window overlap and deterministic provenance IDs:
                      </p>
                      {previewSource.chunks && previewSource.chunks.length > 0 ? (
                        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                          {previewSource.chunks.map((chunk) => (
                            <div
                              key={chunk.id}
                              className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-xs"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-1">
                                <span className="font-semibold text-slate-800">
                                  Chunk #{chunk.chunk_index + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                  {chunk.page_number && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                                      Page {chunk.page_number}
                                    </Badge>
                                  )}
                                  <span className="text-[10px] font-mono">
                                    {chunk.token_count} tokens
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-mono select-text">
                                &quot;{chunk.text_content}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400 border rounded-lg bg-slate-50">
                          No segmented chunks recorded.
                        </div>
                      )}
                    </div>
                  )}

                  {previewTab === "metadata" && (
                    <div className="space-y-3 text-xs">
                      <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">Source ID</span>
                          <span className="font-mono text-slate-800 select-all">{previewSource.id}</span>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">SHA-256 Content Hash</span>
                          <span className="font-mono text-[11px] text-slate-800 select-all break-all">
                            {previewSource.content_hash || "Calculated upon extraction"}
                          </span>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">Domain / Authority</span>
                          <span className="font-mono text-slate-800">{previewSource.domain || "N/A"}</span>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">Author / Publisher</span>
                          <span className="text-slate-800">{previewSource.author_or_publisher || "Unknown / Unspecified"}</span>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">Publication Date</span>
                          <span className="text-slate-800">
                            {previewSource.publication_date ? formatDate(previewSource.publication_date) : "Undated"}
                          </span>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">Last Modified Date</span>
                          <span className="text-slate-800">
                            {previewSource.last_modified_date ? formatDate(previewSource.last_modified_date) : "Not reported"}
                          </span>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">Extraction Timestamp</span>
                          <span className="text-slate-800">
                            {previewSource.extraction_timestamp ? formatDate(previewSource.extraction_timestamp) : formatDate(previewSource.created_at)}
                          </span>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-slate-500">Processing Status</span>
                          <Badge
                            variant={previewSource.processing_status === "processed" ? "success" : "danger"}
                            className="text-[10px] uppercase font-mono"
                          >
                            {previewSource.processing_status || "processed"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <Button size="sm" variant="outline" onClick={() => setPreviewSource(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
