from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class QueryMode(str, Enum):
    naive = "naive"
    local = "local"
    hybrid = "hybrid"


class DocumentStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    error = "error"


class ContentType(str, Enum):
    text = "text"
    image = "image"
    table = "table"
    equation = "equation"


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question")
    mode: QueryMode = Field(QueryMode.hybrid, description="RAG query mode")


class SourceReference(BaseModel):
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    chunk_content: Optional[str] = None
    relevance_score: Optional[float] = None


class ChatMessage(BaseModel):
    id: str
    role: str  # "user" | "assistant"
    content: str
    mode: Optional[QueryMode] = None
    sources: list[SourceReference] = []
    created_at: str


class ChatResponse(BaseModel):
    id: str
    response: str
    sources: list[SourceReference] = []
    created_at: str


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessage]
    total: int


# ---------------------------------------------------------------------------
# Document schemas
# ---------------------------------------------------------------------------

class ParsedContent(BaseModel):
    type: ContentType
    content: str
    index: int
    metadata: dict[str, Any] = {}


class Document(BaseModel):
    id: str
    name: str
    filename: str
    status: DocumentStatus
    size: int
    tags: list[str] = []
    virtualQuestions: list[str] = []
    parsedContent: list[ParsedContent] = []
    uploadedAt: str
    errorMessage: Optional[str] = None


class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[list[str]] = None
    virtualQuestions: Optional[list[str]] = None
    parsedContent: Optional[list[ParsedContent]] = None


class DocumentListResponse(BaseModel):
    documents: list[Document]
    total: int
    page: int
    page_size: int


class UploadResponse(BaseModel):
    id: str
    name: str
    filename: str
    status: DocumentStatus
    size: int
    uploadedAt: str
    message: str
