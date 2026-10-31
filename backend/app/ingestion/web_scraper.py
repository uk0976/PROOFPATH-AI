import logging
from typing import Dict, Any, List, Optional
import httpx
import trafilatura
from htmldate import find_date
from bs4 import BeautifulSoup
import dateparser
from app.utils.chunker import chunk_text_with_provenance
from app.utils.text import normalize_whitespace

logger = logging.getLogger(__name__)


class WebScraper:
    @staticmethod
    async def scrape_url(url: str) -> Dict[str, Any]:
        """
        Asynchronously fetches and extracts the core textual content, title,
        and publication date from a web URL.
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ProofPathAI/1.0"
        }

        async with httpx.AsyncClient(follow_redirects=True, timeout=25.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            html_content = response.text

        # 1. Trafilatura main body extraction
        downloaded = html_content
        extracted_text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=True,
            no_fallback=False
        )

        # 2. BeautifulSoup fallback / title extraction
        soup = BeautifulSoup(html_content, "html.parser")
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            title = soup.find("h1").get_text().strip()

        if not extracted_text:
            # Fallback to cleaning body paragraphs
            paragraphs = [p.get_text() for p in soup.find_all(["p", "article", "section"])]
            extracted_text = "\n\n".join(paragraphs)

        extracted_text = normalize_whitespace(extracted_text)
        if not title:
            title = url

        # 3. Detect publication date
        pub_date = None
        detected_date_str = find_date(downloaded)
        if detected_date_str:
            pub_date = dateparser.parse(detected_date_str)

        # 4. Chunk content
        chunks = chunk_text_with_provenance(extracted_text, max_words=350, overlap_words=40)

        return {
            "title": title,
            "url": url,
            "full_text": extracted_text,
            "publication_date": pub_date,
            "chunks": chunks,
        }
