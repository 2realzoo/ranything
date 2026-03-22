-- ============================================================
-- LightRAG + RAGAnything Schema for Supabase (PostgreSQL only)
-- Vector Storage → Qdrant (별도)
-- KV + DocStatus → Supabase PostgreSQL
-- Graph Storage → NetworkXStorage (파일 기반)
-- ============================================================

-- ============================================================
-- KV Storage: Full Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS LIGHTRAG_DOC_FULL (
    id          VARCHAR(255),
    workspace   VARCHAR(255),
    doc_name    VARCHAR(1024),
    content     TEXT,
    meta        JSONB,
    create_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_DOC_FULL_PK PRIMARY KEY (workspace, id)
);

-- ============================================================
-- KV Storage: Document Chunks
-- ============================================================
CREATE TABLE IF NOT EXISTS LIGHTRAG_DOC_CHUNKS (
    id                  VARCHAR(255),
    workspace           VARCHAR(255),
    full_doc_id         VARCHAR(256),
    chunk_order_index   INTEGER,
    tokens              INTEGER,
    content             TEXT,
    file_path           TEXT NULL,
    llm_cache_list      JSONB NULL DEFAULT '[]'::jsonb,
    create_time         TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    update_time         TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_DOC_CHUNKS_PK PRIMARY KEY (workspace, id)
);

-- ============================================================
-- KV Storage: LLM Response Cache
-- ============================================================
CREATE TABLE IF NOT EXISTS LIGHTRAG_LLM_CACHE (
    workspace       VARCHAR(255) NOT NULL,
    id              VARCHAR(255) NOT NULL,
    original_prompt TEXT,
    return_value    TEXT,
    chunk_id        VARCHAR(255) NULL,
    cache_type      VARCHAR(32),
    queryparam      JSONB NULL,
    create_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_LLM_CACHE_PK PRIMARY KEY (workspace, id)
);

-- ============================================================
-- Doc Status Storage
-- ============================================================
CREATE TABLE IF NOT EXISTS LIGHTRAG_DOC_STATUS (
    workspace           VARCHAR(255) NOT NULL,
    id                  VARCHAR(255) NOT NULL,
    content_summary     VARCHAR(255) NULL,
    content_length      INTEGER NULL,
    chunks_count        INTEGER NULL,
    status              VARCHAR(64) NULL,
    file_path           TEXT NULL,
    chunks_list         JSONB NULL DEFAULT '[]'::jsonb,
    track_id            VARCHAR(255) NULL,
    metadata            JSONB NULL DEFAULT '{}'::jsonb,
    error_msg           TEXT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_DOC_STATUS_PK PRIMARY KEY (workspace, id)
);

-- ============================================================
-- KV Storage: Graph Metadata (entities / relations / chunks)
-- ============================================================
CREATE TABLE IF NOT EXISTS LIGHTRAG_FULL_ENTITIES (
    id           VARCHAR(255),
    workspace    VARCHAR(255),
    entity_names JSONB,
    count        INTEGER,
    create_time  TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    update_time  TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_FULL_ENTITIES_PK PRIMARY KEY (workspace, id)
);

CREATE TABLE IF NOT EXISTS LIGHTRAG_FULL_RELATIONS (
    id             VARCHAR(255),
    workspace      VARCHAR(255),
    relation_pairs JSONB,
    count          INTEGER,
    create_time    TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    update_time    TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_FULL_RELATIONS_PK PRIMARY KEY (workspace, id)
);

CREATE TABLE IF NOT EXISTS LIGHTRAG_ENTITY_CHUNKS (
    id          VARCHAR(512),
    workspace   VARCHAR(255),
    chunk_ids   JSONB,
    count       INTEGER,
    create_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_ENTITY_CHUNKS_PK PRIMARY KEY (workspace, id)
);

CREATE TABLE IF NOT EXISTS LIGHTRAG_RELATION_CHUNKS (
    id          VARCHAR(512),
    workspace   VARCHAR(255),
    chunk_ids   JSONB,
    count       INTEGER,
    create_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT LIGHTRAG_RELATION_CHUNKS_PK PRIMARY KEY (workspace, id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lightrag_doc_full_workspace_id      ON LIGHTRAG_DOC_FULL (workspace, id);
CREATE INDEX IF NOT EXISTS idx_lightrag_doc_chunks_workspace_id    ON LIGHTRAG_DOC_CHUNKS (workspace, id);
CREATE INDEX IF NOT EXISTS idx_lightrag_doc_chunks_full_doc_id     ON LIGHTRAG_DOC_CHUNKS (full_doc_id);
CREATE INDEX IF NOT EXISTS idx_lightrag_llm_cache_workspace_id     ON LIGHTRAG_LLM_CACHE (workspace, id);
CREATE INDEX IF NOT EXISTS idx_lightrag_doc_status_workspace_id    ON LIGHTRAG_DOC_STATUS (workspace, id);
CREATE INDEX IF NOT EXISTS idx_lightrag_doc_status_track_id        ON LIGHTRAG_DOC_STATUS (track_id);
CREATE INDEX IF NOT EXISTS idx_lightrag_doc_status_status          ON LIGHTRAG_DOC_STATUS (workspace, status, updated_at DESC);
