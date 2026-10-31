import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ShieldCheck, Sparkles, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { demoService } from "@/services/demoService"
import { DEMO_SESSION_ID } from "@/utils/sampleData"

export const DemoPage: React.FC = () => {
  const navigate = useNavigate()
  const [statusText, setStatusText] = useState<string>("Loading scholarship demonstration dataset...")

  useEffect(() => {
    let isMounted = true

    const prepareDemo = async () => {
      try {
        setStatusText("Verifying sample sources and contradiction scope matrix...")
        await demoService.loadDemo()
      } catch (err) {
        console.warn("Backend demo seeding fallback to client data:", err)
      } finally {
        if (isMounted) {
          // Navigate to demo intelligence dashboard with tour modal active
          navigate(`/intelligence/${DEMO_SESSION_ID}?tour=true`, { replace: true })
        }
      }
    }

    const timer = setTimeout(prepareDemo, 600)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [navigate])

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-subtle animate-pulse">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-semibold mb-3">
        <span>DEMO MODE • SAMPLE DATA</span>
      </div>

      <h1 className="text-2xl font-bold text-ink max-w-lg mb-2">
        Preparing Demonstration Scenario
      </h1>

      <p className="text-sm text-ink-secondary max-w-md mb-6 leading-relaxed">
        Setting up the fictional Federal STEM Postgraduate Scholarship investigation with 3 sample sources, 5 requirements, and full contradiction matrix.
      </p>

      <div className="flex items-center space-x-2 text-xs font-medium text-ink-muted">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>{statusText}</span>
      </div>

      <div className="mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/intelligence/${DEMO_SESSION_ID}?tour=true`)}
        >
          <span>Skip to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}
