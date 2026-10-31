import React, { useState } from "react"
import {
  Settings as SettingsIcon,
  Key,
  Cpu,
  Database,
  CheckCircle2,
  Sun,
  Moon,
  Laptop,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore, ThemeMode } from "@/store/useAppStore"

export const SettingsPage: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState("")
  const [groqKey, setGroqKey] = useState("")
  const [saved, setSaved] = useState(false)
  const { theme, setTheme } = useAppStore()

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const themeOptions: { mode: ThemeMode; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      mode: "light",
      label: "Light Mode",
      desc: "Clean paper white background with high-contrast deep navy ink.",
      icon: Sun,
    },
    {
      mode: "dark",
      label: "Dark Mode",
      desc: "Deep obsidian slate with muted blue accents and reduced eye strain.",
      icon: Moon,
    },
    {
      mode: "system",
      label: "System Preference",
      desc: "Automatically synchronize with your operating system's theme schedule.",
      icon: Laptop,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-secondary" />
          <span>Platform Settings & API Keys</span>
        </h1>
        <p className="text-xs text-ink-secondary mt-1">
          Configure appearance theme, AI model providers, vector embedding parameters, and backend services.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-status-success-bg border border-status-success-border text-xs text-status-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-status-success" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Appearance & Dark Mode */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4 text-secondary" />
            <span>Theme & Display Mode</span>
          </h2>
          <Badge variant="outline" className="text-[10px] uppercase font-mono">
            {theme} active
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = theme === opt.mode

            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setTheme(opt.mode)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "border-secondary bg-secondary-light/40 shadow-sm"
                    : "border-border bg-background/50 hover:bg-background hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? "bg-secondary text-white"
                        : "bg-surface border border-border text-ink-secondary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink">{opt.label}</h3>
                  <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                    {opt.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Model Providers */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-5">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-secondary" />
          <span>AI Inference Providers</span>
        </h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Google Gemini API Key (Primary)
              </label>
              <Badge variant="outline" className="text-[10px]">gemini-2.5-flash</Badge>
            </div>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full text-xs border border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-secondary font-mono bg-background/50 focus:bg-surface text-ink"
            />
            <p className="text-[11px] text-ink-muted">
              Used for goal decomposition, atomic claim extraction, and contradiction auditing.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Groq API Key (Optional Fallback)
              </label>
              <Badge variant="outline" className="text-[10px]">llama-3.3-70b-versatile</Badge>
            </div>
            <input
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full text-xs border border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-secondary font-mono bg-background/50 focus:bg-surface text-ink"
            />
            <p className="text-[11px] text-ink-muted">
              High-throughput fallback when primary provider limits are reached.
            </p>
          </div>
        </div>

        <Button size="md" variant="primary" onClick={handleSave} className="shadow-subtle">
          Save API Configuration
        </Button>
      </div>

      {/* System Infrastructure Details */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-secondary" />
          <span>System & Retrieval Engine</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg border border-border bg-background/50 space-y-1">
            <span className="text-ink-muted block text-[10px] uppercase font-semibold">Embedding Model</span>
            <span className="font-semibold text-ink font-mono">sentence-transformers/all-MiniLM-L6-v2</span>
            <span className="text-[10px] text-status-success block">● Local in-memory / zero API cost</span>
          </div>

          <div className="p-3.5 rounded-lg border border-border bg-background/50 space-y-1">
            <span className="text-ink-muted block text-[10px] uppercase font-semibold">Vector Index</span>
            <span className="font-semibold text-ink font-mono">FAISS IndexFlatIP (Cosine Similarity)</span>
            <span className="text-[10px] text-status-success block">● Instant sub-millisecond retrieval</span>
          </div>

          <div className="p-3.5 rounded-lg border border-border bg-background/50 space-y-1">
            <span className="text-ink-muted block text-[10px] uppercase font-semibold">Relational Persistence</span>
            <span className="font-semibold text-ink font-mono">SQLite (PostgreSQL-Ready ORM)</span>
            <span className="text-[10px] text-status-success block">● ACID Compliant local storage</span>
          </div>

          <div className="p-3.5 rounded-lg border border-border bg-background/50 space-y-1">
            <span className="text-ink-muted block text-[10px] uppercase font-semibold">OCR & Document Parsing</span>
            <span className="font-semibold text-ink font-mono">PyMuPDF + Tesseract Engine</span>
            <span className="text-[10px] text-status-success block">● Native layout & page preserving</span>
          </div>
        </div>
      </div>
    </div>
  )
}
