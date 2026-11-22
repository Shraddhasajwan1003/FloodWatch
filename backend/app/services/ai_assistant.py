"""Gemini-backed AI assistant service."""
import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-2.0-flash:generateContent"
)

SYSTEM_PROMPT = (
    "You are the official AI assistant of JalDrishti India — India's National Flood "
    "Intelligence & Emergency Safe-Route Platform. Help citizens understand flood risks, "
    "safe routes, river conditions, shelter locations, and emergency procedures. Always "
    "provide safety-first advice. Reference official Indian emergency numbers: 112 "
    "(national emergency), NDRF 011-24363260, and IMD 1800-180-1717. Respond in the "
    "same language the user uses. Keep answers concise and actionable."
)


class GeminiNotConfiguredError(Exception):
    """Raised when the server has no Gemini API key configured."""


class GeminiAssistantError(Exception):
    """Raised when Gemini cannot provide an assistant response."""


async def generate_assistant_reply(message: str) -> str:
    api_key = get_settings().GEMINI_API_KEY.strip()
    if not api_key:
        raise GeminiNotConfiguredError

    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": message}]}],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GEMINI_API_URL,
                headers={"x-goog-api-key": api_key},
                json=payload,
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        logger.warning("Gemini assistant request timed out")
        raise GeminiAssistantError from exc
    except httpx.HTTPStatusError as exc:
        logger.error("Gemini assistant returned HTTP %s", exc.response.status_code)
        raise GeminiAssistantError from exc
    except httpx.RequestError as exc:
        logger.error("Gemini assistant request failed: %s", type(exc).__name__)
        raise GeminiAssistantError from exc

    try:
        data: Any = response.json()
    except ValueError as exc:
        logger.error("Gemini assistant returned invalid JSON")
        raise GeminiAssistantError from exc

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        logger.error("Gemini assistant response did not contain generated text")
        raise GeminiAssistantError

    if not isinstance(text, str) or not text.strip():
        logger.error("Gemini assistant response contained empty generated text")
        raise GeminiAssistantError

    return text.strip()
