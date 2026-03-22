"""
Chat router.

POST   /api/chat/message  – send a message to the RAG pipeline
GET    /api/chat/history  – retrieve in-memory chat history
DELETE /api/chat/history  – clear chat history
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status

from models.schemas import (
    ChatHistoryResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    QueryMode,
    SourceReference,
)
from services import rag_service

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory chat history store
# ---------------------------------------------------------------------------
# Each entry is a dict that can be serialised to ChatMessage without loss.

_history: list[dict[str, Any]] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_sources(raw_result: str) -> list[SourceReference]:
    """
    Attempt to extract source references from the RAG result string.

    The real LightRAG pipeline does not (currently) return structured sources
    alongside the answer string, so we return an empty list for real results
    and a single mock source for mock results.
    """
    if raw_result.startswith("[Mock RAG"):
        return [
            SourceReference(
                document_id=None,
                document_name="(mock – no documents ingested)",
                chunk_content=None,
                relevance_score=None,
            )
        ]
    return []


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/message",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message to the RAG chatbot",
)
async def send_message(request: ChatRequest) -> ChatResponse:
    """
    Send a user message to the RAG pipeline and return the assistant's response.

    - **message**: The user's question (non-empty string).
    - **mode**: RAG retrieval mode – ``naive``, ``local``, or ``hybrid`` (default).
    """
    if not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message must not be empty.",
        )

    # Store user turn
    user_id = str(uuid.uuid4())
    user_entry: dict[str, Any] = {
        "id": user_id,
        "role": "user",
        "content": request.message,
        "mode": request.mode.value,
        "sources": [],
        "created_at": _now_iso(),
    }
    _history.append(user_entry)

    # Query the RAG pipeline
    try:
        answer = await rag_service.query(request.message, request.mode.value)
    except Exception as exc:
        logger.error("RAG query error: %s", exc, exc_info=True)
        # Remove the user turn we already stored to keep history consistent
        _history.pop()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG pipeline error: {exc}",
        ) from exc

    sources = _parse_sources(answer)
    assistant_id = str(uuid.uuid4())
    created_at = _now_iso()

    assistant_entry: dict[str, Any] = {
        "id": assistant_id,
        "role": "assistant",
        "content": answer,
        "mode": request.mode.value,
        "sources": [s.model_dump() for s in sources],
        "created_at": created_at,
    }
    _history.append(assistant_entry)

    return ChatResponse(
        id=assistant_id,
        response=answer,
        sources=sources,
        created_at=created_at,
    )


@router.get(
    "/history",
    response_model=ChatHistoryResponse,
    summary="Retrieve chat history",
)
async def get_history() -> ChatHistoryResponse:
    """Return the full in-memory chat history (both user and assistant turns)."""
    messages = [
        ChatMessage(
            id=entry["id"],
            role=entry["role"],
            content=entry["content"],
            mode=QueryMode(entry["mode"]) if entry.get("mode") else None,
            sources=[SourceReference(**s) for s in entry.get("sources", [])],
            created_at=entry["created_at"],
        )
        for entry in _history
    ]
    return ChatHistoryResponse(messages=messages, total=len(messages))


@router.delete(
    "/history",
    status_code=status.HTTP_200_OK,
    summary="Clear chat history",
)
async def clear_history() -> dict[str, str]:
    """Clear all stored chat messages from the in-memory store."""
    _history.clear()
    return {"status": "ok", "message": "Chat history cleared."}
