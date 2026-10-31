import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models import ResearchSession, Source, DocumentChunk, Requirement, AtomicClaim, EvidenceLink
from app.agents.claim_extractor import ClaimExtractorAgent
from app.schemas.claims import ClaimExtractionResponse, ExtractedClaimItem
from app.intelligence.embeddings import generate_embeddings
from app.intelligence.vector_store import FAISSVectorStore
from app.intelligence.evidence_retrieval_engine import (
    EvidenceRetrievalEngine,
    compute_keyword_overlap_score,
)
from app.services.claim_service import ClaimService

client = TestClient(app)


@pytest.mark.anyio
async def test_claim_extractor_atomic_decomposition():
    """Verifies that compound statements are decomposed into separate atomic verifiable claims."""
    agent = ClaimExtractorAgent()
    passage = "Applicants must be Indian citizens, score at least 60% and satisfy the annual income limit."

    claims = await agent.extract_claims_from_chunk(
        chunk_text=passage,
        source_title="Scholarship Gazette 2024",
        page_number=1,
        source_id="src-test-01"
    )

    assert len(claims) >= 3
    claim_texts = [c["claim_text"].lower() for c in claims]

    # Verify all 3 atomic conditions are captured
    assert any("indian citizens" in ct for ct in claim_texts)
    assert any("60%" in ct or "score" in ct for ct in claim_texts)
    assert any("income" in ct for ct in claim_texts)

    # Verify all claims are grounded in the original quote
    for c in claims:
        assert c["is_verified"] is True
        assert c["original_evidence_text"] == passage or passage in c["original_evidence_text"]
        assert c["page_number"] == 1
        assert c["source_id"] == "src-test-01"


def test_pydantic_claim_schema_validation():
    """Validates that extracted claims conform strictly to the Pydantic schema."""
    raw_data = {
        "claims": [
            {
                "claim_text": "Candidates must maintain a 3.5 minimum GPA.",
                "category": "Academic",
                "original_evidence_text": "Candidates must maintain a 3.5 minimum GPA throughout the academic year.",
                "page_number": 3,
                "paragraph_reference": "Section 4.2",
                "applicable_period": "2024-2025",
                "extraction_confidence": 0.98,
                "claim_type": "quantitative"
            }
        ]
    }
    validated = ClaimExtractionResponse.model_validate(raw_data)
    assert len(validated.claims) == 1
    item = validated.claims[0]
    assert item.category == "Academic"
    assert item.extraction_confidence == 0.98
    assert item.page_number == 3


def test_embedding_generation_and_cosine_similarity():
    """Tests dense embedding creation with SentenceTransformers."""
    text1 = "Eligibility criteria for government scholarships require full-time enrollment."
    text2 = "Eligibility criteria for government scholarships require full-time enrollment."
    text3 = "Unrelated database clustering and container networking latency benchmarks."

    embeddings = generate_embeddings([text1, text2, text3])
    assert embeddings.shape == (3, 384)

    # Identical texts must have cosine similarity ~ 1.0
    sim_identical = float(np.dot(embeddings[0], embeddings[1]))
    assert sim_identical >= 0.99

    # Unrelated texts must have substantially lower similarity
    sim_unrelated = float(np.dot(embeddings[0], embeddings[2]))
    assert sim_unrelated < 0.65


def test_faiss_vector_store_operations():
    """Tests FAISS index building and similarity queries."""
    store = FAISSVectorStore(dimension=384)

    texts = [
        "Applicants must submit official transcripts before December 15.",
        "Household annual income must not exceed $75,000.",
        "Recipients must complete 20 hours of community service per semester.",
    ]
    metas = [
        {"id": "doc1", "category": "Deadlines"},
        {"id": "doc2", "category": "Income"},
        {"id": "doc3", "category": "Procedure"},
    ]

    store.add_documents(texts, metas)
    assert store.index.ntotal == 3

    # Query matching Deadlines
    results = store.similarity_search("When is the application deadline for transcripts?", top_k=2)
    assert len(results) == 2
    top_meta, score = results[0]
    assert top_meta["id"] == "doc1"
    assert top_meta["category"] == "Deadlines"
    assert score > 0.40


def test_hybrid_keyword_and_semantic_retrieval():
    """Tests lexical keyword overlap calculation and hybrid retrieval."""
    query = "What is the minimum GPA and percentage requirement (60%)?"
    passage_match = "Applicants must achieve a minimum of 60% or 3.0 GPA."
    passage_nomatch = "General administrative application guidelines."

    score_match = compute_keyword_overlap_score(query, passage_match)
    score_nomatch = compute_keyword_overlap_score(query, passage_nomatch)

    assert score_match > 0.30
    assert score_nomatch < 0.10


