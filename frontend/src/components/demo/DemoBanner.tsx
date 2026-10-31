import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import {
  Sparkles,
  RotateCcw,
  PlusCircle,
  ShieldAlert,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { demoService } from "@/services/demoService"
import { DemoTourModal } from "./DemoTourModal"

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
      <div className="w-full bg-amber-50/70 border-b border-amber-200/70 text-ink px-3 sm:px-6 py-2 shadow-2xs shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          {/* Left Warning / Sample Label */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 overflow-hidden">
            <div className="w-5 h-5 rounded bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-900 border-amber-300 font-mono text-[9px] font-bold py-0 shrink-0"
              >
                DEMO MODE • SAMPLE DATA
              </Badge>
              <span className="text-ink-secondary text-[11px] truncate">
                Synthetic scholarship dataset. Fictional requirements are not real government rules.
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 self-end sm:self-auto">
            {resetSuccess && (
              <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1 mr-1 animate-in fade-in">
                <CheckCircle className="w-3 h-3" />
                Pristine Data Restored
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTourOpen(true)}
              className="h-7 text-xs bg-surface border-primary/25 hover:bg-primary/5 text-primary font-medium px-2 sm:px-2.5"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
              <span>Judge Tour</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="h-7 text-xs bg-surface border-border hover:bg-background text-ink-secondary hover:text-ink px-2 sm:px-2.5"
              title="Reset sample data to initial pristine state"
            >
              {isResetting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3 mr-1" />
              )}
              <span className="hidden xs:inline">Reset</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleStartReal}
              className="h-7 text-xs px-2 sm:px-2.5"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              <span>Real Inquiry</span>
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
