export function formatDate(dateString?: string | null): string {
  if (!dateString) return "N/A"
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

export function getReadinessTier(score: number): {
  tier: string
  color: string
  bgColor: string
  borderColor: string
} {
  if (score >= 80) {
    return {
      tier: "Decision-Ready",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    }
  } else if (score >= 50) {
    return {
      tier: "Conditional Proceed",
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    }
  } else {
    return {
      tier: "Critical Blindspots",
      color: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
    }
  }
}

export function getSeverityBadge(severity: string): {
  color: string
  bgColor: string
  borderColor: string
} {
  switch (severity?.toLowerCase()) {
    case "high":
      return {
        color: "text-rose-700",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
      }
    case "medium":
      return {
        color: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
      }
    default:
      return {
        color: "text-slate-700",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
      }
  }
}
