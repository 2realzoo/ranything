"""
RAG Service wrapper.

Tries to import the real pipeline from /Users/jinjoo/Workspace/rag-test/rag_pipeline.py.
Falls back to mock implementations when the real pipeline is unavailable (missing
dependencies, missing env vars, etc.).
"""

from __future__ import annotations

import asyncio
import importlib.util
import logging
import os
import sys
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Attempt to load the real pipeline
# ---------------------------------------------------------------------------

_PIPELINE_PATH = Path(
    os.getenv("RAG_PIPELINE_PATH", "/Users/jinjoo/Workspace/rag-test/rag_pipeline.py")
)
_real_ingest = None
_real_query = None

def _try_load_real_pipeline() -> bool:
    global _real_ingest, _real_query
    if not _PIPELINE_PATH.exists():
        logger.warning("rag_pipeline.py not found at %s – using mock", _PIPELINE_PATH)
        return False
    try:
        # Add the parent directory to sys.path so relative imports in rag_pipeline work
        pipeline_dir = str(_PIPELINE_PATH.parent)
        if pipeline_dir not in sys.path:
            sys.path.insert(0, pipeline_dir)

        spec = importlib.util.spec_from_file_location("rag_pipeline", _PIPELINE_PATH)
        module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(module)  # type: ignore[union-attr]

        _real_ingest = module.ingest
        _real_query = module.query
        logger.info("Real RAG pipeline loaded successfully")
        return True
    except Exception as exc:
        logger.warning("Failed to load real rag_pipeline: %s – using mock", exc)
        return False


_pipeline_available = _try_load_real_pipeline()


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------

def _mock_tags_from_filename(filename: str) -> list[str]:
    """Extract simple keyword tags from a filename."""
    stem = Path(filename).stem
    # Split on common separators, lowercase, deduplicate
    import re
    words = re.split(r"[\s_\-\.]+", stem.lower())
    stop_words = {"the", "a", "an", "of", "in", "on", "and", "or", "for", "to", "is"}
    tags = [w for w in words if w and w not in stop_words and len(w) > 2]
    return list(dict.fromkeys(tags))[:5]  # deduplicate, keep order, max 5


def _mock_virtual_questions(filename: str, name: str) -> list[str]:
    """Generate 3 generic virtual questions about the document."""
    doc_label = name or Path(filename).stem
    return [
        f"What is the main topic covered in '{doc_label}'?",
        f"What are the key findings or conclusions of '{doc_label}'?",
        f"Who is the intended audience for '{doc_label}'?",
    ]


async def _mock_query(question: str, mode: str = "hybrid") -> str:
    """Return a formatted mock response when the real pipeline is unavailable."""
    await asyncio.sleep(0.05)  # simulate network latency
    return (
        f"[Mock RAG – mode={mode}] I received your question: \"{question}\"\n\n"
        "The real RAG pipeline is not available in this environment (missing ML "
        "dependencies or environment variables). Once the full stack is running "
        "(OpenAI key, Qdrant, Supabase), this endpoint will return answers grounded "
        "in your uploaded documents."
    )


async def _mock_ingest(file_path: str) -> None:
    """Simulate ingestion delay without doing anything real."""
    await asyncio.sleep(1.0)
    logger.info("[mock ingest] pretended to ingest %s", file_path)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def query(message: str, mode: str = "hybrid") -> str:
    """
    Query the RAG system with a user question.

    Parameters
    ----------
    message:
        The user's natural-language question.
    mode:
        One of ``naive``, ``local``, or ``hybrid``.

    Returns
    -------
    str
        The answer produced by the RAG pipeline (or mock).
    """
    if _pipeline_available and _real_query is not None:
        try:
            result = await _real_query(message, mode)
            return str(result)
        except Exception as exc:
            logger.error("Real RAG query failed: %s", exc, exc_info=True)
            # Fall through to mock
    return await _mock_query(message, mode)


async def ingest(file_path: str) -> None:
    """
    Ingest a document into the RAG system.

    Parameters
    ----------
    file_path:
        Absolute path to the file to ingest.
    """
    if _pipeline_available and _real_ingest is not None:
        try:
            await _real_ingest(file_path)
            return
        except Exception as exc:
            logger.error("Real RAG ingest failed: %s", exc, exc_info=True)
    await _mock_ingest(file_path)


def generate_tags(filename: str) -> list[str]:
    """Generate keyword tags from a filename (always uses local logic)."""
    return _mock_tags_from_filename(filename)


def generate_virtual_questions(filename: str, name: str = "") -> list[str]:
    """Generate virtual questions for a document (always uses local logic)."""
    return _mock_virtual_questions(filename, name)


def pipeline_is_real() -> bool:
    """Return True if the real pipeline was loaded successfully."""
    return _pipeline_available
