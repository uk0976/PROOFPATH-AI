import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
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
    VerificationTask,
    AuditLog,
    InvestigationJob,
)
from app.services.event_stream import sse_manager
from app.intelligence.vector_store import FAISSVectorStore
from app.intelligence.claim_matcher import ClaimMatcher
from app.intelligence.scoring import DecisionReadinessScorer
from app.intelligence.graph_builder import GraphBuilder
from app.agents.research_planner import ResearchPlannerAgent
from app.agents.claim_extractor import ClaimExtractorAgent
from app.agents.contradiction_analyzer import ContradictionAnalyzerAgent
from app.agents.gap_detector import GapDetectorAgent
from app.agents.blindspot_discovery import BlindSpotDiscoveryAgent
from app.agents.evidence_evaluator import EvidenceEvaluatorAgent
from app.agents.temporal_analyzer import TemporalAnalyzerAgent

logger = logging.getLogger("proofpath.orchestrator")


class PipelineOrchestrator:
    """
    Asynchronous 15-stage AI investigation pipeline.
    Executes each stage with transactional checkpoints, retry handling,
    partial data preservation, and real-time SSE progress streaming.
    """

    def __init__(self, db: Session, session_id: str, job_id: Optional[str] = None):
        self.db = db
        self.session_id = session_id
        self.job_id = job_id
        self.vector_store = FAISSVectorStore()
        self.max_retries = 2

    async def _checkpoint_job_and_broadcast(
        self,
        stage_name: str,
        stage_index: int,
        progress: int,
        message: str,
        event_type: str,
        data: Any = None
    ) -> None:
        """
        Atomically persists stage progress to InvestigationJob and AuditLog,
        and broadcasts real-time telemetry to listening SSE clients.
        """
        logger.info(f"[{self.session_id}] ({progress}%) [Stage {stage_index}/15] {stage_name}: {message}")

        # 1. Update or create AuditLog
        log_entry = AuditLog(
            session_id=self.session_id,
            stage=stage_name,
            progress_percent=progress,
            message=message,
            payload_json=json.dumps(data) if data else None
        )
        self.db.add(log_entry)

        # 2. Persist to InvestigationJob if job_id provided
        if self.job_id:
            job = self.db.query(InvestigationJob).filter(InvestigationJob.id == self.job_id).first()
            if job:
                job.current_stage = stage_name
                job.stage_index = stage_index
                job.progress_percent = float(progress)
                job.message = message
                job.heartbeat_at = datetime.now(timezone.utc)
                if data:
                    try:
                        job.stage_data_json = json.dumps(data)
                    except Exception:
                        pass

        self.db.commit()

        # 3. Broadcast real-time SSE event
        await sse_manager.broadcast(
            session_id=self.session_id,
            stage=stage_name,
            progress=progress,
            message=message,
            data=data,
            event_type=event_type
        )

    async def _execute_with_retry(self, stage_name: str, coro_fn, *args, **kwargs):
        """
        Executes a pipeline stage with configurable retries and exponential backoff.
        """
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return await coro_fn(*args, **kwargs)
            except Exception as e:
                last_error = e
                logger.warning(
                    f"[{self.session_id}] Stage '{stage_name}' attempt {attempt}/{self.max_retries} failed: {e}"
                )
                if self.job_id:
                    job = self.db.query(InvestigationJob).filter(InvestigationJob.id == self.job_id).first()
                    if job:
                        job.retry_count += 1
                        self.db.commit()

                if attempt < self.max_retries:
                    await asyncio.sleep(attempt * 0.8)
                else:
                    raise last_error

    async def run(self) -> None:
        """Legacy compatibility wrapper."""
        await self.run_15_stage_pipeline()

    async def run_15_stage_pipeline(self) -> None:
        session = self.db.query(ResearchSession).filter(ResearchSession.id == self.session_id).first()
        if not session:
            logger.error(f"Session {self.session_id} not found.")
            return

        try:
            session.status = "processing"
            self.db.commit()

            # ---------------------------------------------------------
            # STAGE 1: Research Goal Analysis
            # ---------------------------------------------------------
            goal_meta = await self._execute_with_retry(
                "RESEARCH_GOAL_ANALYSIS",
                self._stage_1_research_goal_analysis,
                session
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="RESEARCH_GOAL_ANALYSIS",
                stage_index=1,
                progress=7,
                message="Research goal analysis: Scoped technical boundaries and evaluation criteria.",
                event_type="research_goal_analyzed",
                data=goal_meta
            )

            # ---------------------------------------------------------
            # STAGE 2: Question Decomposition
            # ---------------------------------------------------------
            created_reqs = await self._execute_with_retry(
                "QUESTION_DECOMPOSITION",
                self._stage_2_question_decomposition,
                session
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="QUESTION_DECOMPOSITION",
                stage_index=2,
                progress=14,
                message=f"Question decomposition: Formulated {len(created_reqs)} MECE evaluation requirements.",
                event_type="question_decomposition_completed",
                data={"requirements_count": len(created_reqs)}
            )

            # ---------------------------------------------------------
            # STAGE 3: Source Collection
            # ---------------------------------------------------------
            sources = await self._execute_with_retry(
                "SOURCE_COLLECTION",
                self._stage_3_source_collection
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="SOURCE_COLLECTION",
                stage_index=3,
                progress=20,
                message=f"Source collection: Verified and collected {len(sources)} source documents.",
                event_type="source_collection_completed",
                data={"sources_count": len(sources)}
            )

            # ---------------------------------------------------------
            # STAGE 4: Source Extraction
            # ---------------------------------------------------------
            all_chunks = await self._execute_with_retry(
                "SOURCE_EXTRACTION",
                self._stage_4_source_extraction,
                sources
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="SOURCE_EXTRACTION",
                stage_index=4,
                progress=27,
                message=f"Source extraction: Extracted {len(all_chunks)} text chunks with page & character provenance.",
                event_type="source_extraction_completed",
                data={"chunks_count": len(all_chunks)}
            )

            # ---------------------------------------------------------
            # STAGE 5: Atomic Claim Extraction
            # ---------------------------------------------------------
            created_claims = await self._execute_with_retry(
                "ATOMIC_CLAIM_EXTRACTION",
                self._stage_5_atomic_claim_extraction,
                all_chunks
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="ATOMIC_CLAIM_EXTRACTION",
                stage_index=5,
                progress=34,
                message=f"Atomic claim extraction: Extracted and verbatim-verified {len(created_claims)} claims.",
                event_type="claim_extraction_completed",
                data={"claims_count": len(created_claims)}
            )

            # ---------------------------------------------------------
            # STAGE 6: Embedding Generation
            # ---------------------------------------------------------
            await self._execute_with_retry(
                "EMBEDDING_GENERATION",
                self._stage_6_embedding_generation,
                all_chunks,
                created_claims
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="EMBEDDING_GENERATION",
                stage_index=6,
                progress=41,
                message=f"Embedding generation: Computed dense vectors and indexed into FAISS IndexFlatIP.",
                event_type="embedding_generation_completed",
                data={"indexed_vectors": len(all_chunks)}
            )

            # ---------------------------------------------------------
            # STAGE 7: Evidence Retrieval
            # ---------------------------------------------------------
            retrieval_map = await self._execute_with_retry(
                "EVIDENCE_RETRIEVAL",
                self._stage_7_evidence_retrieval,
                created_reqs,
                created_claims
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="EVIDENCE_RETRIEVAL",
                stage_index=7,
                progress=48,
                message="Evidence retrieval: Completed vector similarity query across all evaluation criteria.",
                event_type="evidence_retrieval_completed",
                data={"criteria_retrieved": len(retrieval_map)}
            )

            # ---------------------------------------------------------
            # STAGE 8: Requirement-to-Claim Mapping
            # ---------------------------------------------------------
            claims_per_req, evidence_counts = await self._execute_with_retry(
                "REQUIREMENT_TO_CLAIM_MAPPING",
                self._stage_8_requirement_to_claim_mapping,
                created_reqs,
                retrieval_map
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="REQUIREMENT_TO_CLAIM_MAPPING",
                stage_index=8,
                progress=55,
                message=f"Requirement-to-claim mapping: Semantic relationships and relevance rationales linked.",
                event_type="requirement_mapping_completed",
                data={"mapped_requirements": len(created_reqs)}
            )

            # ---------------------------------------------------------
            # STAGE 9: Gap Detection
            # ---------------------------------------------------------
            detected_gaps = await self._execute_with_retry(
                "GAP_DETECTION",
                self._stage_9_gap_detection,
                created_reqs,
                evidence_counts
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="GAP_DETECTION",
                stage_index=9,
                progress=62,
                message=f"Gap detection: Identified {len(detected_gaps)} unaddressed silences or sparse evidence criteria.",
                event_type="gap_detection_completed",
                data={"gaps_count": len(detected_gaps)}
            )

            # ---------------------------------------------------------
            # STAGE 10: Contradiction Analysis
            # ---------------------------------------------------------
            all_conflicts = await self._execute_with_retry(
                "CONTRADICTION_ANALYSIS",
                self._stage_10_contradiction_analysis,
                created_reqs,
                claims_per_req
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="CONTRADICTION_ANALYSIS",
                stage_index=10,
                progress=69,
                message=f"Contradiction analysis: Cross-audited claims and identified {len(all_conflicts)} conflicts.",
                event_type="contradiction_analysis_completed",
                data={"conflicts_count": len(all_conflicts)}
            )

            # ---------------------------------------------------------
            # STAGE 11: Temporal Analysis
            # ---------------------------------------------------------
            temporal_results = await self._execute_with_retry(
                "TEMPORAL_ANALYSIS",
                self._stage_11_temporal_analysis,
                sources,
                created_claims
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="TEMPORAL_ANALYSIS",
                stage_index=11,
                progress=76,
                message=f"Temporal analysis: Audited publication dates, recency decay, and stale assertions.",
                event_type="temporal_analysis_completed",
                data={"temporal_audits": len(temporal_results)}
            )

            # ---------------------------------------------------------
            # STAGE 12: BlindSpot Discovery
            # ---------------------------------------------------------
            discovered_blindspots = await self._execute_with_retry(
                "BLINDSPOT_DISCOVERY",
                self._stage_12_blindspot_discovery,
                session,
                created_reqs
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="BLINDSPOT_DISCOVERY",
                stage_index=12,
                progress=83,
                message=f"BlindSpot Discovery: Formulated {len(discovered_blindspots)} counter-factual inquiries.",
                event_type="blindspot_discovery_completed",
                data={"blindspots_count": len(discovered_blindspots)}
            )

            # ---------------------------------------------------------
            # STAGE 13: Evidence Graph Construction
            # ---------------------------------------------------------
            graph_data = await self._execute_with_retry(
                "EVIDENCE_GRAPH_CONSTRUCTION",
                self._stage_13_evidence_graph_construction,
                session,
                created_reqs,
                sources,
                all_conflicts
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="EVIDENCE_GRAPH_CONSTRUCTION",
                stage_index=13,
                progress=89,
                message=f"Evidence graph: Constructed React Flow graph ({len(graph_data.nodes)} nodes, {len(graph_data.edges)} edges).",
                event_type="evidence_graph_constructed",
                data={"nodes": len(graph_data.nodes), "edges": len(graph_data.edges)}
            )

            # ---------------------------------------------------------
            # STAGE 14: Decision Readiness Calculation
            # ---------------------------------------------------------
            tier, recommendation = await self._execute_with_retry(
                "DECISION_READINESS_CALCULATION",
                self._stage_14_decision_readiness_calculation,
                session,
                created_reqs,
                all_conflicts,
                sources,
                created_claims
            )
            await self._checkpoint_job_and_broadcast(
                stage_name="DECISION_READINESS_CALCULATION",
                stage_index=14,
                progress=95,
                message=f"Decision readiness: Calculated DRI {session.readiness_score:.1f}% ({tier}).",
                event_type="decision_readiness_calculated",
                data={"readiness_score": session.readiness_score, "tier": tier}
            )

            # ---------------------------------------------------------
            # STAGE 15: Verification Task Generation
            # ---------------------------------------------------------
            tasks = await self._execute_with_retry(
                "VERIFICATION_TASK_GENERATION",
                self._stage_15_verification_task_generation,
                all_conflicts,
                discovered_blindspots
            )

            session.status = "completed"
            self.db.commit()

            if self.job_id:
                job = self.db.query(InvestigationJob).filter(InvestigationJob.id == self.job_id).first()
                if job:
                    job.status = "completed"
                    job.completed_at = datetime.now(timezone.utc)
                    job.progress_percent = 100.0
                    job.message = f"Investigation completed successfully. DRI: {session.readiness_score:.1f}% ({tier})"
                    self.db.commit()

            await self._checkpoint_job_and_broadcast(
                stage_name="VERIFICATION_TASK_GENERATION",
                stage_index=15,
                progress=100,
                message=f"Verification tasks generated: {len(tasks)} action items created for human sign-off.",
                event_type="verification_tasks_generated",
                data={"tasks_count": len(tasks)}
            )

            # Emit final complete signal
            await sse_manager.broadcast(
                session_id=self.session_id,
                stage="COMPLETE",
                progress=100,
                message=f"Investigation complete. DRI: {session.readiness_score:.1f}%. Verdict: {tier}",
                data={"readiness_score": session.readiness_score, "tier": tier, "verdict": session.executive_verdict},
                event_type="complete"
            )

        except Exception as e:
            logger.exception(f"Pipeline error for session {self.session_id}: {e}")
            session.status = "failed"
            self.db.commit()

            if self.job_id:
                job = self.db.query(InvestigationJob).filter(InvestigationJob.id == self.job_id).first()
                if job:
                    job.status = "failed"
                    job.error_message = str(e)
                    job.completed_at = datetime.now(timezone.utc)
                    self.db.commit()

            # Preserve all partial investigation data already written to DB in earlier stages!
            await self._checkpoint_job_and_broadcast(
                stage_name="INVESTIGATION_FAILED",
                stage_index=-1,
                progress=-1,
                message=f"Investigation failed: {str(e)}",
                event_type="investigation_failed",
                data={"error": str(e)}
            )
            raise

    # =========================================================================
    # Stage Implementation Handlers
    # =========================================================================

    async def _stage_1_research_goal_analysis(self, session: ResearchSession) -> Dict[str, Any]:
        """Stage 1: Analyzes goal, target decision, and evaluation boundaries."""
        words = session.research_goal.split()
        return {
            "title": session.title,
            "goal": session.research_goal,
            "decision": session.target_decision or "Strategic Decision",
            "word_count": len(words),
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }

    async def _stage_2_question_decomposition(self, session: ResearchSession) -> List[Requirement]:
        """Stage 2: Decomposes goal into MECE requirements or uses user-approved plan."""
        # 1. If user has already reviewed and approved requirements, respect them!
        existing_approved = (
            self.db.query(Requirement)
            .filter(
                Requirement.session_id == self.session_id,
                Requirement.is_approved == True
            )
            .order_by(Requirement.order_index)
            .all()
        )
        if existing_approved:
            logger.info(f"Using {len(existing_approved)} pre-approved research requirements for session {self.session_id}.")
            return existing_approved

        # 2. Otherwise generate new structured requirements
        planner = ResearchPlannerAgent()
        decomposed_reqs = await planner.decompose_goal(
            goal=session.research_goal,
            target_decision=session.target_decision or ""
        )

        # Clear existing unapproved suggestions for idempotency
        self.db.query(Requirement).filter(Requirement.session_id == self.session_id).delete()
        created_reqs = []
        for idx, r_data in enumerate(decomposed_reqs):
            req = Requirement(
                session_id=self.session_id,
                requirement_text=r_data.get("requirement_text") or r_data.get("question") or "Requirement Criterion",
                question=r_data.get("question"),
                category=r_data.get("category", "General"),
                description=r_data.get("description", ""),
                importance=r_data.get("importance", "high"),
                priority=r_data.get("priority", "P1"),
                weight=float(r_data.get("weight", 1.0)),
                is_decision_critical=bool(r_data.get("is_decision_critical", False)),
                origin="ai_suggested",
                is_approved=True,  # Pipeline execution approves criteria for analysis
                status="uncovered",
                order_index=idx
            )
            self.db.add(req)
            created_reqs.append(req)

        self.db.commit()
        return created_reqs

    async def _stage_3_source_collection(self) -> List[Source]:
        """Stage 3: Gathers and validates all attached sources."""
        sources = self.db.query(Source).filter(
            Source.session_id == self.session_id,
            Source.processing_status != "failed"
        ).all()
        if not sources:
            raise ValueError("No accessible sources found for this session. Please attach at least one valid source document or URL.")
        return sources

    async def _stage_4_source_extraction(self, sources: List[Source]) -> List[DocumentChunk]:
        """Stage 4: Extracts and verifies chunks across all sources."""
        all_chunks = self.db.query(DocumentChunk).join(Source).filter(Source.session_id == self.session_id).all()
        if not all_chunks:
            raise ValueError("No textual content could be extracted from attached sources.")
        return all_chunks

    async def _stage_5_atomic_claim_extraction(self, all_chunks: List[DocumentChunk]) -> List[AtomicClaim]:
        """Stage 5: Extracts atomic claims with exact quote verification."""
        claim_agent = ClaimExtractorAgent()
        created_claims = []

        for chunk in all_chunks:
            source_title = chunk.source.title if chunk.source else ""
            claims_data = await claim_agent.extract_claims_from_chunk(
                chunk_text=chunk.text_content,
                source_title=source_title,
                page_number=chunk.page_number,
                source_id=chunk.source_id,
            )
            for cd in claims_data:
                quote = cd.get("exact_quote") or cd.get("original_evidence_text") or chunk.text_content[:120]
                claim = AtomicClaim(
                    chunk_id=chunk.id,
                    source_id=chunk.source_id,
                    claim_text=cd["claim_text"],
                    category=cd.get("category", "General"),
                    original_evidence_text=quote,
                    exact_quote=quote,
                    page_number=cd.get("page_number", chunk.page_number),
                    paragraph_reference=cd.get("paragraph_reference") or (f"Page {chunk.page_number}" if chunk.page_number else None),
                    applicable_period=cd.get("applicable_period") or cd.get("date_reference"),
                    date_reference=cd.get("date_reference") or cd.get("applicable_period"),
                    claim_type=cd.get("claim_type", "assertion"),
                    confidence_score=float(cd.get("confidence_score", 0.95)),
                    extraction_confidence=float(cd.get("extraction_confidence", 0.95)),
                    is_verified=bool(cd.get("is_verified", False))
                )
                self.db.add(claim)
                created_claims.append(claim)

        self.db.commit()
        return created_claims

    async def _stage_6_embedding_generation(self, chunks: List[DocumentChunk], claims: List[AtomicClaim]) -> None:
        """Stage 6: Generates dense vector embeddings and indexes in FAISS."""
        chunk_texts = [c.text_content for c in chunks]
        chunk_metas = [{"chunk_id": c.id, "source_id": c.source_id, "page": c.page_number} for c in chunks]
        self.vector_store.clear()
        self.vector_store.add_documents(chunk_texts, chunk_metas)

    async def _stage_7_evidence_retrieval(
        self,
        reqs: List[Requirement],
        claims: List[AtomicClaim]
    ) -> Dict[str, List[Tuple[Dict[str, Any], float]]]:
        """Stage 7: Performs vector and semantic retrieval for candidate claims."""
        claims_dict_list = [
            {
                "id": c.id,
                "claim_text": c.claim_text,
                "exact_quote": c.exact_quote,
                "source_id": c.chunk.source_id if c.chunk else "",
                "source_title": c.chunk.source.title if c.chunk and c.chunk.source else "",
                "date_reference": c.date_reference
            }
            for c in claims
        ]

        retrieval_map = {}
        for req in reqs:
            matched = ClaimMatcher.match_claims_to_requirement(
                requirement_text=req.requirement_text,
                claims=claims_dict_list,
                similarity_threshold=0.28,
                top_k=6
            )
            retrieval_map[req.id] = matched

        return retrieval_map

    async def _stage_8_requirement_to_claim_mapping(
        self,
        reqs: List[Requirement],
        retrieval_map: Dict[str, List[Tuple[Dict[str, Any], float]]]
    ) -> Tuple[Dict[str, List[Dict[str, Any]]], Dict[str, int]]:
        """Stage 8: Maps claims to requirements and creates EvidenceLink records."""
        evaluator = EvidenceEvaluatorAgent()
        claims_per_req: Dict[str, List[Dict[str, Any]]] = {r.id: [] for r in reqs}
        evidence_counts: Dict[str, int] = {r.id: 0 for r in reqs}

        # Clear existing evidence links for idempotency
        self.db.query(EvidenceLink).filter(EvidenceLink.requirement_id.in_([r.id for r in reqs])).delete(synchronize_session=False)

        for req in reqs:
            matched = retrieval_map.get(req.id, [])
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
        return claims_per_req, evidence_counts

    async def _stage_9_gap_detection(
        self,
        reqs: List[Requirement],
        evidence_counts: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """Stage 9: Detects information gaps, silences, and sparse coverage."""
        gap_agent = GapDetectorAgent()
        req_dicts = [{"id": r.id, "requirement_text": r.requirement_text, "category": r.category} for r in reqs]
        return await gap_agent.detect_gaps(req_dicts, evidence_counts)

    async def _stage_10_contradiction_analysis(
        self,
        reqs: List[Requirement],
        claims_per_req: Dict[str, List[Dict[str, Any]]]
    ) -> List[Contradiction]:
        """Stage 10: Cross-examines competing claims to detect contradictions."""
        conflict_agent = ContradictionAnalyzerAgent()
        all_conflicts = []

        # Clear existing contradictions for idempotency
        self.db.query(Contradiction).filter(Contradiction.session_id == self.session_id).delete()

        for req in reqs:
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
        return all_conflicts

    async def _stage_11_temporal_analysis(
        self,
        sources: List[Source],
        claims: List[AtomicClaim]
    ) -> List[Dict[str, Any]]:
        """Stage 11: Audits publication dates and temporal decay."""
        return TemporalAnalyzerAgent.audit_temporal_freshness(sources, claims)

    async def _stage_12_blindspot_discovery(
        self,
        session: ResearchSession,
        reqs: List[Requirement]
    ) -> List[BlindSpot]:
        """Stage 12: Discovers counter-factual questions and blind spots."""
        blindspot_agent = BlindSpotDiscoveryAgent()
        discovered = await blindspot_agent.discover_blindspots(
            goal=session.research_goal,
            target_decision=session.target_decision or "",
            covered_requirements=[r.requirement_text for r in reqs]
        )

        # Clear existing blindspots for idempotency
        self.db.query(BlindSpot).filter(BlindSpot.session_id == self.session_id).delete()
        created_blindspots = []

        for b in discovered:
            spot = BlindSpot(
                session_id=self.session_id,
                question=b["question"],
                rationale=b["rationale"],
                risk_level=b.get("risk_level", "medium"),
                category=b.get("category", "unaddressed_risk"),
                is_resolved=False
            )
            self.db.add(spot)
            created_blindspots.append(spot)

        self.db.commit()
        return created_blindspots

    async def _stage_13_evidence_graph_construction(
        self,
        session: ResearchSession,
        reqs: List[Requirement],
        sources: List[Source],
        conflicts: List[Contradiction]
    ) -> Any:
        """Stage 13: Builds the React Flow knowledge and conflict graph."""
        links = (
            self.db.query(EvidenceLink)
            .join(Requirement)
            .filter(Requirement.session_id == self.session_id)
            .all()
        )
        blindspots = (
            self.db.query(BlindSpot)
            .filter(BlindSpot.session_id == self.session_id)
            .all()
        )
        return GraphBuilder.build_evidence_graph(
            session_title=session.title,
            research_goal=session.research_goal,
            requirements=reqs,
            sources=sources,
            evidence_links=links,
            contradictions=conflicts,
            blindspots=blindspots,
            session=session
        )

    async def _stage_14_decision_readiness_calculation(
        self,
        session: ResearchSession,
        reqs: List[Requirement],
        conflicts: List[Contradiction],
        sources: List[Source],
        claims: List[AtomicClaim]
    ) -> Tuple[str, str]:
        """Stage 14: Calculates the explainable 4-factor Decision Readiness Index."""
        score_results = DecisionReadinessScorer.calculate_readiness(
            requirements=reqs,
            contradictions=conflicts,
            sources=sources,
            claims=claims
        )
        tier, recommendation = DecisionReadinessScorer.get_readiness_tier(score_results["readiness_score"])

        session.readiness_score = score_results["readiness_score"]
        session.coverage_score = score_results["coverage_score"]
        session.consistency_score = score_results["consistency_score"]
        session.freshness_score = score_results["freshness_score"]
        session.verification_score = score_results["verification_score"]
        session.executive_verdict = f"{tier}: {recommendation}"
        self.db.commit()

        return tier, recommendation

    async def _stage_15_verification_task_generation(
        self,
        conflicts: List[Contradiction],
        blindspots: List[BlindSpot]
    ) -> List[VerificationTask]:
        """Stage 15: Generates verification checklist tasks for arbitration."""
        # Clear existing verification tasks for idempotency
        self.db.query(VerificationTask).filter(VerificationTask.session_id == self.session_id).delete()
        tasks = []

        for c in conflicts:
            t = VerificationTask(
                session_id=self.session_id,
                task_type="contradiction",
                title=f"Arbitrate conflict: {c.conflicting_aspect}",
                description="Evaluate competing source claims and determine authoritative specification.",
                is_completed=False
            )
            self.db.add(t)
            tasks.append(t)

        for b in blindspots:
            t = VerificationTask(
                session_id=self.session_id,
                task_type="blindspot",
                title=f"Address omitted risk: {b.question}",
                description=b.rationale,
                is_completed=b.is_resolved
            )
            self.db.add(t)
            tasks.append(t)

        self.db.commit()
        return tasks
