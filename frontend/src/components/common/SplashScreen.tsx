import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LogoIcon } from "@/components/brand/Logo"
import { Sparkles, ArrowRight } from "lucide-react"

interface SplashScreenProps {
  durationMs?: number // Default: 5000ms (5 seconds)
  onComplete?: () => void
  forceShow?: boolean
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  durationMs = 5000,
  onComplete,
  forceShow = false,
}) => {
  const shouldSkipInitial = () => {
    if (typeof window === "undefined") return true
    if (forceShow || window.location.search.includes("splash=true")) return false
    if (window.location.search.includes("nosplash=true")) {
      try {
        sessionStorage.setItem("proofpath_splash_shown", "true")
      } catch (e) {}
      return true
    }
    const hasShown = sessionStorage.getItem("proofpath_splash_shown")
    return hasShown === "true"
  }

  const [visible, setVisible] = useState(!shouldSkipInitial())
  const [progress, setProgress] = useState(0)

  // Listen for keyboard ESC to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // 5-second smooth timer and progress ticker
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, (elapsed / durationMs) * 100)
      setProgress(pct)

      if (elapsed >= durationMs) {
        clearInterval(interval)
        handleDismiss()
      }
    }, 20)

    return () => clearInterval(interval)
  }, [durationMs])

  const handleDismiss = () => {
    setVisible(false)
    try {
      sessionStorage.setItem("proofpath_splash_shown", "true")
    } catch (e) {}
    if (onComplete) {
      setTimeout(onComplete, 600)
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="proofpath-splash"
          data-testid="proofpath-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#080D1A] text-white overflow-hidden select-none"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-transparent rounded-full blur-[120px] animate-pulse duration-1000" />
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
          </div>

          {/* Top Bar Minimal Telemetry */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-full max-w-5xl px-6 pt-6 flex items-center justify-between text-[11px] font-mono text-slate-400 z-10"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>FORENSIC VERIFICATION ENGINE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">SYSTEM READY</span>
              <span className="text-cyan-400 font-bold">v2.0</span>
            </div>
          </motion.div>

          {/* Center Stage: Hero Animated Logo & Branding */}
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-xl z-10 space-y-7 -mt-6">
            {/* Animated Emblem */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 18,
                duration: 1.2,
              }}
              className="relative"
            >
              <div className="relative p-5 rounded-2xl bg-gradient-to-b from-white/10 to-white/0 border border-white/10 shadow-[0_0_50px_-10px_rgba(56,189,248,0.3)] backdrop-blur-md">
                <LogoIcon size={84} animated className="filter drop-shadow-[0_8px_24px_rgba(37,99,235,0.45)]" />
              </div>

              {/* Glowing Pulse Rings */}
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl border border-cyan-400/40 pointer-events-none"
              />
            </motion.div>

            {/* Title & Brand Name */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="space-y-2.5"
            >
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-sans">
                  PROOFPATH
                </h1>
                <span className="font-mono text-sm sm:text-base font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  AI
                </span>
              </div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.9 }}
                className="text-sm sm:text-base text-slate-300 font-medium tracking-wide"
              >
                Know what's <span className="text-cyan-400 underline decoration-cyan-400/40 underline-offset-4">missing</span> before you decide.
              </motion.p>
            </motion.div>

            {/* Forensic Inspection Badges */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.7 }}
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400"
            >
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Multi-Source Ingestion</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Zero-Hallucination Quotes</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>BlindSpot Discovery</span>
              </span>
            </motion.div>
          </div>

          {/* Bottom Bar: 5-Second Progress Meter & Skip Button */}
          <div className="w-full max-w-xl px-6 pb-8 space-y-3 z-10">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Initializing forensic modules...</span>
              </span>
              <span>{Math.round(progress)}%</span>
            </div>

            {/* Glowing Progress Track */}
            <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/50">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>

            {/* Skip Option */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 group px-2 py-1 rounded hover:bg-white/5"
              >
                <span>Enter workspace</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                <span className="text-[10px] text-slate-600 ml-1">(ESC)</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SplashScreen
