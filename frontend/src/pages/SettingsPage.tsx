import React, { useState } from "react"
import { Settings as SettingsIcon, Key, Cpu, Database, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const SettingsPage: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState("")
  const [groqKey, setGroqKey] = useState("")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-slate-700" />
          <span>Platform Settings & API Keys</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure AI model providers, vector embedding parameters, and backend services.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Model Providers */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-5">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-brand" />
          <span>AI Inference Providers</span>
        </h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Google Gemini API Key (Primary)
              </label>
              <Badge variant="outline" className="text-[10px]">gemini-2.5-flash</Badge>
            </div>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Used for goal decomposition, atomic claim extraction, and contradiction auditing.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Groq API Key (Optional Fallback)
              </label>
              <Badge variant="outline" className="text-[10px]">llama-3.3-70b-versatile</Badge>
            </div>
            <input
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand font-mono"
            />
            <p className="text-[11px] text-slate-400">
              High-throughput fallback when primary provider limits are reached.
            </p>
          </div>
        </div>

        <Button size="md" variant="primary" onClick={handleSave}>
          Save API Configuration
        </Button>
      </div>

      {/* System Infrastructure Details */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-700" />
          <span>System & Retrieval Engine</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase">Embedding Model</span>
            <span className="font-semibold text-slate-900 font-mono">sentence-transformers/all-MiniLM-L6-v2</span>
            <span className="text-[10px] text-emerald-600 block">● Local in-memory / zero API cost</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase">Vector Index</span>
            <span className="font-semibold text-slate-900 font-mono">FAISS IndexFlatIP (Cosine Similarity)</span>
            <span className="text-[10px] text-emerald-600 block">● Instant sub-millisecond retrieval</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase">Relational Persistence</span>
            <span className="font-semibold text-slate-900 font-mono">SQLite (PostgreSQL-Ready ORM)</span>
            <span className="text-[10px] text-slate-500 block">UUID Primary Keys</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase">PDF & Web Scraper</span>
            <span className="font-semibold text-slate-900 font-mono">PyMuPDF 2.0 + Trafilatura</span>
            <span className="text-[10px] text-slate-500 block">Clean main-body and date parser</span>
          </div>
        </div>
      </div>
    </div>
  )
}
