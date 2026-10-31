import os
import json
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class BaseAgent:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.groq_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")

    async def call_llm_json(self, prompt: str, system_instruction: str = "") -> Dict[str, Any]:
        """
        Executes prompt targeting structured JSON output.
        Tries Gemini first, then Groq, then heuristic fallback.
        """
        # 1. Try Gemini
        if self.gemini_key:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=self.gemini_key)
                response = client.models.generate_content(
                    model=settings.PRIMARY_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction or "You are an expert AI forensic information analyst. Respond strictly in valid JSON.",
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )
                if response.text:
                    return json.loads(response.text)
            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}. Attempting fallback...")

        # 2. Try Groq
        if self.groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_key)
                completion = client.chat.completions.create(
                    model=settings.FALLBACK_MODEL,
                    messages=[
                        {"role": "system", "content": system_instruction + " Respond ONLY in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )
                content = completion.choices[0].message.content
                if content:
                    return json.loads(content)
            except Exception as e:
                logger.warning(f"Groq API call failed: {e}. Attempting heuristic fallback...")

        # 3. Fallback to heuristic parser if APIs unavailable
        logger.info("Using heuristic agent logic (no valid LLM key provided or rate limited).")
        return self._heuristic_fallback(prompt)

    def _heuristic_fallback(self, prompt: str) -> Dict[str, Any]:
        """Override in subclasses to provide intelligent offline defaults."""
        return {}
