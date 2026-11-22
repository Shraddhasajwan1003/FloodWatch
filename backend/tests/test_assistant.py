import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1 import assistant
from app.main import app


@pytest.mark.asyncio
async def test_assistant_chat_reports_missing_gemini_configuration(monkeypatch):
    async def missing_key(_message: str) -> str:
        raise assistant.GeminiNotConfiguredError

    monkeypatch.setattr(assistant, "generate_assistant_reply", missing_key)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/assistant/chat", json={"message": "Hello"})

    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assistant_chat_rejects_empty_messages():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/assistant/chat", json={"message": ""})

    assert response.status_code == 422
