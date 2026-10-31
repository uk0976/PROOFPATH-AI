import os
import io
import pytest
import pymupdf as fitz
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def create_sample_pdf_bytes(title: str, text: str) -> bytes:
    """Generates a valid PDF with PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), title, fontsize=16)
    page.insert_textbox((50, 100, 550, 750), text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class TestRealForensicInvestigationWorkflow:
    """
    Comprehensive End-to-End Simulation of a Live User Workflow:
    1. Create fresh investigation
    2. Ingest 3 distinct sources (PDF, Text, Text)
    3. Generate structured research requirements
    4. Extract atomic claims & retrieve evidence
    5. Evaluate information gaps, contradictions & temporal decay
    6. Discover BlindSpot questions
    7. Generate verification tasks
    8. Generate and download executive PDF report
    """

    def test_complete_real_investigation_pipeline(self):
        # =========================================================================
        # 1. CREATE FRESH INVESTIGATION
        # =========================================================================
        create_res = client.post(
            "/api/v1/research",
            json={
                "title": "Government Research Grant Eligibility & Cost-Share Audit",
                "research_goal": "Investigate cost-sharing matching rules, renewal deadlines, and investigator citizenship restrictions.",
                "target_decision": "Execute grant application and secure institutional matching commitment.",
            },
        )
        assert create_res.status_code == 201
        session_id = create_res.json()["id"]
        assert session_id is not None

        try:
            # =========================================================================
            # 2. INGEST 3 DISTINCT SOURCE DOCUMENTS
            # =========================================================================
            # Source 1: Official PDF Guidelines
            pdf_text = (
                "FEDERAL RESEARCH GRANT GUIDELINES 2026\n\n"
                "Section 4.1 Cost-Sharing Requirements:\n"
                "All applying institutions must provide a mandatory 30% matching cost-share fund for the 2026 cycle.\n\n"
                "Section 4.2 Investigator Qualifications:\n"
                "The Principal Investigator (PI) must be a citizen or permanent resident of the United States.\n\n"
                "Section 5.0 Audit Deadlines:\n"
                "Annual expenditure reports and institutional financial audits are due on October 31 each fiscal year."
            )
            pdf_bytes = create_sample_pdf_bytes("Federal Research Grant Guidelines 2026", pdf_text)

            res_pdf = client.post(
                "/api/v1/sources/upload",
                data={"research_id": session_id, "title": "Official Grant Guidelines 2026 (PDF)"},
                files={"file": ("grant_guidelines_2026.pdf", pdf_bytes, "application/pdf")},
            )
            assert res_pdf.status_code in [200, 201]
            source_pdf_id = res_pdf.json()["id"]

            # Source 2: Department Policy Memorandum (Text)
            memo_text = (
                "INTERNAL POLICY MEMORANDUM — COST-SHARE WAIVERS\n\n"
                "Effective Date: January 10, 2026.\n"
                "Institutions with an annual endowment below $10M are granted a full waiver from the 30% cost-sharing match.\n"
                "Annual expenditure audit submission deadline for 2026 has been officially deferred to November 30.\n"
                "PIs must possess a tenured or minimum 3-year renewable contract."
            )
            res_memo = client.post(
                "/api/v1/sources/text",
                json={
                    "research_id": session_id,
                    "title": "Institutional Cost-Share Waiver Memo 2026",
                    "content": memo_text,
                },
            )
            assert res_memo.status_code in [200, 201]
            source_memo_id = res_memo.json()["id"]

            # Source 3: Superseded 2022 Circular (Text)
            old_text = (
                "HISTORICAL GRANT CIRCULAR — FY 2022\n\n"
                "Effective Period: 2022 Cycle.\n"
                "The institutional cost-share matching requirement is fixed at 15% of total project costs."
            )
            res_old = client.post(
                "/api/v1/sources/text",
                json={
                    "research_id": session_id,
                    "title": "Historical 2022 Grant Circular (Superseded)",
                    "content": old_text,
                },
            )
            assert res_old.status_code in [200, 201]
            source_old_id = res_old.json()["id"]

            # Verify 3 sources recorded
            sources_res = client.get(f"/api/v1/research/{session_id}/sources")
            assert sources_res.status_code == 200
            assert len(sources_res.json()) == 3

            # =========================================================================
            # 3. GENERATE RESEARCH REQUIREMENTS (AI PLANNER)
            # =========================================================================
            plan_res = client.post(
                f"/api/v1/research/{session_id}/plan/generate",
                json={"domain_context": "scholarship", "max_criteria": 6},
            )
            assert plan_res.status_code in [200, 201]
            plan_data = plan_res.json()
            assert plan_data["total_requirements"] > 0

            # Approve all generated requirements
            approve_res = client.post(f"/api/v1/research/{session_id}/plan/approve")
            assert approve_res.status_code == 200

            # =========================================================================
            # 4. EXTRACT CLAIMS & RETRIEVE EVIDENCE
            # =========================================================================
            claims_res = client.post(f"/api/v1/research/{session_id}/extract-claims")
            assert claims_res.status_code == 200
            extracted_claims = claims_res.json()
            assert len(extracted_claims) > 0

            # Retrieve evidence and map to requirements
            evidence_res = client.post(f"/api/v1/research/{session_id}/retrieve-evidence")
            assert evidence_res.status_code == 200

            # =========================================================================
            # 5. DETECT INFORMATION GAPS, CONTRADICTIONS & TEMPORAL AUDIT
            # =========================================================================
            # Evaluate Gaps
            gaps_res = client.post(f"/api/v1/research/{session_id}/evaluate-gaps")
            assert gaps_res.status_code == 200
            gaps_data = gaps_res.json()
            assert len(gaps_data) > 0

            # Evaluate Contradictions (e.g. 30% vs 15% vs waiver)
            conflicts_res = client.post(f"/api/v1/research/{session_id}/evaluate-contradictions")
            assert conflicts_res.status_code == 200

            # Evaluate Temporal Freshness
            temporal_res = client.post(f"/api/v1/research/{session_id}/evaluate-temporal")
            assert temporal_res.status_code == 200

            # =========================================================================
            # 6. DISCOVER BLINDSPOT QUESTIONS
            # =========================================================================
            blindspots_res = client.post(f"/api/v1/research/{session_id}/discover-blindspots")
            assert blindspots_res.status_code == 200
            blindspots = blindspots_res.json()
            assert len(blindspots) > 0

            # Promote first blindspot into research plan
            first_bs_id = blindspots[0]["id"]
            add_bs_res = client.post(f"/api/v1/blindspots/{first_bs_id}/add-to-plan")
            assert add_bs_res.status_code == 200

            # =========================================================================
            # 7. GENERATE VERIFICATION TASKS
            # =========================================================================
            tasks_res = client.post(f"/api/v1/research/{session_id}/verification/generate")
            assert tasks_res.status_code in [200, 201]
            tasks = tasks_res.json()
            assert len(tasks) > 0

            # Add custom task
            custom_res = client.post(
                f"/api/v1/research/{session_id}/verification",
                json={
                    "title": "Validate PI visa waiver documentation with State Department",
                    "priority": "critical",
                    "recommended_action": "Consult immigration legal counsel prior to grant submission.",
                },
            )
            assert custom_res.status_code in [200, 201]
            custom_task_id = custom_res.json()["id"]

            # Toggle task completion
            toggle_res = client.post(f"/api/v1/verification/{custom_task_id}/toggle")
            assert toggle_res.status_code == 200
            assert toggle_res.json()["is_completed"] is True

            # =========================================================================
            # 8. GENERATE & DOWNLOAD PDF REPORT
            # =========================================================================
            # Check Evidence Graph
            graph_res = client.get(f"/api/v1/evidence/{session_id}/graph")
            assert graph_res.status_code == 200

            # Download Markdown
            md_res = client.get(f"/api/v1/reports/{session_id}/markdown")
            assert md_res.status_code == 200
            assert "PROOFPATH AI" in md_res.text

            # Download PDF Report
            pdf_res = client.get(f"/api/v1/reports/{session_id}/pdf")
            assert pdf_res.status_code == 200
            assert pdf_res.headers["content-type"] == "application/pdf"
            assert pdf_res.content.startswith(b"%PDF-")
            assert len(pdf_res.content) > 3000

        finally:
            # Clean up the test session and all cascading records
            client.delete(f"/api/v1/research/{session_id}")
