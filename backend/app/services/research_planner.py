import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import ResearchSession, Requirement, EvidenceLink, Contradiction
from app.schemas.requirements import (
    RequirementCreate,
    RequirementUpdate,
    RequirementResponse,
    ResearchPlanSummaryResponse,
    GeneratePlanRequest,
    PlanApprovalRequest,
)
from app.agents.research_planner import ResearchPlannerAgent
from app.core.exceptions import NotFoundError, AppException

logger = logging.getLogger("proofpath.services.research_planner")


class ResearchPlannerService:
    def __init__(self):
        self.agent = ResearchPlannerAgent()

    async def generate_plan(
        self,
        session_id: str,
        request: GeneratePlanRequest,
        db: Session
    ) -> ResearchPlanSummaryResponse:
        """
        Decomposes research goal into structured, independently verifiable requirements via Gemini API.
        Deduplicates questions and saves them to SQLite with origin='ai_suggested' and is_approved=False.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        goal = request.goal or session.research_goal
        if not goal:
            raise AppException("Cannot generate plan: Research goal is empty.", status_code=400, code="EMPTY_GOAL")

        target_decision = request.target_decision or session.target_decision or ""

        # 1. Optionally clear previous unapproved suggestions if requested
        if request.replace_existing_suggestions:
            db.query(Requirement).filter(
                Requirement.session_id == session_id,
                Requirement.origin == "ai_suggested",
                Requirement.is_approved == False
            ).delete()
            db.commit()

        # 2. Call Gemini API to decompose goal
        decomposed = await self.agent.decompose_goal(
            goal=goal,
            target_decision=target_decision,
            domain_context=request.domain_context,
            max_criteria=request.max_criteria
        )

        # 3. Retrieve existing requirements to avoid duplicate questions
        existing_reqs = db.query(Requirement).filter(Requirement.session_id == session_id).all()
        existing_texts = {r.requirement_text.lower().strip() for r in existing_reqs}
        existing_questions = {(r.question or "").lower().strip() for r in existing_reqs}

        max_order = len(existing_reqs)

        # 4. Save newly generated requirements into SQLite
        added_count = 0
        for item in decomposed:
            req_text = item.get("requirement_text") or item.get("question") or ""
            question_text = item.get("question") or req_text

            # Skip duplicate if already exists
            if req_text.lower().strip() in existing_texts or question_text.lower().strip() in existing_questions:
                continue

            req = Requirement(
                session_id=session_id,
                requirement_text=req_text,
                question=question_text,
                category=item.get("category", "General"),
                description=item.get("description", ""),
                importance=item.get("importance", "high"),
                priority=item.get("priority", "P1"),
                weight=float(item.get("weight", 1.0)),
                is_decision_critical=bool(item.get("is_decision_critical", False)),
                origin="ai_suggested",  # Stored as AI suggestion until user approval!
                is_approved=False,       # Crucial: Not official until approved
                status="uncovered",
                order_index=max_order + added_count
            )
            db.add(req)
            existing_texts.add(req_text.lower().strip())
            existing_questions.add(question_text.lower().strip())
            added_count += 1

        db.commit()
        logger.info(f"Generated {added_count} AI research requirements for session {session_id}.")

        return self.get_plan_summary(session_id=session_id, db=db)

    def get_plan_summary(self, session_id: str, db: Session) -> ResearchPlanSummaryResponse:
        """
        Retrieves the complete research plan with categories and summary metrics.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        reqs = (
            db.query(Requirement)
            .filter(Requirement.session_id == session_id)
            .order_by(Requirement.is_decision_critical.desc(), Requirement.order_index.asc())
            .all()
        )

        categories = sorted(list({r.category for r in reqs if r.category}))
        official_count = sum(1 for r in reqs if r.is_approved)
        suggested_count = sum(1 for r in reqs if not r.is_approved)
        critical_count = sum(1 for r in reqs if r.is_decision_critical)

        responses: List[RequirementResponse] = []
        for r in reqs:
            ev_count = db.query(EvidenceLink).filter(EvidenceLink.requirement_id == r.id).count()
            conf_count = db.query(Contradiction).filter(Contradiction.requirement_id == r.id).count()

            responses.append(
                RequirementResponse(
                    id=r.id,
                    session_id=r.session_id,
                    requirement_text=r.requirement_text,
                    question=r.question or r.requirement_text,
                    description=r.description or "",
                    category=r.category,
                    importance=r.importance or "high",
                    priority=r.priority or "P1",
                    weight=r.weight or 1.0,
                    is_decision_critical=r.is_decision_critical or False,
                    origin=r.origin or "ai_suggested",
                    is_approved=r.is_approved or False,
                    status=r.status or "uncovered",
                    order_index=r.order_index or 0,
                    created_at=r.created_at,
                    evidence_count=ev_count,
                    conflict_count=conf_count
                )
            )

        return ResearchPlanSummaryResponse(
            session_id=session_id,
            total_requirements=len(reqs),
            official_approved_count=official_count,
            ai_suggested_count=suggested_count,
            decision_critical_count=critical_count,
            categories=categories,
            requirements=responses
        )

    def add_user_requirement(
        self,
        session_id: str,
        data: RequirementCreate,
        db: Session
    ) -> RequirementResponse:
        """
        Adds an explicit user-requested requirement (origin='user_requested', is_approved=True).
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        max_order = db.query(Requirement).filter(Requirement.session_id == session_id).count()

        req = Requirement(
            session_id=session_id,
            requirement_text=data.requirement_text,
            question=data.question or data.requirement_text,
            category=data.category or "General",
            description=data.description or "",
            importance=data.importance or "high",
            priority=data.priority or "P1",
            weight=data.weight or 1.0,
            is_decision_critical=data.is_decision_critical or False,
            origin="user_requested",  # Added by human user
            is_approved=True,         # Official requirement
            status="uncovered",
            order_index=max_order
        )
        db.add(req)
        db.commit()
        db.refresh(req)

        return RequirementResponse(
            id=req.id,
            session_id=req.session_id,
            requirement_text=req.requirement_text,
            question=req.question,
            description=req.description,
            category=req.category,
            importance=req.importance,
            priority=req.priority,
            weight=req.weight,
            is_decision_critical=req.is_decision_critical,
            origin=req.origin,
            is_approved=req.is_approved,
            status=req.status,
            order_index=req.order_index,
            created_at=req.created_at,
            evidence_count=0,
            conflict_count=0
        )

    def update_requirement(
        self,
        requirement_id: str,
        data: RequirementUpdate,
        db: Session
    ) -> RequirementResponse:
        """
        Updates an existing requirement or suggestion.
        """
        req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not req:
            raise NotFoundError("Requirement", requirement_id)

        if data.requirement_text is not None:
            req.requirement_text = data.requirement_text
        if data.question is not None:
            req.question = data.question
        if data.category is not None:
            req.category = data.category
        if data.description is not None:
            req.description = data.description
        if data.importance is not None:
            req.importance = data.importance
        if data.priority is not None:
            req.priority = data.priority
        if data.weight is not None:
            req.weight = data.weight
        if data.is_decision_critical is not None:
            req.is_decision_critical = data.is_decision_critical
        if data.is_approved is not None:
            req.is_approved = data.is_approved
        if data.status is not None:
            req.status = data.status

        db.commit()
        db.refresh(req)

        ev_count = db.query(EvidenceLink).filter(EvidenceLink.requirement_id == req.id).count()
        conf_count = db.query(Contradiction).filter(Contradiction.requirement_id == req.id).count()

        return RequirementResponse(
            id=req.id,
            session_id=req.session_id,
            requirement_text=req.requirement_text,
            question=req.question,
            description=req.description,
            category=req.category,
            importance=req.importance,
            priority=req.priority,
            weight=req.weight,
            is_decision_critical=req.is_decision_critical,
            origin=req.origin,
            is_approved=req.is_approved,
            status=req.status,
            order_index=req.order_index,
            created_at=req.created_at,
            evidence_count=ev_count,
            conflict_count=conf_count
        )

    def delete_requirement(self, requirement_id: str, db: Session) -> Dict[str, Any]:
        """
        Deletes a requirement or suggested question.
        """
        req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not req:
            raise NotFoundError("Requirement", requirement_id)

        db.delete(req)
        db.commit()
        return {"success": True, "message": f"Requirement '{requirement_id}' successfully deleted."}

    def approve_plan(
        self,
        session_id: str,
        request: PlanApprovalRequest,
        db: Session
    ) -> ResearchPlanSummaryResponse:
        """
        Approves AI-suggested requirements, elevating them to official requirements for the investigation.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        query = db.query(Requirement).filter(Requirement.session_id == session_id)

        # If specific IDs passed, approve those; otherwise approve all
        if request.approved_requirement_ids is not None:
            query = query.filter(Requirement.id.in_(request.approved_requirement_ids))

        approved_reqs = query.all()
        for r in approved_reqs:
            r.is_approved = True
            if request.decision_critical_ids and r.id in request.decision_critical_ids:
                r.is_decision_critical = True

        db.commit()
        logger.info(f"Approved {len(approved_reqs)} requirements for session {session_id}.")

        return self.get_plan_summary(session_id=session_id, db=db)


research_planner_service = ResearchPlannerService()
