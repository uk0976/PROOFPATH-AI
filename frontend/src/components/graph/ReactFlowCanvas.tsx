import React, { useState, useMemo, useCallback } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { FlowNode as AppFlowNode, FlowEdge as AppFlowEdge } from "@/types"
import { GoalNode } from "./nodes/GoalNode"
import { RequirementNode } from "./nodes/RequirementNode"
import { ClaimNode } from "./nodes/ClaimNode"
import { EvidenceNode } from "./nodes/EvidenceNode"
import { SourceNode } from "./nodes/SourceNode"
import { GapNode } from "./nodes/GapNode"
import { ContradictionNode } from "./nodes/ContradictionNode"
import { BlindSpotNode } from "./nodes/BlindSpotNode"
import { NodeDetailPanel } from "./NodeDetailPanel"
import { GraphToolbar, NodeCategoryFilter } from "./GraphToolbar"

// Register custom node types
const nodeTypes: NodeTypes = {
  goal: GoalNode,
  requirement: RequirementNode,
  claim: ClaimNode,
  evidence: EvidenceNode,
  source: SourceNode,
  gap: GapNode,
  contradiction: ContradictionNode,
  blindspot: BlindSpotNode,
}

interface ReactFlowCanvasProps {
  nodes: AppFlowNode[]
  edges: AppFlowEdge[]
}