def test_session_evidence_mapping_workflow():
    """End-to-end integration test of evidence retrieval and requirement mapping in SQLite."""
    db = SessionLocal()
    try:
        # 1. Create a dedicated session
        session = ResearchSession(
            title="Evidence Retrieval Engine Integration Test",
            research_goal="Verify hybrid retrieval and requirement-to-claim mapping.",
            status="draft",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # 2. Add Source and Chunk
        source = Source(
            session_id=session.id,
            source_type="pdf",
            title="National Fellowship Regulations",
            uri="national_fellowship_regulations.pdf",
            processing_status="processed",
        )
        db.add(source)
        db.commit()
        db.refresh(source)

        chunk = DocumentChunk(
            source_id=source.id,
            chunk_index=0,
            page_number=2,
            text_content="Section 2.1: Candidates must be citizens of India, have scored at least 60% in undergraduate studies, and household income must not exceed $75,000 annually.",
            token_count=35,
        )
        db.add(chunk)
        db.commit()
        db.refresh(chunk)

        # 3. Add Atomic Claims
        claim1 = AtomicClaim(
            chunk_id=chunk.id,
            source_id=source.id,
            claim_text="Candidates must be citizens of India.",
            category="Eligibility",
            original_evidence_text="Candidates must be citizens of India",
            exact_quote="Candidates must be citizens of India",
            page_number=2,
            paragraph_reference="Section 2.1",
            extraction_confidence=0.98,
            is_verified=True,
        )
        claim2 = AtomicClaim(
            chunk_id=chunk.id,
            source_id=source.id,
            claim_text="Candidates must have scored at least 60% in undergraduate studies.",
            category="Academic",
            original_evidence_text="have scored at least 60% in undergraduate studies",
            exact_quote="have scored at least 60% in undergraduate studies",
            page_number=2,
            paragraph_reference="Section 2.1",
            extraction_confidence=0.97,
            is_verified=True,
        )
        claim3 = AtomicClaim(
            chunk_id=chunk.id,
            source_id=source.id,
            claim_text="Household income must not exceed $75,000 annually.",
            category="Income",
            original_evidence_text="household income must not exceed $75,000 annually",
            exact_quote="household income must not exceed $75,000 annually",
            page_number=2,
            paragraph_reference="Section 2.1",
            extraction_confidence=0.96,
            is_verified=True,
        )
        db.add_all([claim1, claim2, claim3])
        db.commit()

        # 4. Add Requirements
        req_academic = Requirement(
            session_id=session.id,
            requirement_text="What are the minimum academic GPA or percentage requirements?",
            category="Academic",
            importance="critical",
            priority="P0",
            status="uncovered",
            order_index=0,
        )
        req_income = Requirement(
            session_id=session.id,
            requirement_text="What is the maximum allowable household annual income?",
            category="Income",
            importance="high",
            priority="P1",
            status="uncovered",
            order_index=1,
        )
        db.add_all([req_academic, req_income])
        db.commit()

        # 5. Execute Evidence Mapping Engine
        summary = EvidenceRetrievalEngine.execute_session_evidence_mapping(
            db=db,
            session_id=session.id,
            similarity_threshold=0.30,
            top_k=3,
        )

        assert summary["evidence_links_created"] >= 2
        assert summary["covered_requirements"] + summary["partial_requirements"] >= 1

        # 6. Verify EvidenceLink rows in SQLite
        links = db.query(EvidenceLink).join(Requirement).filter(Requirement.session_id == session.id).all()
        assert len(links) >= 2
        assert any(link.requirement_id == req_academic.id for link in links)
        assert any(link.requirement_id == req_income.id for link in links)

        # 7. Test Claims API filtering on this session
        res_claims = client.get(f"/api/v1/research/{session.id}/claims?category=Academic")
        assert res_claims.status_code == 200
        acad_claims = res_claims.json()
        assert len(acad_claims) == 1
        assert acad_claims[0]["category"] == "Academic"
        assert acad_claims[0]["page_number"] == 2
        assert acad_claims[0]["source_id"] == source.id

        # Search filter
        res_search = client.get(f"/api/v1/research/{session.id}/claims?search=75,000")
        assert res_search.status_code == 200
        search_claims = res_search.json()
        assert len(search_claims) == 1
        assert "75,000" in search_claims[0]["claim_text"]

        # Detail endpoint
        claim_id = acad_claims[0]["id"]
        res_detail = client.get(f"/api/v1/claims/{claim_id}")
        assert res_detail.status_code == 200
        assert res_detail.json()["id"] == claim_id

        # Trigger evidence retrieval endpoint
        res_retrieval = client.post(f"/api/v1/research/{session.id}/retrieve-evidence?similarity_threshold=0.30")
        assert res_retrieval.status_code == 200
        assert res_retrieval.json()["session_id"] == session.id

    finally:
        db.close()
