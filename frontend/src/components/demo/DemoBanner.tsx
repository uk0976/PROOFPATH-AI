import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import {
  Sparkles,
  RotateCcw,
  PlusCircle,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { demoService } from "@/services/demoService"
import { DemoTourModal } from "./DemoTourModal"
import { DEMO_SESSION_ID } from "@/utils/sampleData"

interface DemoBannerProps {
  initialTourOpen?: boolean
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ initialTourOpen = false }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isTourOpen, setIsTourOpen] = useState<boolean>(initialTourOpen)
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [resetSuccess, setResetSuccess] = useState<boolean>(false)

  const handleReset = async () => {
    try {
      setIsResetting(true)
      await demoService.resetDemo()
      // Invalidate all active queries so fresh pristine demo data is loaded everywhere
      await queryClient.invalidateQueries()
      setResetSuccess(true)
      setTimeout(() => setResetSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to reset demo data:", err)
    } finally {
      setIsResetting(false)
    }
  }

  const handleStartReal = () => {
    navigate("/research")
  }

  return (
    <>
      <div className="w-full bg-gradient-to-r from-amber-500/15 via-primary/10 to-amber-500/15 border-b border-amber-300/40 text-ink px-4 py-2.5 shadow-subtle shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Left Warning / Sample Label */}
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="bg-amber-100/90 text-amber-900 border-amber-300 font-mono text-[10px] font-bold py-0.5"
              >
                DEMO MODE • SAMPLE DATA
              </Badge>
              <span className="text-ink-secondary text-xs">
                Synthetic scholarship demonstration dataset. Fictional requirements are not real government rules.
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {resetSuccess && (
              <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1 mr-1 animate-in fade-in">
                <CheckCircle className="w-3 h-3" />
                Data Reset to Pristine State
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTourOpen(true)}
              className="h-7 text-xs bg-surface border-primary/30 hover:bg-primary/5 text-primary font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
              <span>Judge Tour (10 Steps)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="h-7 text-xs bg-surface border-border hover:bg-background text-ink-secondary hover:text-ink"
              title="Reset sample data to initial state"
            >
              {isResetting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3 mr-1" />
              )}
              <span>Reset Demo</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleStartReal}
              className="h-7 text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              <span>Start Real Investigation</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 10-Step Interactive Tour Modal */}
      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </>
  )
}
