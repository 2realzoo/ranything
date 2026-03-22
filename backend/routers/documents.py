"""
Documents router.

GET    /api/documents            – list documents (paginated)
POST   /api/documents/upload     – upload a file and trigger RAG ingestion
GET    /api/documents/{id}       – get document details
PUT    /api/documents/{id}       – update document metadata
DELETE /api/documents/{id}       – delete a document
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import aiofiles
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse

from models.schemas import (
    Document,
    DocumentListResponse,
    DocumentStatus,
    DocumentUpdate,
    ParsedContent,
    ContentType,
    UploadResponse,
)
from services import rag_service

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Storage configuration
# ---------------------------------------------------------------------------

UPLOAD_DIR = Path("/tmp/rag_uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = _BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_JSON = DATA_DIR / "documents.json"

# In-memory store: document_id -> document dict
_documents: dict[str, dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def _load_documents() -> None:
    """Load documents from JSON file into memory on startup."""
    global _documents
    if DOCUMENTS_JSON.exists():
        try:
            with open(DOCUMENTS_JSON, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            _documents = {doc["id"]: doc for doc in data}
            logger.info("Loaded %d documents from %s", len(_documents), DOCUMENTS_JSON)
        except Exception as exc:
            logger.error("Failed to load documents.json: %s", exc)
            _documents = {}


def _save_documents() -> None:
    """Persist in-memory document store to JSON file."""
    try:
        with open(DOCUMENTS_JSON, "w", encoding="utf-8") as fh:
            json.dump(list(_documents.values()), fh, ensure_ascii=False, indent=2)
    except Exception as exc:
        logger.error("Failed to save documents.json: %s", exc)


# Load on import
_load_documents()


# ---------------------------------------------------------------------------
# Document helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _doc_to_model(doc: dict[str, Any]) -> Document:
    return Document(
        id=doc["id"],
        name=doc["name"],
        filename=doc["filename"],
        status=DocumentStatus(doc["status"]),
        size=doc["size"],
        tags=doc.get("tags", []),
        virtualQuestions=doc.get("virtualQuestions", []),
        parsedContent=[ParsedContent(**p) for p in doc.get("parsedContent", [])],
        uploadedAt=doc["uploadedAt"],
        errorMessage=doc.get("errorMessage"),
    )


def _generate_mock_parsed_content(filename: str, file_path: Path) -> list[dict[str, Any]]:
    """
    Attempt to read RAG output JSON; fall back to a single mock text block.
    """
    # RAGAnything writes output to <WORKING_DIR>/output/<stem>/<stem>.json
    working_dir = os.getenv("WORKING_DIR", "./rag_storage")
    stem = Path(filename).stem
    candidates = [
        Path(working_dir) / "output" / stem / f"{stem}.json",
        Path(working_dir) / "output" / f"{stem}.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                with open(candidate, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                # Expect a list of content blocks
                if isinstance(data, list):
                    return [
                        {
                            "type": block.get("type", "text"),
                            "content": block.get("content", ""),
                            "index": idx,
                            "metadata": block.get("metadata", {}),
                        }
                        for idx, block in enumerate(data)
                    ]
            except Exception as exc:
                logger.warning("Could not parse RAG output JSON %s: %s", candidate, exc)

    # Fallback: one mock text block
    return [
        {
            "type": "text",
            "content": (
                f"Document '{filename}' has been uploaded and queued for processing. "
                "Parsed content will appear here once ingestion is complete."
            ),
            "index": 0,
            "metadata": {},
        }
    ]


# ---------------------------------------------------------------------------
# Background ingestion task
# ---------------------------------------------------------------------------

async def _run_ingestion(doc_id: str, file_path: str) -> None:
    """Background task: ingest document and update status."""
    doc = _documents.get(doc_id)
    if doc is None:
        logger.error("Ingestion started for unknown doc_id=%s", doc_id)
        return

    # Mark as processing
    doc["status"] = DocumentStatus.processing.value
    _save_documents()

    try:
        await rag_service.ingest(file_path)

        # Update parsed content from RAG output (or mock)
        parsed = _generate_mock_parsed_content(doc["filename"], Path(file_path))
        doc["parsedContent"] = parsed
        doc["status"] = DocumentStatus.completed.value
        doc["errorMessage"] = None
        logger.info("Ingestion completed for doc_id=%s", doc_id)
    except Exception as exc:
        logger.error("Ingestion failed for doc_id=%s: %s", doc_id, exc, exc_info=True)
        doc["status"] = DocumentStatus.error.value
        doc["errorMessage"] = str(exc)
    finally:
        _save_documents()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List documents",
)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
) -> DocumentListResponse:
    """Return a paginated list of all documents."""
    docs = list(_documents.values())

    if status_filter:
        try:
            DocumentStatus(status_filter)  # validate
            docs = [d for d in docs if d.get("status") == status_filter]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status filter: '{status_filter}'. "
                       f"Valid values: {[s.value for s in DocumentStatus]}",
            )

    # Sort by uploadedAt descending
    docs.sort(key=lambda d: d.get("uploadedAt", ""), reverse=True)

    total = len(docs)
    start = (page - 1) * page_size
    end = start + page_size
    page_docs = [_doc_to_model(d) for d in docs[start:end]]

    return DocumentListResponse(
        documents=page_docs,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a document",
)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
) -> UploadResponse:
    """
    Upload a file for RAG ingestion.

    The file is saved to ``/tmp/rag_uploads/`` and ingestion is triggered
    asynchronously. The response is returned immediately with status ``pending``.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must have a filename.",
        )

    # Read file content
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    file_size = len(content)

    # Build a unique filename to avoid collisions
    doc_id = str(uuid.uuid4())
    safe_name = re.sub(r"[^\w\.\-]", "_", file.filename)
    dest_path = UPLOAD_DIR / f"{doc_id}_{safe_name}"

    # Write file to disk asynchronously
    async with aiofiles.open(dest_path, "wb") as fh:
        await fh.write(content)

    # Generate metadata
    display_name = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()
    tags = rag_service.generate_tags(file.filename)
    virtual_questions = rag_service.generate_virtual_questions(file.filename, display_name)
    uploaded_at = _now_iso()

    # Store document record
    doc_record: dict[str, Any] = {
        "id": doc_id,
        "name": display_name,
        "filename": file.filename,
        "status": DocumentStatus.pending.value,
        "size": file_size,
        "tags": tags,
        "virtualQuestions": virtual_questions,
        "parsedContent": [],
        "uploadedAt": uploaded_at,
        "errorMessage": None,
        # Internal: path on disk
        "_filePath": str(dest_path),
    }
    _documents[doc_id] = doc_record
    _save_documents()

    # Schedule background ingestion
    background_tasks.add_task(_run_ingestion, doc_id, str(dest_path))

    return UploadResponse(
        id=doc_id,
        name=display_name,
        filename=file.filename,
        status=DocumentStatus.pending,
        size=file_size,
        uploadedAt=uploaded_at,
        message="Document uploaded. Ingestion started in the background.",
    )


