import asyncio
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import (
    ResearchSession,
    Source,
    DocumentChunk,
    Requirement,
    AtomicClaim,
    EvidenceLink,
    Contradiction,
    BlindSpot,
    AuditLog,
)
from app.services.event_stream import sse_manager
from app.intelligence.vector_store import FAISSVectorStore
from app.intelligence.claim_matcher import ClaimMatcher
from app.intelligence.scoring import DecisionReadinessScorer
from app.agents.research_planner import ResearchPlannerAgent
from app.agents.claim_extractor import ClaimExtractorAgent
from app.agents.contradiction_analyzer import ContradictionAnalyzerAgent
from app.agents.gap_detector import GapDetectorAgent
from app.agents.blindspot_discovery import BlindSpotDiscoveryAgent
from app.agents.evidence_evaluator import EvidenceEvaluatorAgent

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    def __init__(self, db: Session, session_id: str):
        self.db = db
        self.session_id = session_id
        self.vector_store = FAISSVectorStore()

    async def _log_and_broadcast(self, stage: str, progress: int, message: str, data: Any = None):
        logger.info(f"[{self.session_id}] ({progress}%) {stage}: {message}")
        log_entry = AuditLog(
            session_id=self.session_id,
            stage=stage,
            progress_percent=progress,
            message=message
        )
        self.db.add(log_entry)
        self.db.commit()

        await sse_manager.broadcast(
            session_id=self.session_id,
            stage=stage,
            progress=progress,
            message=message,
            data=data,
            event_type="progress"
        )

    async def run(self) -> None:
        session = self.db.query(ResearchSession).filter(ResearchSession.id == self.session_id).first()
        if not session:
            logger.error(f"Session {self.session_id} not found.")
            return

        try:
            session.status = "processing"
            self.db.commit()

            # STAGE 1: Check sources & Index
            await self._log_and_broadcast("INITIALIZING", 5, "Preparing investigation workspace and sources...")
            sources = self.db.query(Source).filter(Source.session_id == self.session_id).all()
            if not sources:
                await self._log_and_broadcast("ERROR", 100, "No sources found. Please upload at least one URL, PDF or text document.")
                session.status = "failed"
                self.db.commit()
                return

            # Collect all chunks from sources
            all_chunks = self.db.query(DocumentChunk).join(Source).filter(Source.session_id == self.session_id).all()
            if not all_chunks:
                await self._log_and_broadcast("ERROR", 100, "No textual chunks could be extracted from provided sources.")
                session.status = "failed"
                self.db.commit()
                return

            # Index chunks in FAISS
            chunk_texts = [c.text_content for c in all_chunks]
            chunk_metas = [{"chunk_id": c.id, "source_id": c.source_id, "page": c.page_number} for c in all_chunks]
            self.vector_store.add_documents(chunk_texts, chunk_metas)

            await self._log_and_broadcast(
                "INGESTION_COMPLETE",
                20,
                f"Successfully indexed {len(all_chunks)} chunks across {len(sources)} sources.",
                {"sources_count": len(sources), "chunks_count": len(all_chunks)}
            )

            # STAGE 2: Research Planning & Goal Decomposition
            await self._log_and_broadcast("RESEARCH_PLANNING", 30, "Decomposing research goal into MECE evaluation criteria...")
            planner = ResearchPlannerAgent()
            decomposed_reqs = await planner.decompose_goal(
                goal=session.research_goal,
                target_decision=session.target_decision or ""
            )

            # Clear any existing requirements for idempotency
            self.db.query(Requirement).filter(Requirement.session_id == self.session_id).delete()
            created_reqs: List[Requirement] = []
            for idx, r_data in enumerate(decomposed_reqs):
                req = Requirement(
                    session_id=self.session_id,
                    requirement_text=r_data["requirement_text"],
                    category=r_data.get("category", "functional"),
                    weight=float(r_data.get("weight", 1.0)),
                    status="uncovered",
                    order_index=idx
                )
                self.db.add(req)
                created_reqs.append(req)
            self.db.commit()

            await self._log_and_broadcast(
                "PLANNING_COMPLETE",
                45,
                f"Established {len(created_reqs)} evaluation criteria across categories.",
                {"requirements": [r.requirement_text for r in created_reqs]}
            )

            # STAGE 3: Atomic Claim Extraction
            await self._log_and_broadcast("CLAIM_EXTRACTION", 55, "Extracting atomic claims and verifying quotes against source text...")
            claim_agent = ClaimExtractorAgent()
            created_claims: List[AtomicClaim] = []

            for chunk in all_chunks:
                source_title = chunk.source.title if chunk.source else ""
                claims_data = await claim_agent.extract_claims(chunk.text_content, source_title)
                for cd in claims_data:
                    claim = AtomicClaim(
                        chunk_id=chunk.id,
                        claim_text=cd["claim_text"],
                        exact_quote=cd["exact_quote"],
                        claim_type=cd.get("claim_type", "assertion"),
                        date_reference=cd.get("date_reference"),
                        confidence_score=float(cd.get("confidence_score", 0.9)),
                        is_verified=bool(cd.get("is_verified", False))
                    )
                    self.db.add(claim)
                    created_claims.append(claim)

            self.db.commit()
            await self._log_and_broadcast(
                "CLAIMS_EXTRACTED",
                65,
                f"Extracted {len(created_claims)} verifiable atomic claims.",
                {"claims_count": len(created_claims)}
            )

            # STAGE 4: Semantic Evidence Mapping
            await self._log_and_broadcast("EVIDENCE_MAPPING", 72, "Mapping atomic claims to evaluation criteria...")
            evaluator = EvidenceEvaluatorAgent()
            claims_dict_list = [
                {
                    "id": c.id,
                    "claim_text": c.claim_text,
                    "exact_quote": c.exact_quote,
                    "source_id": c.chunk.source_id if c.chunk else "",
                    "source_title": c.chunk.source.title if c.chunk and c.chunk.source else "",
                    "date_reference": c.date_reference
                }
                for c in created_claims
            ]

            evidence_counts = {r.id: 0 for r in created_reqs}
            claims_per_req: Dict[str, List[Dict[str, Any]]] = {r.id: [] for r in created_reqs}

            for req in created_reqs:
                matched = ClaimMatcher.match_claims_to_requirement(
                    requirement_text=req.requirement_text,
                    claims=claims_dict_list,
                    similarity_threshold=0.30,
                    top_k=6
                )
                evidence_counts[req.id] = len(matched)

                for claim_dict, sim_score in matched:
                    eval_result = await evaluator.evaluate_relation(
                        requirement_text=req.requirement_text,
                        claim_text=claim_dict["claim_text"],
                        exact_quote=claim_dict.get("exact_quote", "")
                    )
                    link = EvidenceLink(
                        requirement_id=req.id,
                        claim_id=claim_dict["id"],
                        relation_type=eval_result["relation_type"],
                        relevance_rationale=eval_result["relevance_rationale"],
                        similarity_score=sim_score
                    )
                    self.db.add(link)
                    claims_per_req[req.id].append(claim_dict)

                if len(matched) >= 2:
                    req.status = "covered"
                elif len(matched) == 1:
                    req.status = "partial"
                else:
                    req.status = "uncovered"

            self.db.commit()

            # STAGE 5: Contradiction & Conflict Analysis
            await self._log_and_broadcast("CONTRADICTION_ANALYSIS", 80, "Cross-examining claims for contradictions and metric discrepancies...")
            conflict_agent = ContradictionAnalyzerAgent()
            all_conflicts = []

            for req in created_reqs:
                req_claims = claims_per_req.get(req.id, [])
                if len(req_claims) >= 2:
                    detected_conflicts = await conflict_agent.analyze_conflicts(
                        requirement_text=req.requirement_text,
                        claims=req_claims
                    )
                    for dc in detected_conflicts:
                        conflict = Contradiction(
                            session_id=self.session_id,
                            requirement_id=req.id,
                            claim_a_id=dc["claim_a_id"],
                            claim_b_id=dc["claim_b_id"],
                            severity=dc.get("severity", "medium"),
                            conflicting_aspect=dc.get("conflicting_aspect", "Conflicting metrics or limits"),
                            synthesis_verdict=dc.get("synthesis_verdict", "Divergent claims across sources")
                        )
                        self.db.add(conflict)
                        all_conflicts.append(conflict)
                        req.status = "conflict"

            self.db.commit()
            await self._log_and_broadcast(
                "CONFLICTS_AUDITED",
                86,
                f"Audit identified {len(all_conflicts)} cross-source contradictions.",
                {"conflicts_count": len(all_conflicts)}
            )

            # STAGE 6: BlindSpot Discovery & Gaps
            await self._log_and_broadcast("BLINDSPOT_DISCOVERY", 92, "Formulating unasked questions and counter-factual risk vectors...")
            blindspot_agent = BlindSpotDiscoveryAgent()
            discovered_blindspots = await blindspot_agent.discover_blindspots(
                goal=session.research_goal,
                target_decision=session.target_decision or "",
                covered_requirements=[r.requirement_text for r in created_reqs]
            )

            for b in discovered_blindspots:
                spot = BlindSpot(
                    session_id=self.session_id,
                    question=b["question"],
                    rationale=b["rationale"],
                    risk_level=b.get("risk_level", "medium"),
                    category=b.get("category", "unaddressed_risk"),
                    is_resolved=False
                )
                self.db.add(spot)

            self.db.commit()

            # STAGE 7: Decision-Readiness Scoring
            await self._log_and_broadcast("SCORING", 96, "Calculating deterministic 4-factor Decision-Readiness Index...")
            score_results = DecisionReadinessScorer.calculate_readiness(
                requirements=created_reqs,
                contradictions=all_conflicts,
                sources=sources,
                claims=created_claims
            )

            tier, recommendation = DecisionReadinessScorer.get_readiness_tier(score_results["readiness_score"])

            session.readiness_score = score_results["readiness_score"]
            session.coverage_score = score_results["coverage_score"]
            session.consistency_score = score_results["consistency_score"]
            session.freshness_score = score_results["freshness_score"]
            session.verification_score = score_results["verification_score"]
            session.executive_verdict = f"{tier}: {recommendation}"
            session.status = "completed"
            self.db.commit()

            await self._log_and_broadcast(
                "COMPLETE",
                100,
                f"Investigation complete. Decision Readiness Index: {session.readiness_score}%. Verdict: {tier}",
                {
                    "readiness_score": session.readiness_score,
                    "tier": tier,
                    "recommendation": recommendation
                }
            )

        except Exception as e:
            logger.exception(f"Pipeline failed for session {self.session_id}: {e}")
            session.status = "failed"
            self.db.commit()
            await self._log_and_broadcast("ERROR", -1, f"Investigation encountered an error: {str(e)}")
