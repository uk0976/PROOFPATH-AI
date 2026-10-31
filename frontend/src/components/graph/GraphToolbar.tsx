import React from "react"
import { Search, X, Maximize2, ZoomIn, ZoomOut, Filter, RefreshCw } from "lucide-react"
import { cn } from "@/utils/cn"

export type NodeCategoryFilter =
  | "all"
  | "goal"
  | "requirement"
  | "claim"
  | "evidence"
  | "source"
  | "gap"
  | "contradiction"
  | "blindspot"

interface GraphToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeCategory: NodeCategoryFilter
  onCategoryChange: (category: NodeCategoryFilter) => void
  categoryCounts: Record<NodeCategoryFilter, number>
  onFitView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  matchedCount?: number
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  categoryCounts,
  onFitView,
  onZoomIn,
  onZoomOut,
  onReset,
  matchedCount,
}) => {
  const categories: Array<{ id: NodeCategoryFilter; label: string; color: string }> = [
    { id: "all", label: "All Entities", color: "bg-slate-800 text-white" },
    { id: "goal", label: "Goals", color: "bg-slate-900 text-white" },
    { id: "requirement", label: "Requirements", color: "bg-slate-600 text-white" },
    { id: "claim", label: "Claims", color: "bg-blue-600 text-white" },
    { id: "evidence", label: "Evidence", color: "bg-cyan-600 text-white" },
    { id: "source", label: "Sources", color: "bg-slate-700 text-white" },
    { id: "gap", label: "Gaps", color: "bg-amber-600 text-white" },
    { id: "contradiction", label: "Conflicts", color: "bg-rose-600 text-white" },
    { id: "blindspot", label: "Blindspots", color: "bg-indigo-600 text-white" },
  ]

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Left: Search input */}
      <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-sm">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search nodes, quotes, or claims..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {searchQuery && matchedCount !== undefined && (
          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 whitespace-nowrap">
            {matchedCount} matched
          </span>
        )}
      </div>

      {/* Middle: Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
        {categories.map((cat) => {
          const count = categoryCounts[cat.id] || 0
          if (cat.id !== "all" && count === 0) return null // Hide empty categories

          const isActive = activeCategory === cat.id

          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 border whitespace-nowrap",
                isActive
                  ? "bg-[#172B45] text-white border-[#172B45] shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span>{cat.label}</span>
              <span
                className={cn(
                  "px-1 py-0.2 rounded text-[10px] font-mono",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Right: Canvas Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomIn}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onFitView}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 text-[11px] font-medium"
          title="Fit view to all nodes"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Fit View</span>
        </button>
        <button
          onClick={onReset}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Reset filter & selection"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
