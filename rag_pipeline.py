"""
RAG Pipeline
- LLM      : gpt-4o (text + vision)
- Embedding: text-embedding-3-large (dim 3072)
- Vector   : Qdrant (local)
- KV       : Supabase PostgreSQL
- Graph    : NetworkX (file-based)
"""

import asyncio
import os
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from lightrag import LightRAG
from lightrag.llm.openai import gpt_4o_complete, openai_embed
from lightrag.utils import EmbeddingFunc
from openai import AsyncOpenAI
from raganything import RAGAnything, RAGAnythingConfig

load_dotenv()

WORKING_DIR = os.getenv("WORKING_DIR", "./rag_storage")
Path(WORKING_DIR).mkdir(parents=True, exist_ok=True)

_openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def _embed(texts: list[str]) -> np.ndarray:
    """text-embedding-3-large 임베딩 함수"""
    return await openai_embed(
        texts,
        model="text-embedding-3-large",
        api_key=os.getenv("OPENAI_API_KEY"),
    )


def build_embedding_func() -> EmbeddingFunc:
    return EmbeddingFunc(
        embedding_dim=3072,
        max_token_size=8192,
        model_name="text-embedding-3-large",
        func=_embed,
    )


async def _vision_func(prompt: str, image_data=None, **kwargs) -> str:
    """gpt-4o vision — image_data는 base64 문자열로 전달됨"""
    content = [{"type": "text", "text": prompt}]
    if image_data:
        # RAGAnything은 base64 문자열을 직접 전달
        b64 = image_data if isinstance(image_data, str) else image_data.get("data", "")
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
        })
    system = kwargs.get("system_prompt", "You are an expert image analyst.")
    resp = await _openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
        max_tokens=kwargs.get("max_tokens", 1024),
    )
    return resp.choices[0].message.content


def build_lightrag() -> LightRAG:
    return LightRAG(
        working_dir=WORKING_DIR,
        # LLM
        llm_model_func=gpt_4o_complete,
        llm_model_kwargs={"api_key": os.getenv("OPENAI_API_KEY")},
        # Embedding
        embedding_func=build_embedding_func(),
        # Vector Storage → Qdrant
        vector_storage="QdrantVectorDBStorage",
        vector_db_storage_cls_kwargs={
            "cosine_better_than_threshold": 0.2,
        },
        # KV Storage → Supabase PostgreSQL
        kv_storage="PGKVStorage",
        doc_status_storage="PGDocStatusStorage",
        # Graph Storage → NetworkX (파일 기반)
        graph_storage="NetworkXStorage",
        # PostgreSQL 연결 → POSTGRES_* 환경변수로 자동 읽힘
    )


def build_rag() -> RAGAnything:
    lightrag = build_lightrag()
    return RAGAnything(
        lightrag=lightrag,
        llm_model_func=gpt_4o_complete,
        vision_model_func=_vision_func,
        embedding_func=build_embedding_func(),
        config=RAGAnythingConfig(
            working_dir=WORKING_DIR,
            parser="mineru",
            parse_method="auto",
            enable_image_processing=True,
            enable_table_processing=True,
            enable_equation_processing=True,
        ),
    )


async def ingest(file_path: str):
    """문서 ingestion"""
    rag = build_rag()
    try:
        print(f"[ingestion] {file_path}")
        await rag.process_document_complete(
            file_path=file_path,
            output_dir=f"{WORKING_DIR}/output",
        )
        print("[ingestion] 완료")
    finally:
        await rag.finalize_storages()


async def query(question: str, mode: str = "hybrid") -> str:
    """RAG 쿼리 (mode: naive / local / hybrid)"""
    rag = build_rag()
    try:
        result = await rag.aquery(question, param={"mode": mode})
        return result
    finally:
        await rag.finalize_storages()


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("사용법:")
        print("  python rag_pipeline.py ingest <파일경로>")
        print("  python rag_pipeline.py query <질문>")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "ingest":
        asyncio.run(ingest(sys.argv[2]))
    elif cmd == "query":
        answer = asyncio.run(query(" ".join(sys.argv[2:])))
        print(answer)