const ReactFlowCanvasInner: React.FC<ReactFlowCanvasProps> = ({ nodes: initialNodes, edges: initialEdges }) => {
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<NodeCategoryFilter>("all")

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<NodeCategoryFilter, number> = {
      all: initialNodes.length,
      goal: 0,
      requirement: 0,
      claim: 0,
      evidence: 0,
      source: 0,
      gap: 0,
      contradiction: 0,
      blindspot: 0,
    }
    initialNodes.forEach((n) => {
      const type = n.data.node_type as NodeCategoryFilter
      if (counts[type] !== undefined) {
        counts[type] += 1
      }
    })
    return counts
  }, [initialNodes])

  // Compute connected nodes and edges when a node is selected
  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!selectedNodeId) {
      return { connectedNodeIds: new Set<string>(), connectedEdgeIds: new Set<string>() }
    }
    const nodeIds = new Set<string>([selectedNodeId])
    const edgeIds = new Set<string>()

    initialEdges.forEach((e) => {
      if (e.source === selectedNodeId) {
        edgeIds.add(e.id)
        nodeIds.add(e.target)
      } else if (e.target === selectedNodeId) {
        edgeIds.add(e.id)
        nodeIds.add(e.source)
      }
    })

    return { connectedNodeIds: nodeIds, connectedEdgeIds: edgeIds }
  }, [selectedNodeId, initialEdges])

  // Compute search matches
  const searchMatchedNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return null
    const query = searchQuery.toLowerCase().trim()
    const matches = new Set<string>()

    initialNodes.forEach((n) => {
      const label = (n.data.label || "").toLowerCase()
      const quote = (n.data.quote || "").toLowerCase()
      const sourceName = (n.data.source_name || "").toLowerCase()
      const meta = n.data.meta ? JSON.stringify(n.data.meta).toLowerCase() : ""

      if (
        label.includes(query) ||
        quote.includes(query) ||
        sourceName.includes(query) ||
        meta.includes(query)
      ) {
        matches.add(n.id)
      }
    })

    return matches
  }, [searchQuery, initialNodes])

  // Filter nodes by active category
  const filteredAppNodes = useMemo(() => {
    if (activeCategory === "all") return initialNodes
    return initialNodes.filter((n) => n.data.node_type === activeCategory)
  }, [initialNodes, activeCategory])

  const visibleNodeIds = useMemo(() => {
    return new Set(filteredAppNodes.map((n) => n.id))
  }, [filteredAppNodes])

  // Format React Flow Nodes with dynamic highlighting & dimming
  const formattedNodes: Node[] = useMemo(() => {
    return filteredAppNodes.map((n) => {
      const isSelected = selectedNodeId === n.id
      const isConnected = selectedNodeId ? connectedNodeIds.has(n.id) : false
      const isSearchMatch = searchMatchedNodeIds ? searchMatchedNodeIds.has(n.id) : false

      let isDimmed = false
      let isHighlighted = false

      if (selectedNodeId) {
        if (!connectedNodeIds.has(n.id)) {
          isDimmed = true
        } else if (isSelected || isConnected) {
          isHighlighted = true
        }
      } else if (searchMatchedNodeIds) {
        if (!isSearchMatch) {
          isDimmed = true
        } else {
          isHighlighted = true
        }
      }

      return {
        id: n.id,
        type: n.data.node_type || "default",
        position: n.position,
        data: {
          ...n.data,
          isDimmed,
          isHighlighted,
        },
        selected: isSelected,
      }
    })
  }, [filteredAppNodes, selectedNodeId, connectedNodeIds, searchMatchedNodeIds])

  // Format React Flow Edges with dynamic opacity & styling
  const formattedEdges: Edge[] = useMemo(() => {
    // Only include edges where both source and target are visible
    return initialEdges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => {
        const isConnected = selectedNodeId ? connectedEdgeIds.has(e.id) : false
        const isDimmed = selectedNodeId ? !isConnected : false

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: isConnected || e.animated,
          style: {
            ...e.style,
            opacity: isDimmed ? 0.15 : 1,
            strokeWidth: isConnected ? 2.5 : e.style?.strokeWidth || 1.5,
          },
          labelStyle: {
            fill: isDimmed ? "#94A3B8" : "#475569",
            fontSize: 10,
            fontWeight: 600,
          },
        }
      })
  }, [initialEdges, visibleNodeIds, selectedNodeId, connectedEdgeIds])

  const [nodes, , onNodesChange] = useNodesState(formattedNodes)
  const [edges, , onEdgesChange] = useEdgesState(formattedEdges)

  // Node selection handler
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  // Pane click to clear selection
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Selected node object for detail panel
  const selectedNodeObj = useMemo(() => {
    if (!selectedNodeId) return null
    return initialNodes.find((n) => n.id === selectedNodeId) || null
  }, [selectedNodeId, initialNodes])

  const handleReset = () => {
    setSelectedNodeId(null)
    setSearchQuery("")
    setActiveCategory("all")
    setTimeout(() => fitView({ duration: 500 }), 50)
  }

  return (
    <div className="w-full h-[760px] rounded-xl border border-slate-200 bg-white overflow-hidden relative shadow-card flex flex-col">
      {/* Interactive Toolbar */}
      <GraphToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categoryCounts={categoryCounts}
        onFitView={() => fitView({ duration: 500, padding: 0.2 })}
        onZoomIn={() => zoomIn({ duration: 300 })}
        onZoomOut={() => zoomOut({ duration: 300 })}
        onReset={handleReset}
        matchedCount={searchMatchedNodeIds ? searchMatchedNodeIds.size : undefined}
      />

      {/* Main Graph Area with Slide-Over Panel */}
      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={formattedNodes}
            edges={formattedEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            minZoom={0.15}
            maxZoom={2.0}
            defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#CBD5E1" />
            <Controls
              className="bg-white border border-slate-200 rounded-lg shadow-sm"
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case "goal":
                    return "#172B45"
                  case "requirement":
                    return "#64748B"
                  case "claim":
                    return "#3B82F6"
                  case "evidence":
                    return "#06B6D4"
                  case "source":
                    return "#8B5CF6"
                  case "gap":
                    return "#D97706"
                  case "contradiction":
                    return "#E11D48"
                  case "blindspot":
                    return "#6366F1"
                  default:
                    return "#CBD5E1"
                }
              }}
              className="border border-slate-200 rounded-lg shadow-xs"
              zoomable
              pannable
            />
          </ReactFlow>
        </div>

        {/* Side Panel Details Drawer */}
        {selectedNodeObj && (
          <NodeDetailPanel node={selectedNodeObj} onClose={() => setSelectedNodeId(null)} />
        )}
      </div>
    </div>
  )
}

export const ReactFlowCanvas: React.FC<ReactFlowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
