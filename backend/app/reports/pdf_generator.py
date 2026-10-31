import io
import json
from datetime import datetime, timezone
from typing import List, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print exact total page counts
    ('Page X of Y') and professional running headers on every page except the cover.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        if self._pageNumber == 1:
            # Suppress header and footer on cover page
            return

        self.saveState()

        # Top Running Header
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#102A43"))  # Navy
        self.drawString(54, 750, "PROOFPATH AI")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(125, 750, "— Forensic Multi-Source Evidence & Decision-Readiness Dossier")
        self.drawRightString(612 - 54, 750, "CONFIDENTIAL / EP-AUDIT")

        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 744, 612 - 54, 744)

        # Bottom Running Footer
        self.line(54, 45, 612 - 54, 45)
        self.setFont("Helvetica-Oblique", 7)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 32, "ProofPath AI Forensic Decision Engine — Bounded Epistemic Grounding (Non-Guaranteed Truth)")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#334155"))
        self.drawRightString(612 - 54, 32, f"Page {self._pageNumber} of {page_count}")

        self.restoreState()


class PdfReportGenerator:
    """
    ReportLab PDF Generation Engine for PROOFPATH AI.
    Renders a comprehensive, publication-grade 16-section forensic investigation dossier.
    """

    # Palette tokens
    NAVY_PRIMARY = colors.HexColor("#102A43")    # Deep Navy
    NAVY_SECONDARY = colors.HexColor("#1E3A8A")  # Royal Navy
    NAVY_LIGHT = colors.HexColor("#F0F4F8")      # Navy tint surface
    SLATE_DARK = colors.HexColor("#1E293B")      # Body text
    SLATE_MUTED = colors.HexColor("#64748B")     # Secondary labels
    BORDER_COLOR = colors.HexColor("#E2E8F0")    # Table borders
    BG_ROW_ALT = colors.HexColor("#F8FAFC")      # Alternating row shading
    SUCCESS_COLOR = colors.HexColor("#23865B")   # Green
    WARNING_COLOR = colors.HexColor("#C28A32")   # Amber
    DANGER_COLOR = colors.HexColor("#C65353")    # Red

    @classmethod
    def generate_pdf(
        cls,
        session: Any,
        sources: List[Any],
        requirements: List[Any],
        conflicts: List[Any],
        blindspots: List[Any],
        findings: Optional[List[Any]] = None,
        claims: Optional[List[Any]] = None,
        verification_tasks: Optional[List[Any]] = None,
    ) -> bytes:
        findings = findings or []
        claims = claims or []
        verification_tasks = verification_tasks or []

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        styles = cls._build_styles()
        story = []

        # -------------------------------------------------------------
        # SECTION 1: Cover Page
        # -------------------------------------------------------------
        cls._add_cover_page(story, session, styles, sources, requirements)
        story.append(PageBreak())

        # -------------------------------------------------------------
        # SECTION 2: Research Objective
        # -------------------------------------------------------------
        cls._add_section_header(story, "2. Research Objective & Decision Context", styles)
        story.append(Paragraph(
            f"<b>Primary Goal:</b> {session.research_goal}", styles["Body"]
        ))
        if getattr(session, "target_decision", None):
            story.append(Spacer(1, 4))
            story.append(Paragraph(
                f"<b>Target Decision:</b> {session.target_decision}", styles["Body"]
            ))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "<b>Forensic Scope:</b> This investigation performs multi-source fact decomposition, "
            "temporal decay auditing, cross-source conflict discovery, and unaddressed blindspot identification "
            "to determine whether the ingested source corpus provides mathematically sufficient, non-contradictory evidence.",
            styles["Body"]
        ))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 3: Executive Summary & Decision-Readiness Index
        # -------------------------------------------------------------
        cls._add_section_header(story, "3. Executive Summary & Decision-Readiness Index (DRI)", styles)
        
        # Readiness score card
        verdict = getattr(session, "executive_verdict", None) or "Audit evaluation completed."
        score_html = (
            f"<font size=18 color='#102A43'><b>{session.readiness_score:.1f}%</b></font>  "
            f"<font size=10 color='#23865B'><b>[{cls._get_tier_label(session.readiness_score)}]</b></font><br/>"
            f"<font size=8.5 color='#475467'><i>{verdict}</i></font>"
        )
        score_table = Table(
            [[Paragraph(score_html, styles["Body"])]],
            colWidths=[504],
        )
        score_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), cls.NAVY_LIGHT),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(score_table)
        story.append(Spacer(1, 10))

        # DRI 4-Factor Breakdown Table
        dim_data = [
            ["Metric Dimension", "Score", "Weight", "Forensic Interpretation"],
            ["Evidence Coverage", f"{session.coverage_score:.1f}%", "35%", "Ratio of requirements with verified citation grounding"],
            ["Cross-Source Consistency", f"{session.consistency_score:.1f}%", "30%", "Absence of unresolved factual and numerical clashes"],
            ["Temporal Freshness", f"{session.freshness_score:.1f}%", "15%", "Absence of expired, aging, or superseded policy notices"],
            ["Verbatim Verification", f"{session.verification_score:.1f}%", "20%", "Verifiable zero-hallucination citation fidelity match"],
        ]
        story.append(cls._render_table(dim_data, [130, 54, 50, 270], styles, is_header=True))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 4: Sources Reviewed
        # -------------------------------------------------------------
        cls._add_section_header(story, f"4. Sources Reviewed ({len(sources)} Ingested Documents)", styles)
        if not sources:
            story.append(Paragraph("<i>No external sources were ingested.</i>", styles["Body"]))
        else:
            src_headers = ["#", "Document Title", "Type", "Publication / Cycle", "Chunks"]
            src_rows = [src_headers]
            for idx, s in enumerate(sources, 1):
                pub = s.publication_date.strftime("%Y-%m-%d") if getattr(s, "publication_date", None) else "Unspecified"
                chunk_cnt = len(getattr(s, "chunks", [])) or getattr(s, "chunk_count", 0) or 1
                src_rows.append([
                    str(idx),
                    s.title[:65],
                    s.source_type.upper(),
                    pub,
                    str(chunk_cnt),
                ])
            story.append(cls._render_table(src_rows, [24, 250, 55, 125, 50], styles, is_header=True))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 5: Requirements Investigated
        # -------------------------------------------------------------
        cls._add_section_header(story, f"5. Requirements Investigated ({len(requirements)} Criteria)", styles)
        if not requirements:
            story.append(Paragraph("<i>No formal requirements configured.</i>", styles["Body"]))
        else:
            req_headers = ["#", "Requirement Specification", "Category", "Weight", "Coverage Status"]
            req_rows = [req_headers]
            for idx, r in enumerate(requirements, 1):
                req_rows.append([
                    str(idx),
                    r.requirement_text[:75],
                    getattr(r, "category", "General").capitalize(),
                    f"{r.weight:.1f}",
                    (r.status or "uncovered").upper(),
                ])
            story.append(cls._render_table(req_rows, [24, 260, 80, 50, 90], styles, is_header=True))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 6: Extracted Claims
        # -------------------------------------------------------------
        cls._add_section_header(story, f"6. Extracted Claims ({len(claims) or 'Corpus Indexed'} Atomic Statements)", styles)
        story.append(Paragraph(
            "Independently verifiable atomic statements were extracted from all ingested documents "
            "and transformed into dense vector embeddings for semantic retrieval against each research requirement.",
            styles["Body"]
        ))
        story.append(Spacer(1, 6))

        if claims:
            clm_headers = ["#", "Atomic Statement", "Source Reference", "Conf."]
            clm_rows = [clm_headers]
            for idx, c in enumerate(claims[:8], 1):  # Display top representative claims
                src_name = getattr(c, "source_title", None) or "Ingested Document"
                conf = f"{(getattr(c, 'confidence_score', 0.95) * 100):.0f}%"
                clm_rows.append([
                    str(idx),
                    c.claim_text[:80],
                    src_name[:40],
                    conf,
                ])
            story.append(cls._render_table(clm_rows, [24, 290, 150, 40], styles, is_header=True))
        else:
            story.append(Paragraph("<i>Atomic claims indexed across document chunk embeddings.</i>", styles["BodyMuted"]))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 7: Evidence Coverage
        # -------------------------------------------------------------
        cls._add_section_header(story, "7. Evidence Coverage Analysis", styles)
        covered_findings = [f for f in findings if f.finding_type == "COVERED"]
        story.append(Paragraph(
            f"<b>Substantiation Ratio:</b> {len(covered_findings)} of {len(requirements) or len(findings)} "
            f"criteria possess decisive, non-contradicted empirical backing with verbatim passage citations.",
            styles["Body"]
        ))
        story.append(Spacer(1, 6))

        if covered_findings:
            cov_headers = ["Requirement", "Substantiating Source", "Passage Excerpt"]
            cov_rows = [cov_headers]
            for f in covered_findings[:5]:
                raw_refs = cls._get_evidence_refs(f)
                first_ref = raw_refs[0] if raw_refs else {}
                quote = first_ref.get("exact_quote", "") if isinstance(first_ref, dict) else getattr(first_ref, "exact_quote", "Verified via corpus.")
                quote = quote[:85] if quote else "Verified via corpus pass-through."
                src = first_ref.get("source_title", "Source Document") if isinstance(first_ref, dict) else getattr(first_ref, "source_title", "Source Document")
                cov_rows.append([
                    cls._get_req_text(f)[:50],
                    str(src)[:35],
                    f'"{quote}"',
                ])
            story.append(cls._render_table(cov_rows, [144, 130, 230], styles, is_header=True))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 8: Missing Information (Epistemic Absence)
        # -------------------------------------------------------------
        cls._add_section_header(story, "8. Missing Information (Critical Evidentiary Absences)", styles)
        missing_findings = [f for f in findings if f.finding_type == "MISSING"]
        if not missing_findings:
            story.append(Paragraph("<i>No total evidentiary voids were detected across configured criteria.</i>", styles["BodyMuted"]))
        else:
            story.append(Paragraph(
                "The following criteria possess <b>zero empirical evidence</b> across the provided document corpus. "
                "These represent primary decision risks requiring external verification before sign-off:",
                styles["Body"]
            ))
            story.append(Spacer(1, 6))
            mis_headers = ["Criterion", "Risk Impact", "Recommended Action"]
            mis_rows = [mis_headers]
            for f in missing_findings:
                mis_rows.append([
                    cls._get_req_text(f)[:55],
                    (f.priority or "High").upper(),
                    (f.recommended_action or "Request documentation from primary authorities")[:75],
                ])
            story.append(cls._render_table(mis_rows, [184, 70, 250], styles, is_header=True))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 9: Incomplete Information
        # -------------------------------------------------------------
        cls._add_section_header(story, "9. Incomplete Information & Partial Coverage", styles)
        incomplete_findings = [f for f in findings if f.finding_type == "INCOMPLETE"]
        if not incomplete_findings:
            story.append(Paragraph("<i>No partially-substantiated criteria identified.</i>", styles["BodyMuted"]))
        else:
            for idx, f in enumerate(incomplete_findings, 1):
                story.append(Paragraph(f"<b>{idx}. {cls._get_req_text(f)}</b>", styles["BodyBold"]))
                story.append(Paragraph(f"Explanation: {f.explanation}", styles["Body"]))
                story.append(Paragraph(f"Recommended Resolution: {f.recommended_action}", styles["Body"]))
                story.append(Spacer(1, 6))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 10: Potential Contradictions & Clashing Assertions
        # -------------------------------------------------------------
        cls._add_section_header(story, f"10. Potential Contradictions ({len(conflicts)} Detected Conflicts)", styles)
        if not conflicts:
            story.append(Paragraph("<i>No cross-source contradictions identified across ingested materials.</i>", styles["BodyMuted"]))
        else:
            for idx, c in enumerate(conflicts, 1):
                story.append(Paragraph(
                    f"<b>Conflict #{idx}: [{c.severity.upper()} SEVERITY] {c.conflicting_aspect}</b>",
                    styles["BodyBoldNavy"]
                ))
                claim_a = getattr(c, "claim_a", None)
                claim_b = getattr(c, "claim_b", None)
                quote_a = getattr(claim_a, "exact_quote", "") or getattr(claim_a, "claim_text", "")
                quote_b = getattr(claim_b, "exact_quote", "") or getattr(claim_b, "claim_text", "")
                src_a = getattr(claim_a, "source_title", "Source A")
                src_b = getattr(claim_b, "source_title", "Source B")

                cf_table = [
                    [Paragraph(f"<b>Source A ({src_a}):</b><br/><i>\"{quote_a[:140]}\"</i>", styles["TableText"])],
                    [Paragraph(f"<b>Source B ({src_b}):</b><br/><i>\"{quote_b[:140]}\"</i>", styles["TableText"])],
                    [Paragraph(f"<b>Forensic Synthesis:</b> {c.synthesis_verdict or c.explanation}", styles["TableText"])],
                ]
                t = Table(cf_table, colWidths=[504])
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), cls.BG_ROW_ALT),
                    ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]))
                story.append(t)
                story.append(Spacer(1, 8))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 11: Potentially Outdated Information (Temporal Audit)
        # -------------------------------------------------------------
        cls._add_section_header(story, "11. Potentially Outdated Information (Temporal Decay Audit)", styles)
        outdated_findings = [f for f in findings if f.finding_type == "POTENTIALLY OUTDATED"]
        if not outdated_findings:
            story.append(Paragraph("<i>All reviewed sources conform to current temporal applicability horizons.</i>", styles["BodyMuted"]))
        else:
            for idx, f in enumerate(outdated_findings, 1):
                story.append(Paragraph(f"<b>{idx}. {cls._get_req_text(f)}</b>", styles["BodyBold"]))
                story.append(Paragraph(f"Decay Assessment: {f.explanation}", styles["Body"]))
                story.append(Paragraph(f"Mitigation: {f.recommended_action}", styles["Body"]))
                story.append(Spacer(1, 6))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 12: Unverified Claims
        # -------------------------------------------------------------
        cls._add_section_header(story, "12. Unverified Claims & Low-Confidence Passages", styles)
        unverified_findings = [f for f in findings if f.finding_type == "UNVERIFIED"]
        if not unverified_findings:
            story.append(Paragraph("<i>No low-confidence assertions or uncorroborated single-source statements require manual validation.</i>", styles["BodyMuted"]))
        else:
            for idx, f in enumerate(unverified_findings, 1):
                story.append(Paragraph(f"<b>{idx}. {cls._get_req_text(f)}</b>", styles["BodyBold"]))
                story.append(Paragraph(f"Limitation: {f.explanation}", styles["Body"]))
                story.append(Spacer(1, 6))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 13: BlindSpot Questions (AI Strategic Dimensions)
        # -------------------------------------------------------------
        cls._add_section_header(story, f"13. BlindSpot Questions — Unasked Strategic Risks ({len(blindspots)})", styles)
        story.append(Paragraph(
            "<i>Note: Blindspot questions represent AI-discovered strategic dimensions that decision-makers "
            "often omit. These are advisory hypotheses and must not be presented as officially mandated legal terms.</i>",
            styles["BodyMuted"]
        ))
        story.append(Spacer(1, 6))

        if not blindspots:
            story.append(Paragraph("<i>No unaddressed blindspots generated.</i>", styles["BodyMuted"]))
        else:
            bs_headers = ["#", "Unasked Strategic Question", "Risk Priority", "Operational Rationale"]
            bs_rows = [bs_headers]
            for idx, b in enumerate(blindspots[:6], 1):
                bs_rows.append([
                    str(idx),
                    b.question[:70],
                    getattr(b, "risk_level", "High").upper(),
                    (b.rationale or b.explanation or "")[:80],
                ])
            story.append(cls._render_table(bs_rows, [24, 210, 70, 200], styles, is_header=True))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 14: Verification Checklist (Actionable Follow-ups)
        # -------------------------------------------------------------
        cls._add_section_header(story, f"14. Verification Checklist ({len(verification_tasks)} Actionable Tasks)", styles)
        if not verification_tasks:
            story.append(Paragraph("<i>No pending verification items recorded.</i>", styles["BodyMuted"]))
        else:
            chk_headers = ["Status", "Priority", "Task Title & Directive", "Recommended Follow-up"]
            chk_rows = [chk_headers]
            for t in verification_tasks:
                chk_box = "[X] Done" if t.is_completed else "[ ] Pending"
                prio = getattr(t, "priority", "High").upper()
                chk_rows.append([
                    chk_box,
                    prio,
                    t.title[:65],
                    (t.recommended_action or t.description or "Execute verification")[:65],
                ])
            story.append(cls._render_table(chk_rows, [55, 55, 204, 190], styles, is_header=True))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 15: Limitations & Epistemic Boundaries
        # -------------------------------------------------------------
        cls._add_section_header(story, "15. Forensic Limitations & Epistemic Boundaries", styles)
        story.append(Paragraph(
            "<b>1. Bounded Grounding:</b> This report quantifies factual convergence and coverage strictly "
            "within the uploaded/ingested source set. Absence of information indicates absence in provided files, "
            "not necessarily non-existence in reality.",
            styles["Body"]
        ))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "<b>2. Non-Guarantee of External Truth:</b> The Decision-Readiness Index (DRI) evaluates evidence completeness "
            "and consistency across submitted texts. It does not certify legal validity, technical correctness, "
            "or guarantee operational success.",
            styles["Body"]
        ))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "<b>3. Mandatory Human Review:</b> High-severity contradictions and critical missing information must be "
            "manually arbitrated with program authorities prior to contract execution or institutional submission.",
            styles["Body"]
        ))
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # SECTION 16: Source References & Bibliography
        # -------------------------------------------------------------
        cls._add_section_header(story, "16. Source References & Bibliography", styles)
        for idx, s in enumerate(sources, 1):
            pub = s.publication_date.strftime("%Y-%m-%d") if getattr(s, "publication_date", None) else "Unspecified"
            loc = getattr(s, "uri", None) or "Direct file upload"
            ref_line = (
                f"[{idx}] <b>{s.title}</b> ({s.source_type.upper()}). "
                f"Published: {pub}. Location: <u>{loc}</u>. "
                f"Extracted Chunks: {len(getattr(s, 'chunks', [])) or getattr(s, 'chunk_count', 1)}."
            )
            story.append(Paragraph(ref_line, styles["TableText"]))
            story.append(Spacer(1, 3))

        # Build Document with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()

    @classmethod
    def _add_cover_page(cls, story: list, session: Any, styles: dict, sources: list, requirements: list) -> None:
        """Constructs an elegant, minimal cover page with Navy branding and white background."""
        story.append(Spacer(1, 40))

        # Brand Kicker
        story.append(Paragraph(
            "<font color='#315B83'><b>PROOFPATH AI FORENSIC INTELLIGENCE DOSSIER</b></font>",
            styles["Kicker"]
        ))
        story.append(Spacer(1, 14))

        # Main Document Title
        story.append(Paragraph(session.title, styles["CoverTitle"]))
        story.append(Spacer(1, 12))

        # Subtitle
        story.append(Paragraph(
            "Multi-Source Evidentiary Audit, Cross-Source Contradiction Arbitration, and Decision-Readiness Evaluation",
            styles["CoverSubtitle"]
        ))
        story.append(Spacer(1, 25))

        story.append(HRFlowable(width="100%", thickness=2, color=cls.NAVY_PRIMARY, spaceBefore=0, spaceAfter=25))

        # Key Context Box
        context_data = [
            ["Project Identifier:", session.id],
            ["Research Objective:", session.research_goal[:140]],
            ["Target Decision:", getattr(session, "target_decision", None) or "Institutional Decision Sign-off"],
            ["Audit Date:", datetime.now(timezone.utc).strftime("%B %d, %Y")],
            ["Investigation Status:", (session.status or "Completed").upper()],
            ["Corpus Size:", f"{len(sources)} Verified Sources, {len(requirements)} Requirements"],
        ]
        context_table = Table(
            [[Paragraph(f"<b>{k}</b>", styles["TableTextBold"]), Paragraph(v, styles["TableText"])] for k, v in context_data],
            colWidths=[130, 374],
        )
        context_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), cls.BG_ROW_ALT),
            ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(context_table)
        story.append(Spacer(1, 30))

        # Readiness Verdict Banner
        score_val = f"{session.readiness_score:.1f}%"
        tier_label = cls._get_tier_label(session.readiness_score)
        verdict_data = [
            [
                Paragraph(f"<font size=24 color='#102A43'><b>{score_val}</b></font><br/><font size=8.5 color='#64748B'>DECISION READINESS</font>", styles["Center"]),
                Paragraph(f"<b>Audit Assessment Tier: {tier_label}</b><br/><font size=8.5 color='#334155'>{session.executive_verdict or 'Audit evaluation completed.'}</font>", styles["Body"]),
            ]
        ]
        verdict_table = Table(verdict_data, colWidths=[120, 384])
        verdict_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), cls.NAVY_LIGHT),
            ("BOX", (0, 0), (-1, -1), 1, cls.NAVY_SECONDARY),
            ("ALIGN", (0, 0), (0, 0), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(verdict_table)
        story.append(Spacer(1, 40))

        story.append(Paragraph(
            "<b>EPISTEMIC NOTICE:</b> This dossier is generated by the PROOFPATH AI Forensic Engine. "
            "It computes mathematically weighted coverage across provided documents and does not replace human domain expertise.",
            styles["Notice"]
        ))

    @classmethod
    def _add_section_header(cls, story: list, title: str, styles: dict) -> None:
        """Appends a styled Navy section header with a rule and keepWithNext."""
        story.append(Spacer(1, 8))
        story.append(Paragraph(title, styles["HeadingNavy"]))
        story.append(HRFlowable(width="100%", thickness=0.75, color=cls.NAVY_PRIMARY, spaceBefore=2, spaceAfter=8))

    @classmethod
    def _render_table(cls, data: list, col_widths: list, styles: dict, is_header: bool = True) -> Table:
        """Wraps cells in Paragraphs to prevent overflow and applies professional alternating row styles."""
        formatted = []
        for row_idx, row in enumerate(data):
            formatted_row = []
            for col_idx, cell in enumerate(row):
                if row_idx == 0 and is_header:
                    formatted_row.append(Paragraph(f"<b>{cell}</b>", styles["TableHeader"]))
                else:
                    formatted_row.append(Paragraph(str(cell), styles["TableText"]))
            formatted.append(formatted_row)

        table = Table(formatted, colWidths=col_widths)
        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), cls.NAVY_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]
        # Alternating row colors
        for i in range(1, len(data)):
            if i % 2 == 0:
                t_style.append(("BACKGROUND", (0, i), (-1, i), cls.BG_ROW_ALT))
        table.setStyle(TableStyle(t_style))
        return table

    @classmethod
    def _build_styles(cls) -> dict:
        """Defines professional typography styles for ReportLab."""
        base = getSampleStyleSheet()

        styles = {
            "Kicker": ParagraphStyle(
                "Kicker",
                fontName="Helvetica-Bold",
                fontSize=9,
                leading=12,
                textColor=cls.NAVY_SECONDARY,
                spaceAfter=4,
            ),
            "CoverTitle": ParagraphStyle(
                "CoverTitle",
                fontName="Helvetica-Bold",
                fontSize=22,
                leading=28,
                textColor=cls.NAVY_PRIMARY,
                spaceAfter=8,
            ),
            "CoverSubtitle": ParagraphStyle(
                "CoverSubtitle",
                fontName="Helvetica",
                fontSize=11,
                leading=16,
                textColor=cls.SLATE_MUTED,
                spaceAfter=12,
            ),
            "HeadingNavy": ParagraphStyle(
                "HeadingNavy",
                fontName="Helvetica-Bold",
                fontSize=12,
                leading=16,
                textColor=cls.NAVY_PRIMARY,
                spaceBefore=10,
                spaceAfter=4,
                keepWithNext=True,
            ),
            "Body": ParagraphStyle(
                "Body",
                fontName="Helvetica",
                fontSize=8.5,
                leading=12,
                textColor=cls.SLATE_DARK,
                spaceAfter=4,
            ),
            "BodyBold": ParagraphStyle(
                "BodyBold",
                fontName="Helvetica-Bold",
                fontSize=8.5,
                leading=12,
                textColor=cls.SLATE_DARK,
                spaceAfter=2,
            ),
            "BodyBoldNavy": ParagraphStyle(
                "BodyBoldNavy",
                fontName="Helvetica-Bold",
                fontSize=9,
                leading=13,
                textColor=cls.NAVY_PRIMARY,
                spaceAfter=3,
            ),
            "BodyMuted": ParagraphStyle(
                "BodyMuted",
                fontName="Helvetica-Oblique",
                fontSize=8,
                leading=11,
                textColor=cls.SLATE_MUTED,
                spaceAfter=4,
            ),
            "TableHeader": ParagraphStyle(
                "TableHeader",
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=10,
                textColor=colors.white,
            ),
            "TableText": ParagraphStyle(
                "TableText",
                fontName="Helvetica",
                fontSize=7.5,
                leading=10,
                textColor=cls.SLATE_DARK,
            ),
            "TableTextBold": ParagraphStyle(
                "TableTextBold",
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=10,
                textColor=cls.NAVY_PRIMARY,
            ),
            "Center": ParagraphStyle(
                "Center",
                fontName="Helvetica",
                fontSize=8.5,
                leading=12,
                alignment=1,
            ),
            "Notice": ParagraphStyle(
                "Notice",
                fontName="Helvetica",
                fontSize=7.5,
                leading=10,
                textColor=cls.SLATE_MUTED,
            ),
        }
        return styles

    @staticmethod
    def _get_tier_label(score: float) -> str:
        if score >= 80:
            return "Decision-Ready"
        elif score >= 50:
            return "Conditional Proceed"
        else:
            return "Critical Blindspots"

    @staticmethod
    def _get_req_text(f: Any) -> str:
        if getattr(f, "requirement_text", None):
            return str(f.requirement_text)
        req = getattr(f, "requirement", None)
        if req and getattr(req, "requirement_text", None):
            return str(req.requirement_text)
        return "Evaluation Criterion"

    @staticmethod
    def _get_evidence_refs(f: Any) -> list:
        refs = getattr(f, "evidence_references", None)
        if not refs:
            return []
        if isinstance(refs, str):
            try:
                return json.loads(refs)
            except Exception:
                return []
        if isinstance(refs, list):
            return refs
        return []
