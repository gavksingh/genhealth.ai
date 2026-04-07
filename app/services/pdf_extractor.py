# =============================================================================
# Vertex AI PDF Extraction — Optimized for speed
# =============================================================================

import json
import logging
import os
import re
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


def warm_up_client():
    """Pre-initialize the Gemini client on app startup to avoid cold-start penalty."""
    try:
        _get_client()
        logger.info("Gemini client warmed up successfully")
    except Exception as e:
        logger.warning(f"Gemini client warm-up failed (will retry on first request): {e}")


EXTRACTION_PROMPT = """You are parsing a medical document. Extract ONLY the PATIENT's information.

IMPORTANT:
- Extract the PATIENT name, NOT the doctor, prescriber, or provider name.
- Normalize the date of birth to MM/DD/YYYY format.
"""

EXTRACTION_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "first_name": types.Schema(type=types.Type.STRING),
        "last_name": types.Schema(type=types.Type.STRING),
        "date_of_birth": types.Schema(type=types.Type.STRING),
        "confidence": types.Schema(type=types.Type.NUMBER),
    },
    required=["first_name", "last_name", "date_of_birth", "confidence"],
)

GENERATION_CONFIG = types.GenerateContentConfig(
    response_mime_type="application/json",
    response_schema=EXTRACTION_SCHEMA,
    max_output_tokens=512,
    temperature=0.0,
)


class PDFExtractor:
    def __init__(self):
        self.client = _get_client()
        self.model = "gemini-2.5-flash"

    def validate_pdf(self, pdf_bytes: bytes) -> fitz.Document:
        """Validate and open a PDF, raising clear errors for bad input."""
        if not pdf_bytes or len(pdf_bytes) < 10:
            raise ValueError("File is empty or too small to be a valid PDF")
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise ValueError(f"Cannot open PDF: {str(e)}")
        if doc.page_count == 0:
            doc.close()
            raise ValueError("PDF has no pages")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF is password-protected and cannot be read")
        return doc

    def extract_text(self, pdf_bytes: bytes) -> str:
        """Extract all text from a PDF using PyMuPDF (from bytes, no temp file)."""
        doc = self.validate_pdf(pdf_bytes)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()

    def convert_pages_to_images(self, pdf_bytes: bytes, max_pages: int = 1) -> list[bytes]:
        """Convert first N pages of a PDF to JPEG images (150 DPI for speed)."""
        doc = self.validate_pdf(pdf_bytes)
        images = []
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("jpeg")
            images.append(img_bytes)
        doc.close()
        return images

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type((ConnectionError, TimeoutError, OSError)),
        before_sleep=lambda retry_state: logger.warning(
            f"Gemini API call failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    async def _agenerate(self, contents: list) -> str:
        """Call Gemini async with JSON mode and return text response."""
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=contents,
            config=GENERATION_CONFIG,
        )
        if response.text is None:
            # Safety filter or empty response
            raise ValueError(
                "Gemini returned no content — the document may have been blocked by safety filters "
                "or does not contain extractable patient information"
            )
        return response.text

    def _parse_result(self, response_text: str) -> dict:
        """Parse Gemini JSON response with robust fallback for malformed output."""
        text = response_text.strip()

        # Strip markdown code fences if present (```json ... ```)
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()

        # First try: direct parse
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Fix truncated JSON — try progressively
            fixed = False
            # Case: "confidence": (no value)
            text_fixed = re.sub(r'"confidence"\s*:\s*$', '"confidence": 0.5}', text)
            if text_fixed != text:
                try:
                    data = json.loads(text_fixed)
                    fixed = True
                except json.JSONDecodeError:
                    pass

            if not fixed:
                # Case: missing closing brace
                if not text.rstrip().endswith("}"):
                    try:
                        data = json.loads(text.rstrip().rstrip(",") + "}")
                        fixed = True
                    except json.JSONDecodeError:
                        pass

            if not fixed:
                # Case: extract JSON object from surrounding text
                match = re.search(r'\{[^{}]*\}', text)
                if match:
                    try:
                        data = json.loads(match.group())
                        fixed = True
                    except json.JSONDecodeError:
                        pass

            if not fixed:
                logger.error(f"Unparseable Gemini response: {repr(text[:200])}")
                raise ValueError(
                    "Could not parse patient data from document — the AI response was malformed. "
                    "Please try uploading again."
                )

        # Validate required fields exist and are non-empty
        for field in ("first_name", "last_name", "date_of_birth"):
            val = data.get(field)
            if not val or not str(val).strip():
                raise ValueError(
                    f"Extraction incomplete: '{field}' could not be determined from the document. "
                    "The PDF may not contain clear patient information."
                )
            data[field] = str(val).strip()

        # Ensure confidence is a valid number
        try:
            data["confidence"] = float(data.get("confidence", 0.5))
            data["confidence"] = max(0.0, min(1.0, data["confidence"]))
        except (TypeError, ValueError):
            data["confidence"] = 0.5

        return data

    async def extract_with_text(self, text: str) -> dict:
        """Send extracted text to Gemini for patient data extraction."""
        prompt = EXTRACTION_PROMPT + "\n\nDocument text:\n" + text[:3000]
        response_text = await self._agenerate([prompt])
        return self._parse_result(response_text)

    async def extract_with_vision(self, images: list[bytes]) -> dict:
        """Send page images to Gemini using vision capability."""
        parts = [types.Part.from_text(text=EXTRACTION_PROMPT)]
        for img_bytes in images:
            parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"))
        response_text = await self._agenerate(parts)
        return self._parse_result(response_text)

    async def extract(self, pdf_bytes: bytes) -> dict:
        """Main entry point: extract patient data from PDF bytes.

        Uses text extraction first, falls back to vision for scanned PDFs.
        If text-based extraction fails, automatically retries with vision.
        Returns dict with first_name, last_name, date_of_birth, confidence.
        """
        # Validate PDF upfront — fail fast with clear error
        self.validate_pdf(pdf_bytes)

        text = self.extract_text(pdf_bytes)

        if len(text) > 50:
            try:
                return await self.extract_with_text(text)
            except (ValueError, json.JSONDecodeError) as e:
                # Text extraction gave bad results — fall back to vision
                logger.warning(f"Text extraction failed ({e}), falling back to vision")
                images = self.convert_pages_to_images(pdf_bytes, max_pages=2)
                if images:
                    return await self.extract_with_vision(images)
                raise
        else:
            images = self.convert_pages_to_images(pdf_bytes, max_pages=2)
            if not images:
                raise ValueError("PDF has no renderable pages")
            return await self.extract_with_vision(images)
