import React from "react"
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
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { FlowNode, FlowEdge } from "@/types"

interface ReactFlowCanvasProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export const ReactFlowCanvas: React.FC<ReactFlowCanvasProps> = ({ nodes: initialNodes, edges: initialEdges }) => {
  // Convert flow nodes to ReactFlow format
  const formattedNodes: Node[] = initialNodes.map((n) => ({
    id: n.id,
    position: n.position,
    data: { label: n.data.label },
    style: {
      background: n.data.node_type === "goal" ? "#0F172A" : n.data.node_type === "requirement" ? "#FFFFFF" : "#F8FAFC",
      color: n.data.node_type === "goal" ? "#FFFFFF" : "#0F172A",
      border: n.data.status === "conflict" ? "2px solid #DC2626" : n.data.status === "covered" ? "1.5px solid #10B981" : "1px solid #CBD5E1",
      borderRadius: "10px",
      padding: "10px 14px",
      fontSize: "12px",
      fontWeight: n.data.node_type === "goal" ? "600" : "500",
      width: n.data.node_type === "goal" ? 240 : 200,
      boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
    },
  }))

  const formattedEdges: Edge[] = initialEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.animated,
    style: e.style || { stroke: "#64748B", strokeWidth: 1.5 },
    labelStyle: { fill: "#475569", fontSize: 10, fontWeight: 600 },
  }))

  const [nodes, , onNodesChange] = useNodesState(formattedNodes)
  const [edges, , onEdgesChange] = useEdgesState(formattedEdges)

  return (
    <div className="w-full h-[620px] rounded-xl border border-slate-200 bg-white overflow-hidden relative shadow-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#E2E8F0" />
        <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
        <MiniMap
          nodeColor={(node) => {
            if (node.style?.background) return node.style.background as string
            return "#E2E8F0"
          }}
          className="border border-slate-200 rounded-lg"
        />
      </ReactFlow>
    </div>
  )
}
