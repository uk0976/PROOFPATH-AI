from typing import List, Dict, Any, Optional
from app.schemas.evidence import FlowNode, FlowEdge, FlowNodeData, EvidenceGraphResponse


class GraphBuilder:
    @staticmethod
    def build_evidence_graph(
        session_title: str,
        research_goal: str,
        requirements: List[Any],
        sources: List[Any],
        evidence_links: List[Any],
        contradictions: List[Any],
        blindspots: Optional[List[Any]] = None,
        session: Optional[Any] = None
    ) -> EvidenceGraphResponse:
        """
        Builds a complete, authentic React Flow knowledge graph representing all 8 node types:
        1. Research Goal (root)
        2. Requirement
        3. Claim
        4. Evidence (passage & chunk provenance)
        5. Source (document/url metadata)
        6. Information Gap (unaddressed criteria)
        7. Contradiction (cross-source conflicts)
        8. BlindSpot Question (unasked strategic inquiries)
        """
        nodes: List[FlowNode] = []
        edges: List[FlowEdge] = []

        # -------------------------------------------------------------
        # 1. ROOT GOAL NODE
        # -------------------------------------------------------------
        goal_id = "node-goal"
        readiness = getattr(session, "readiness_score", 0.0) if session else 0.0
        target_decision = getattr(session, "target_decision", "") if session else ""
        nodes.append(
            FlowNode(
                id=goal_id,
                type="goal",
                position={"x": 680.0, "y": 40.0},
                data=FlowNodeData(
                    label=session_title or "Research Goal",
                    node_type="goal",
                    status=getattr(session, "status", "active") if session else "active",
                    meta={
                        "research_goal": research_goal,
                        "target_decision": target_decision,
                        "readiness_score": readiness,
                        "coverage_score": getattr(session, "coverage_score", 0.0) if session else 0.0,
                        "consistency_score": getattr(session, "consistency_score", 0.0) if session else 0.0,
                        "freshness_score": getattr(session, "freshness_score", 0.0) if session else 0.0,
                        "verification_score": getattr(session, "verification_score", 0.0) if session else 0.0,
                        "executive_verdict": getattr(session, "executive_verdict", "") if session else "",
                    }
                )
            )
        )

        # -------------------------------------------------------------
        # 2. BLINDSPOT QUESTION NODES (Attached to Goal)
        # -------------------------------------------------------------
        if blindspots:
            for b_idx, bs in enumerate(blindspots[:5]):  # Up to 5 most critical blindspots
                bs_id = f"node-blindspot-{bs.id}"
                bs_x = 1180.0 + (b_idx % 2) * 280.0
                bs_y = 40.0 + (b_idx * 130.0)
                nodes.append(
                    FlowNode(
                        id=bs_id,
                        type="blindspot",
                        position={"x": bs_x, "y": bs_y},
                        data=FlowNodeData(
                            label=bs.question[:55] + ("..." if len(bs.question) > 55 else ""),
                            node_type="blindspot",
                            severity=bs.risk_level,
                            status="unasked",
                            meta={
                                "question": bs.question,
                                "rationale": bs.rationale,
                                "risk_level": bs.risk_level,
                                "category": bs.category,
                                "is_resolved": getattr(bs, "is_resolved", False),
                            }
                        )
                    )
                )
                edges.append(
                    FlowEdge(
                        id=f"edge-goal-blindspot-{bs.id}",
                        source=goal_id,
                        target=bs_id,
                        label="unasked inquiry",
                        animated=False,
                        style={"stroke": "#6366F1", "strokeWidth": 1.5, "strokeDasharray": "4,4"}
                    )
                )

        # -------------------------------------------------------------
        # 3. REQUIREMENT NODES & INFORMATION GAPS
        # -------------------------------------------------------------
        req_x_start = 80.0
        req_spacing = 340.0
        y_req = 240.0

        for r_idx, req in enumerate(requirements):
            req_id = f"node-req-{req.id}"
            pos_x = req_x_start + (r_idx * req_spacing)

            nodes.append(
                FlowNode(
                    id=req_id,
                    type="requirement",
                    position={"x": pos_x, "y": y_req},
                    data=FlowNodeData(
                        label=req.requirement_text[:50] + ("..." if len(req.requirement_text) > 50 else ""),
                        node_type="requirement",
                        status=req.status,
                        meta={
                            "category": req.category,
                            "full_text": req.requirement_text,
                            "weight": getattr(req, "weight", 1.0),
                            "order_index": getattr(req, "order_index", r_idx),
                            "status": req.status
                        }
                    )
                )
            )

            # Edge from Goal to Requirement
            edges.append(
                FlowEdge(
                    id=f"edge-goal-req-{req.id}",
                    source=goal_id,
                    target=req_id,
                    label="decomposes into",
                    animated=False,
                    style={"stroke": "#475569", "strokeWidth": 2}
                )
            )

            # If Requirement is unaddressed or partial, create an Information Gap node
            if req.status in ["unaddressed", "uncovered", "partial"]:
                gap_id = f"node-gap-{req.id}"
                gap_x = pos_x + 30.0
                gap_y = y_req + 150.0

                nodes.append(
                    FlowNode(
                        id=gap_id,
                        type="gap",
                        position={"x": gap_x, "y": gap_y},
                        data=FlowNodeData(
                            label=f"Gap: {req.requirement_text[:40]}...",
                            node_type="gap",
                            severity="high" if getattr(req, "weight", 1.0) >= 1.5 else "medium",
                            status="unresolved",
                            meta={
                                "missing_explanation": (
                                    f"Missing empirical evidence for requirement: '{req.requirement_text}'. "
                                    f"No source provides conclusive verification for this criterion."
                                ),
                                "related_requirement_id": req.id,
                                "related_requirement_text": req.requirement_text,
                                "category": req.category,
                                "suggested_action": f"Ingest additional documentation specifically addressing '{req.category}'."
                            }
                        )
                    )
                )

                edges.append(
                    FlowEdge(
                        id=f"edge-req-gap-{req.id}",
                        source=req_id,
                        target=gap_id,
                        label="unaddressed gap",
                        animated=True,
                        style={"stroke": "#C28A32", "strokeWidth": 2, "strokeDasharray": "5,5"}
                    )
                )

        # -------------------------------------------------------------
        # 4. CLAIMS, EVIDENCE PASSAGES & SOURCES
        # -------------------------------------------------------------
        y_claim = 480.0
        y_evidence = 700.0
        y_source = 920.0

        added_claims = set()
        added_evidence = set()
        added_sources = set()

        for link_idx, link in enumerate(evidence_links):
            claim = link.claim
            if not claim:
                continue

            claim_node_id = f"node-claim-{claim.id}"
            chunk = getattr(claim, "chunk", None)
            source = getattr(chunk, "source", None) if chunk else None

            # Calculate X position based on claim count
            claim_pos_x = 80.0 + (len(added_claims) * 290.0)

            # 4a. Claim Node
            if claim.id not in added_claims:
                nodes.append(
                    FlowNode(
                        id=claim_node_id,
                        type="claim",
                        position={"x": claim_pos_x, "y": y_claim},
                        data=FlowNodeData(
                            label=claim.claim_text[:50] + ("..." if len(claim.claim_text) > 50 else ""),
                            node_type="claim",
                            quote=claim.exact_quote,
                            status="verified" if getattr(claim, "is_verified", False) else "extracted",
                            source_name=source.title if source else "Source",
                            page=getattr(chunk, "page_number", 1) if chunk else 1,
                            meta={
                                "full_claim": claim.claim_text,
                                "exact_quote": claim.exact_quote,
                                "claim_type": claim.claim_type,
                                "date_reference": claim.date_reference,
                                "confidence_score": claim.confidence_score,
                                "is_verified": getattr(claim, "is_verified", False),
                                "source_title": source.title if source else "Source",
                                "source_id": source.id if source else ""
                            }
                        )
                    )
                )
                added_claims.add(claim.id)

            # Edge from Requirement to Claim
            req_edge_color = "#23865B" if link.relation_type == "supports" else "#C65353"
            edges.append(
                FlowEdge(
                    id=f"edge-req-claim-{link.id}",
                    source=f"node-req-{link.requirement_id}",
                    target=claim_node_id,
                    label=link.relation_type,
                    style={"stroke": req_edge_color, "strokeWidth": 1.5}
                )
            )

            # 4b. Evidence Node (Passage & Chunk Provenance)
            evidence_node_id = f"node-evidence-{claim.id}"
            if claim.id not in added_evidence:
                page_num = getattr(chunk, "page_number", 1) if chunk else 1
                passage = getattr(chunk, "chunk_text", claim.exact_quote) if chunk else claim.exact_quote
                char_start = getattr(chunk, "char_offset_start", 0) if chunk else 0
                char_end = getattr(chunk, "char_offset_end", len(passage)) if chunk else len(passage)

                nodes.append(
                    FlowNode(
                        id=evidence_node_id,
                        type="evidence",
                        position={"x": claim_pos_x, "y": y_evidence},
                        data=FlowNodeData(
                            label=f"Passage (p. {page_num or 1})",
                            node_type="evidence",
                            quote=claim.exact_quote,
                            source_name=source.title if source else "Source Document",
                            page=page_num,
                            meta={
                                "passage": passage,
                                "location": f"Page {page_num or 1}, Chars {char_start}-{char_end}",
                                "chunk_id": str(getattr(chunk, "id", ""))[:8],
                                "exact_quote": claim.exact_quote,
                                "source_title": source.title if source else "Source Document",
                                "source_id": source.id if source else ""
                            }
                        )
                    )
                )
                added_evidence.add(claim.id)

                # Edge from Claim to Evidence passage
                edges.append(
                    FlowEdge(
                        id=f"edge-claim-evidence-{claim.id}",
                        source=claim_node_id,
                        target=evidence_node_id,
                        label="substantiated by",
                        style={"stroke": "#315B83", "strokeWidth": 1.5}
                    )
                )

            # 4c. Source Node
            if source and source.id not in added_sources:
                source_node_id = f"node-source-{source.id}"
                source_pos_x = 100.0 + (len(added_sources) * 360.0)

                nodes.append(
                    FlowNode(
                        id=source_node_id,
                        type="source",
                        position={"x": source_pos_x, "y": y_source},
                        data=FlowNodeData(
                            label=source.title[:45] + ("..." if len(source.title) > 45 else ""),
                            node_type="source",
                            status="ingested",
                            source_name=source.title,
                            url=source.uri,
                            meta={
                                "source_type": source.source_type,
                                "uri": source.uri,
                                "author": getattr(source, "author_or_publisher", "Unknown Author") or "Unknown Author",
                                "publication_date": str(source.publication_date) if getattr(source, "publication_date", None) else "Undated",
                                "chunk_count": len(getattr(source, "chunks", [])) if hasattr(source, "chunks") and source.chunks else 0,
                                "reliability_score": 0.95,
                                "id": source.id
                            }
                        )
                    )
                )
                added_sources.add(source.id)

            # Edge from Evidence to Source
            if source:
                source_node_id = f"node-source-{source.id}"
                edge_ev_src_id = f"edge-evidence-source-{claim.id}-{source.id}"
                if not any(e.id == edge_ev_src_id for e in edges):
                    edges.append(
                        FlowEdge(
                            id=edge_ev_src_id,
                            source=evidence_node_id,
                            target=source_node_id,
                            label="extracted from",
                            style={"stroke": "#94A3B8", "strokeWidth": 1.5}
                        )
                    )

        # Ensure any sources not yet linked to an evidence claim still appear in the graph
        for s in sources:
            if s.id not in added_sources:
                source_node_id = f"node-source-{s.id}"
                source_pos_x = 100.0 + (len(added_sources) * 360.0)
                nodes.append(
                    FlowNode(
                        id=source_node_id,
                        type="source",
                        position={"x": source_pos_x, "y": y_source},
                        data=FlowNodeData(
                            label=s.title[:45] + ("..." if len(s.title) > 45 else ""),
                            node_type="source",
                            status="ingested",
                            source_name=s.title,
                            url=s.uri,
                            meta={
                                "source_type": s.source_type,
                                "uri": s.uri,
                                "author": getattr(s, "author_or_publisher", "Unknown Author") or "Unknown Author",
                                "publication_date": str(s.publication_date) if getattr(s, "publication_date", None) else "Undated",
                                "chunk_count": len(getattr(s, "chunks", [])) if hasattr(s, "chunks") and s.chunks else 0,
                                "reliability_score": 0.95,
                                "id": s.id
                            }
                        )
                    )
                )
                added_sources.add(s.id)

        # -------------------------------------------------------------
        # 5. CONTRADICTION NODES
        # -------------------------------------------------------------
        for c_idx, conflict in enumerate(contradictions):
            conflict_node_id = f"node-contradiction-{conflict.id}"
            pos_x = 180.0 + (c_idx * 320.0)
            pos_y = 600.0

            claim_a = getattr(conflict, "claim_a", None)
            claim_b = getattr(conflict, "claim_b", None)
            source_a_title = claim_a.chunk.source.title if claim_a and getattr(claim_a, "chunk", None) and getattr(claim_a.chunk, "source", None) else "Source A"
            source_b_title = claim_b.chunk.source.title if claim_b and getattr(claim_b, "chunk", None) and getattr(claim_b.chunk, "source", None) else "Source B"

            nodes.append(
                FlowNode(
                    id=conflict_node_id,
                    type="contradiction",
                    position={"x": pos_x, "y": pos_y},
                    data=FlowNodeData(
                        label=f"Conflict: {conflict.conflicting_aspect[:35]}...",
                        node_type="contradiction",
                        severity=conflict.severity,
                        status="conflict",
                        meta={
                            "conflicting_aspect": conflict.conflicting_aspect,
                            "severity": conflict.severity,
                            "synthesis_verdict": conflict.synthesis_verdict or "Cross-source factual discrepancy detected.",
                            "claim_a_id": conflict.claim_a_id,
                            "claim_b_id": conflict.claim_b_id,
                            "claim_a_text": claim_a.claim_text if claim_a else "",
                            "claim_a_quote": claim_a.exact_quote if claim_a else "",
                            "claim_a_source": source_a_title,
                            "claim_b_text": claim_b.claim_text if claim_b else "",
                            "claim_b_quote": claim_b.exact_quote if claim_b else "",
                            "claim_b_source": source_b_title,
                        }
                    )
                )
            )

            # Edge from Claim A -> Contradiction Node
            if conflict.claim_a_id in added_claims:
                edges.append(
                    FlowEdge(
                        id=f"edge-conflict-a-{conflict.id}",
                        source=f"node-claim-{conflict.claim_a_id}",
                        target=conflict_node_id,
                        label="conflicts with",
                        animated=True,
                        style={"stroke": "#C65353", "strokeWidth": 2}
                    )
                )

            # Edge from Contradiction Node -> Claim B
            if conflict.claim_b_id in added_claims:
                edges.append(
                    FlowEdge(
                        id=f"edge-conflict-b-{conflict.id}",
                        source=conflict_node_id,
                        target=f"node-claim-{conflict.claim_b_id}",
                        label="contradicts",
                        animated=True,
                        style={"stroke": "#C65353", "strokeWidth": 2}
                    )
                )

        return EvidenceGraphResponse(nodes=nodes, edges=edges)
