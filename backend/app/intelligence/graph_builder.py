from typing import List, Dict, Any
from app.schemas.evidence import FlowNode, FlowEdge, FlowNodeData, EvidenceGraphResponse


class GraphBuilder:
    @staticmethod
    def build_evidence_graph(
        session_title: str,
        research_goal: str,
        requirements: List[Any],
        sources: List[Any],
        evidence_links: List[Any],
        contradictions: List[Any]
    ) -> EvidenceGraphResponse:
        nodes: List[FlowNode] = []
        edges: List[FlowEdge] = []

        # 1. Root Goal Node
        goal_id = "node-goal"
        nodes.append(
            FlowNode(
                id=goal_id,
                type="input",
                position={"x": 500.0, "y": 50.0},
                data=FlowNodeData(
                    label=session_title or "Research Goal",
                    node_type="goal",
                    meta={"goal": research_goal}
                )
            )
        )

        # 2. Requirement Nodes (placed in an arc or row below goal)
        req_x_start = 100.0
        req_spacing = 300.0
        y_req = 220.0

        for idx, req in enumerate(requirements):
            req_id = f"node-req-{req.id}"
            pos_x = req_x_start + (idx * req_spacing)

            nodes.append(
                FlowNode(
                    id=req_id,
                    type="default",
                    position={"x": pos_x, "y": y_req},
                    data=FlowNodeData(
                        label=req.requirement_text[:45] + ("..." if len(req.requirement_text) > 45 else ""),
                        node_type="requirement",
                        status=req.status,
                        meta={"category": req.category, "full_text": req.requirement_text}
                    )
                )
            )

            # Edge from Goal to Requirement
            edges.append(
                FlowEdge(
                    id=f"edge-goal-req-{req.id}",
                    source=goal_id,
                    target=req_id,
                    animated=True,
                    style={"stroke": "#64748B", "strokeWidth": 2}
                )
            )

        # 3. Claims linked to requirements
        claim_y = 420.0
        added_claims = set()

        for link_idx, link in enumerate(evidence_links):
            claim = link.claim
            if not claim:
                continue

            claim_node_id = f"node-claim-{claim.id}"

            if claim.id not in added_claims:
                # Approximate horizontal position from requirement or counter
                pos_x = 80.0 + (len(added_claims) * 220.0)
                nodes.append(
                    FlowNode(
                        id=claim_node_id,
                        type="default",
                        position={"x": pos_x, "y": claim_y},
                        data=FlowNodeData(
                            label=claim.claim_text[:40] + ("..." if len(claim.claim_text) > 40 else ""),
                            node_type="claim",
                            quote=claim.exact_quote,
                            meta={"type": claim.claim_type, "date": claim.date_reference}
                        )
                    )
                )
                added_claims.add(claim.id)

            # Edge from Requirement to Claim
            edge_color = "#10B981" if link.relation_type == "supports" else "#DC2626"
            edges.append(
                FlowEdge(
                    id=f"edge-req-claim-{link.id}",
                    source=f"node-req-{link.requirement_id}",
                    target=claim_node_id,
                    label=link.relation_type,
                    style={"stroke": edge_color, "strokeWidth": 1.5}
                )
            )

        # 4. Contradiction Edges between Claims
        for c_idx, conflict in enumerate(contradictions):
            claim_a_node = f"node-claim-{conflict.claim_a_id}"
            claim_b_node = f"node-claim-{conflict.claim_b_id}"

            # If both claims exist as nodes, connect them with a red conflict edge
            if conflict.claim_a_id in added_claims and conflict.claim_b_id in added_claims:
                edges.append(
                    FlowEdge(
                        id=f"edge-conflict-{conflict.id}",
                        source=claim_a_node,
                        target=claim_b_node,
                        label=f"CONFLICT ({conflict.severity.upper()})",
                        animated=True,
                        style={"stroke": "#DC2626", "strokeWidth": 2.5, "strokeDasharray": "5,5"}
                    )
                )

        return EvidenceGraphResponse(nodes=nodes, edges=edges)
