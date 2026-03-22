import os
from dotenv import load_dotenv

load_dotenv()

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")
EMBEDDING_DIM = 3072  # text-embedding-3-large full dimension

# Qdrant (Vector Storage)
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")

# Supabase / PostgreSQL (KV + DocStatus Storage)
DATABASE_URL = os.getenv("DATABASE_URL")

# LightRAG working dir (for NetworkX graph + cache)
WORKING_DIR = os.getenv("WORKING_DIR", "./rag_storage")
