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
      color: "text-[#23865B]",
      bgColor: "bg-[#EBF6F0]",
      borderColor: "border-[#BCE4CF]",
    }
  } else if (score >= 50) {
    return {
      tier: "Conditional Proceed",
      color: "text-[#C28A32]",
      bgColor: "bg-[#FDF7EC]",
      borderColor: "border-[#F5DFB5]",
    }
  } else {
    return {
      tier: "Critical Blindspots",
      color: "text-[#C65353]",
      bgColor: "bg-[#FDF2F2]",
      borderColor: "border-[#F5C2C2]",
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
        color: "text-[#C65353]",
        bgColor: "bg-[#FDF2F2]",
        borderColor: "border-[#F5C2C2]",
      }
    case "medium":
      return {
        color: "text-[#C28A32]",
        bgColor: "bg-[#FDF7EC]",
        borderColor: "border-[#F5DFB5]",
      }
    default:
      return {
        color: "text-[#315B83]",
        bgColor: "bg-[#EBF1F7]",
        borderColor: "border-[#D0DEEC]",
      }
  }
}
