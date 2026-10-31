import socket
import ipaddress
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urlsplit, urljoin
import httpx
import trafilatura
from htmldate import find_date
from bs4 import BeautifulSoup
import dateparser

from app.ingestion.text_cleaner import clean_web_text
from app.ingestion.metadata_extractor import extract_domain, extract_date_from_string
from app.utils.chunker import chunk_text_with_provenance
from app.core.exceptions import IngestionError

logger = logging.getLogger(__name__)

# Security & size limits
MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_REDIRECTS = 5
REQUEST_TIMEOUT_SECONDS = 15.0


def validate_url_and_check_ssrf(url: str) -> None:
    """
    Validates URL syntax and performs strict anti-SSRF IP verification.
    Blocks private networks (RFC 1918), loopback, link-local, multicast, and unspecified addresses.
    """
    if not url or not isinstance(url, str):
        raise IngestionError("URL must be a non-empty string.")

    try:
        parts = urlsplit(url.strip())
    except Exception as e:
        raise IngestionError(f"Malformed URL structure: {e}")

    if parts.scheme.lower() not in ("http", "https"):
        raise IngestionError(f"Unsupported URL scheme '{parts.scheme}'. Only http:// and https:// are permitted.")

    hostname = parts.hostname
    if not hostname:
        raise IngestionError("URL is missing a valid hostname.")

    # Check for localhost literal
    if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        raise IngestionError(f"Access to localhost / loopback address '{hostname}' is blocked for security (SSRF prevention).")

    # Resolve hostname to all associated IP addresses
    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise IngestionError(f"Failed to resolve hostname '{hostname}': {e}")
    except Exception as e:
        raise IngestionError(f"DNS lookup error for '{hostname}': {e}")

    if not addr_infos:
        raise IngestionError(f"Could not resolve any IP address for host: {hostname}")

    for addr_info in addr_infos:
        ip_str = addr_info[4][0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            continue

        if ip_obj.is_loopback:
            raise IngestionError(f"Access to loopback IP '{ip_str}' is blocked (SSRF prevention).")
        if ip_obj.is_private:
            raise IngestionError(f"Access to private IP range '{ip_str}' is blocked (SSRF prevention).")
        if ip_obj.is_link_local:
            raise IngestionError(f"Access to link-local IP '{ip_str}' is blocked (SSRF prevention).")
        if ip_obj.is_multicast:
            raise IngestionError(f"Access to multicast IP '{ip_str}' is blocked (SSRF prevention).")
        if ip_obj.is_reserved:
            raise IngestionError(f"Access to reserved IP '{ip_str}' is blocked (SSRF prevention).")
        if ip_obj.is_unspecified:
            raise IngestionError(f"Access to unspecified IP '{ip_str}' is blocked (SSRF prevention).")


class WebScraper:
    @classmethod
    async def scrape_url(cls, url: str) -> Dict[str, Any]:
        """
        Securely and asynchronously fetches a webpage, performs anti-SSRF inspection,
        extracts clean article body, title, publisher, and publication dates.
        Strictly raises IngestionError on inaccessible or empty pages.
        """
        url = url.strip()
        validate_url_and_check_ssrf(url)

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36 ProofPathAI-Forensics/2.0"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        current_url = url
        redirects_count = 0
        response_headers: Dict[str, str] = {}
        raw_body_bytes = bytearray()

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=False) as client:
            while True:
                validate_url_and_check_ssrf(current_url)

                try:
                    async with client.stream("GET", current_url, headers=headers) as resp:
                        # Check redirect
                        if resp.is_redirect:
                            redirects_count += 1
                            if redirects_count > MAX_REDIRECTS:
                                raise IngestionError(f"Exceeded maximum redirect limit of {MAX_REDIRECTS}.")

                            location = resp.headers.get("location")
                            if not location:
                                raise IngestionError("Redirect response missing 'Location' header.")

                            current_url = urljoin(current_url, location)
                            continue

                        # Check HTTP status
                        if resp.status_code >= 400:
                            raise IngestionError(f"HTTP {resp.status_code} {resp.reason_phrase} fetching URL: {current_url}")

                        response_headers = dict(resp.headers)

                        # Enforce download cap
                        content_length = resp.headers.get("content-length")
                        if content_length and int(content_length) > MAX_DOWNLOAD_BYTES:
                            raise IngestionError(
                                f"Webpage size ({int(content_length)/(1024*1024):.1f} MB) exceeds maximum allowed size of 15 MB."
                            )

                        async for chunk in resp.aiter_bytes():
                            raw_body_bytes.extend(chunk)
                            if len(raw_body_bytes) > MAX_DOWNLOAD_BYTES:
                                raise IngestionError(
                                    f"Downloaded content exceeded maximum size limit of 15 MB."
                                )

                        break
                except httpx.TimeoutException:
                    raise IngestionError(f"Network timeout after {REQUEST_TIMEOUT_SECONDS}s fetching: {current_url}")
                except httpx.RequestError as e:
                    raise IngestionError(f"Network connection error fetching URL: {str(e)}")

        # Decode HTML content
        encoding = "utf-8"
        try:
            html_content = raw_body_bytes.decode(encoding)
        except UnicodeDecodeError:
            html_content = raw_body_bytes.decode("latin-1", errors="replace")

        if not html_content.strip():
            raise IngestionError("Fetched webpage returned completely empty HTML content.")

        # 1. Trafilatura main body extraction
        extracted_text = trafilatura.extract(
            html_content,
            include_comments=False,
            include_tables=True,
            no_fallback=False
        )

        # 2. BeautifulSoup parsing for metadata, title, author, and fallback text
        soup = BeautifulSoup(html_content, "html.parser")

        # Extract title
        title = ""
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()
        elif soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            title = soup.find("h1").get_text().strip()

        if not title:
            title = current_url

        # Extract author / publisher
        author = None
        author_meta = soup.find("meta", attrs={"name": "author"}) or soup.find("meta", property="article:author")
        if author_meta and author_meta.get("content"):
            author = author_meta["content"].strip()
        elif soup.find("meta", property="og:site_name"):
            author = soup.find("meta", property="og:site_name")["content"].strip()

        # Fallback to paragraph extraction if Trafilatura returned nothing
        if not extracted_text or len(extracted_text.strip()) < 30:
            paragraphs = [p.get_text().strip() for p in soup.find_all(["p", "article", "section"])]
            extracted_text = "\n\n".join(p for p in paragraphs if len(p) > 20)

        cleaned_text = clean_web_text(extracted_text)
        if not cleaned_text:
            raise IngestionError("No readable article or document text could be extracted from webpage.")

        # 3. Detect publication date
        pub_date = None
        # Try og:article:published_time or article:published_time
        meta_pub = soup.find("meta", property="article:published_time") or soup.find("meta", attrs={"name": "publication_date"})
        if meta_pub and meta_pub.get("content"):
            pub_date = dateparser.parse(meta_pub["content"])

        if not pub_date:
            detected_date_str = find_date(html_content)
            if detected_date_str:
                pub_date = dateparser.parse(detected_date_str)

        if not pub_date:
            pub_date = extract_date_from_string(cleaned_text[:1500])

        # 4. Detect last modified date
        last_mod_date = None
        meta_mod = soup.find("meta", property="article:modified_time")
        if meta_mod and meta_mod.get("content"):
            last_mod_date = dateparser.parse(meta_mod["content"])
        elif "last-modified" in response_headers:
            last_mod_date = dateparser.parse(response_headers["last-modified"])

        # 5. Extract domain
        domain = extract_domain(current_url)

        # 6. Generate chunks with provenance
        chunks = chunk_text_with_provenance(cleaned_text, max_words=350, overlap_words=40)

        return {
            "title": title,
            "url": current_url,
            "domain": domain,
            "full_text": cleaned_text,
            "publication_date": pub_date,
            "last_modified_date": last_mod_date,
            "author": author,
            "headers": response_headers,
            "chunks": chunks,
        }
