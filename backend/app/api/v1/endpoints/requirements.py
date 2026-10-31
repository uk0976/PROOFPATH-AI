from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, Requirement, EvidenceLink, Contradiction
from app.schemas.requirements import (
    RequirementResponse,
    RequirementUpdate,
    DecomposeRequest,
)
from app.agents.research_planner import ResearchPlannerAgent

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.get("/{session_id}", response_model=List[RequirementResponse])
def get_requirements(session_id: str, db: Session = Depends(get_db)):
    reqs = db.query(Requirement).filter(Requirement.session_id == session_id).order_by(Requirement.order_index).all()
    results = []
    for r in reqs:
        ev_count = db.query(EvidenceLink).filter(EvidenceLink.requirement_id == r.id).count()
        conf_count = db.query(Contradiction).filter(Contradiction.requirement_id == r.id).count()
        results.append(
            RequirementResponse(
                id=r.id,
                session_id=r.session_id,
                requirement_text=r.requirement_text,
                category=r.category,
                weight=r.weight,
                status=r.status,
                order_index=r.order_index,
                created_at=r.created_at,
                evidence_count=ev_count,
                conflict_count=conf_count
            )
        )
    return results


@router.post("/{session_id}/decompose", response_model=List[RequirementResponse])
async def decompose_requirements(
    session_id: str,
    data: DecomposeRequest,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    planner = ResearchPlannerAgent()
    decomposed = await planner.decompose_goal(
        goal=session.research_goal,
        target_decision=session.target_decision or "",
        max_criteria=data.max_criteria
    )

    db.query(Requirement).filter(Requirement.session_id == session_id).delete()
    results = []
    for idx, d in enumerate(decomposed):
        req = Requirement(
            session_id=session_id,
            requirement_text=d["requirement_text"],
            category=d.get("category", "functional"),
            weight=float(d.get("weight", 1.0)),
            status="uncovered",
            order_index=idx
        )
        db.add(req)
        results.append(req)
    db.commit()

    return [
        RequirementResponse(
            id=r.id,
            session_id=r.session_id,
            requirement_text=r.requirement_text,
            category=r.category,
            weight=r.weight,
            status=r.status,
            order_index=r.order_index,
            created_at=r.created_at,
            evidence_count=0,
            conflict_count=0
        )
        for r in results
    ]


@router.put("/{requirement_id}", response_model=RequirementResponse)
def update_requirement(
    requirement_id: str,
    data: RequirementUpdate,
    db: Session = Depends(get_db)
):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    if data.requirement_text is not None:
        req.requirement_text = data.requirement_text
    if data.category is not None:
        req.category = data.category
    if data.weight is not None:
        req.weight = data.weight
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
        category=req.category,
        weight=req.weight,
        status=req.status,
        order_index=req.order_index,
        created_at=req.created_at,
        evidence_count=ev_count,
        conflict_count=conf_count
    )
