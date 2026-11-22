"""AI assistant endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.ai_assistant import (
    GeminiAssistantError,
    GeminiNotConfiguredError,
    generate_assistant_reply,
)

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AssistantChatResponse(BaseModel):
    reply: str
    source_tag: str


@router.post("/chat", response_model=AssistantChatResponse)
async def chat_with_assistant(request: AssistantChatRequest) -> AssistantChatResponse:
    try:
        reply = await generate_assistant_reply(request.message)
    except GeminiNotConfiguredError as exc:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Set GEMINI_API_KEY in the backend environment.",
        ) from exc
    except GeminiAssistantError as exc:
        raise HTTPException(
            status_code=503,
            detail="The AI assistant is temporarily unavailable.",
        ) from exc

    return AssistantChatResponse(
        reply=reply,
        source_tag="Gemini 2.0 Flash (JalDrishti AI)",
    )
