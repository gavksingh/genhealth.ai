# =============================================================================
# Vertex AI Configuration (replicated from weatherwise-agent)
# =============================================================================
# Source: /Users/gaurav/Documents/weatherwise-agent/agent-backend/llm_provider.py
#
# weatherwise-agent uses:
#   - langchain-google-vertexai ChatVertexAI wrapper
#   - model_name: "gemini-2.5-flash"
#   - project: env var VERTEX_PROJECT (project-cf964f7d-d79b-4b69-81c)
#   - location: env var VERTEX_LOCATION (us-central1)
#   - Auth: ADC via service account on Cloud Run
#   - IAM role: roles/aiplatform.user on the Cloud Run service account
#
# For this service, we use the google-genai SDK (successor to vertexai SDK)
# with Vertex AI backend. Same project, region, and model.
# =============================================================================

import json
import logging
import os
import fitz  # PyMuPDF
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

_CLIENT = None


def _get_client() -> genai.Client:
    global _CLIENT
    if _CLIENT is None:
        project = os.getenv(
            "GOOGLE_CLOUD_PROJECT",
            os.getenv("VERTEX_PROJECT", "project-cf964f7d-d79b-4b69-81c"),
        )
        location = os.getenv(
            "GCP_REGION",
            os.getenv("VERTEX_LOCATION", "us-central1"),
        )
        _CLIENT = genai.Client(
            vertexai=True,
            project=project,
            location=location,
        )
    return _CLIENT


EXTRACTION_PROMPT = """You are parsing a medical document. Extract ONLY the PATIENT's information.

IMPORTANT:
- Extract the PATIENT name, NOT the doctor, prescriber, or provider name.
- Normalize the date of birth to MM/DD/YYYY format.
- Return ONLY a valid JSON object with no markdown, no explanation, no extra text.

Return exactly this JSON format:
{"first_name": "...", "last_name": "...", "date_of_birth": "MM/DD/YYYY", "confidence": 0.0}

The confidence score should be between 0.0 and 1.0, where 1.0 means you are certain
about all extracted fields and 0.0 means you are guessing.
"""

RETRY_PROMPT = """Your previous response was not valid JSON. Try again.

Extract ONLY the PATIENT's name and date of birth from the medical document.
Return ONLY a JSON object in this exact format, nothing else:
{"first_name": "...", "last_name": "...", "date_of_birth": "MM/DD/YYYY", "confidence": 0.0}
"""


class PDFExtractor:
    def __init__(self):
        self.client = _get_client()
        self.model = "gemini-2.5-flash"

    def extract_text(self, pdf_path: str) -> str:
        """Extract all text from a PDF using PyMuPDF."""
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()

    def convert_pages_to_images(self, pdf_path: str, max_pages: int = 2) -> list[bytes]:
        """Convert first N pages of a PDF to PNG images."""
        doc = fitz.open(pdf_path)
        images = []
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            images.append(img_bytes)
        doc.close()
        return images

    def parse_response(self, response_text: str) -> dict | None:
        """Parse JSON from Gemini response, stripping markdown fences if present."""
        text = response_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()
        try:
            data = json.loads(text)
            if all(k in data for k in ("first_name", "last_name", "date_of_birth")):
                if "confidence" not in data:
                    data["confidence"] = 0.5
                return data
            return None
        except (json.JSONDecodeError, TypeError):
            return None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        before_sleep=lambda retry_state: logger.warning(
            f"Gemini API call failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    def _generate(self, contents: list) -> str:
        """Call Gemini and return text response with exponential backoff retry."""
        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
        )
        return response.text

    def extract_with_text(self, text: str) -> dict:
        """Send extracted text to Gemini for patient data extraction."""
        prompt = EXTRACTION_PROMPT + "\n\nDocument text:\n" + text[:10000]
        response_text = self._generate([prompt])
        result = self.parse_response(response_text)
        if result:
            return result

        retry_prompt = RETRY_PROMPT + "\n\nDocument text:\n" + text[:10000]
        response_text = self._generate([retry_prompt])
        result = self.parse_response(response_text)
        if result:
            return result

        raise ValueError("Failed to extract patient data from document text after retry")

    def extract_with_vision(self, images: list[bytes]) -> dict:
        """Send page images to Gemini using vision capability."""
        parts = [types.Part.from_text(text=EXTRACTION_PROMPT)]
        for img_bytes in images:
            parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))

        response_text = self._generate(parts)
        result = self.parse_response(response_text)
        if result:
            return result

        # Retry
        retry_parts = [types.Part.from_text(text=RETRY_PROMPT)]
        for img_bytes in images:
            retry_parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))

        response_text = self._generate(retry_parts)
        result = self.parse_response(response_text)
        if result:
            return result

        raise ValueError("Failed to extract patient data from document images after retry")

    def extract(self, pdf_path: str) -> dict:
        """Main entry point: extract patient data from a PDF.

        Uses text extraction first, falls back to vision for scanned PDFs.
        Returns dict with first_name, last_name, date_of_birth, confidence.
        """
        text = self.extract_text(pdf_path)

        if len(text) > 50:
            return self.extract_with_text(text)
        else:
            images = self.convert_pages_to_images(pdf_path)
            if not images:
                raise ValueError("PDF has no pages")
            return self.extract_with_vision(images)