@router.get(
    "/{doc_id}",
    response_model=Document,
    summary="Get document details",
)
async def get_document(doc_id: str) -> Document:
    """Return full details for a single document including parsed content."""
    doc = _documents.get(doc_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{doc_id}' not found.",
        )
    return _doc_to_model(doc)


@router.put(
    "/{doc_id}",
    response_model=Document,
    summary="Update document metadata",
)
async def update_document(doc_id: str, update: DocumentUpdate) -> Document:
    """
    Update mutable document fields: ``name``, ``tags``, ``virtualQuestions``,
    and ``parsedContent``.
    """
    doc = _documents.get(doc_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{doc_id}' not found.",
        )

    update_data = update.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        doc["name"] = update_data["name"]

    if "tags" in update_data and update_data["tags"] is not None:
        doc["tags"] = update_data["tags"]

    if "virtualQuestions" in update_data and update_data["virtualQuestions"] is not None:
        doc["virtualQuestions"] = update_data["virtualQuestions"]

    if "parsedContent" in update_data and update_data["parsedContent"] is not None:
        doc["parsedContent"] = [
            p.model_dump() if isinstance(p, ParsedContent) else p
            for p in update_data["parsedContent"]
        ]

    _save_documents()
    return _doc_to_model(doc)


@router.delete(
    "/{doc_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a document",
)
async def delete_document(doc_id: str) -> dict[str, str]:
    """
    Delete a document record and its uploaded file from disk.

    Note: This does **not** remove the document from the RAG vector/graph stores,
    as LightRAG does not currently expose a per-document delete API.
    """
    doc = _documents.get(doc_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{doc_id}' not found.",
        )

    # Remove file from disk if it still exists
    file_path = doc.get("_filePath")
    if file_path:
        try:
            Path(file_path).unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("Could not delete file %s: %s", file_path, exc)

    del _documents[doc_id]
    _save_documents()

    return {"status": "ok", "message": f"Document '{doc_id}' deleted."}
