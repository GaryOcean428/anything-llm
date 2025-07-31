-- Railway deployment schema fix
-- This migration ensures all tables exist in the anythingllm schema
-- and handles the case where tables might exist in public schema

-- Create anythingllm schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS anythingllm;

-- Set default search path to prioritize anythingllm schema
-- This ensures all subsequent operations use the correct schema
DO $$
BEGIN
    -- Set search path for this session
    EXECUTE 'SET search_path TO anythingllm, public';
END $$;

-- Function to safely move or create tables in anythingllm schema
CREATE OR REPLACE FUNCTION ensure_table_in_anythingllm_schema(table_name text) 
RETURNS void AS $$
BEGIN
    -- Check if table exists in public schema but not in anythingllm schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'anythingllm' AND table_name = table_name
    ) THEN
        -- Move table from public to anythingllm schema
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA anythingllm', table_name);
        RAISE NOTICE 'Moved table % from public to anythingllm schema', table_name;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'anythingllm' AND table_name = table_name
    ) THEN
        RAISE NOTICE 'Table % does not exist in any schema, will be created by Prisma', table_name;
    ELSE
        RAISE NOTICE 'Table % already exists in anythingllm schema', table_name;
    END IF;
END $$ LANGUAGE plpgsql;

-- Ensure all critical tables are in anythingllm schema
SELECT ensure_table_in_anythingllm_schema('workspaces');
SELECT ensure_table_in_anythingllm_schema('system_settings');
SELECT ensure_table_in_anythingllm_schema('event_logs');
SELECT ensure_table_in_anythingllm_schema('users');
SELECT ensure_table_in_anythingllm_schema('workspace_documents');
SELECT ensure_table_in_anythingllm_schema('workspace_chats');
SELECT ensure_table_in_anythingllm_schema('api_keys');
SELECT ensure_table_in_anythingllm_schema('invites');
SELECT ensure_table_in_anythingllm_schema('cache_data');
SELECT ensure_table_in_anythingllm_schema('embed_configs');
SELECT ensure_table_in_anythingllm_schema('embed_chats');

-- Create essential tables if they don't exist in anythingllm schema
-- workspaces table (critical for the reported issue)
CREATE TABLE IF NOT EXISTS anythingllm.workspaces (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vectorTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openAiTemp" DOUBLE PRECISION,
    "openAiHistory" INTEGER NOT NULL DEFAULT 20,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openAiPrompt" TEXT,
    "similarityThreshold" DOUBLE PRECISION DEFAULT 0.25,
    "chatProvider" TEXT,
    "chatModel" TEXT,
    "topN" INTEGER DEFAULT 4,
    "chatMode" TEXT DEFAULT 'chat',
    "pfpFilename" TEXT,
    "agentProvider" TEXT,
    "agentModel" TEXT,
    "queryRefusalResponse" TEXT,
    "vectorSearchMode" TEXT DEFAULT 'default',
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- system_settings table (critical for the reported issue)
CREATE TABLE IF NOT EXISTS anythingllm.system_settings (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- event_logs table (critical for the reported issue)
CREATE TABLE IF NOT EXISTS anythingllm.event_logs (
    "id" SERIAL NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" TEXT,
    "userId" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints if they don't exist
DO $$
BEGIN
    -- workspaces constraints
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c 
        JOIN pg_class t ON c.conrelid = t.oid 
        JOIN pg_namespace n ON t.relnamespace = n.oid 
        WHERE c.conname = 'workspaces_slug_key' 
        AND n.nspname = 'anythingllm'
    ) THEN
        ALTER TABLE anythingllm.workspaces ADD CONSTRAINT "workspaces_slug_key" UNIQUE ("slug");
        RAISE NOTICE 'Added unique constraint workspaces_slug_key';
    END IF;
    
    -- system_settings constraints
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c 
        JOIN pg_class t ON c.conrelid = t.oid 
        JOIN pg_namespace n ON t.relnamespace = n.oid 
        WHERE c.conname = 'system_settings_label_key' 
        AND n.nspname = 'anythingllm'
    ) THEN
        ALTER TABLE anythingllm.system_settings ADD CONSTRAINT "system_settings_label_key" UNIQUE ("label");
        RAISE NOTICE 'Added unique constraint system_settings_label_key';
    END IF;
    
    -- event_logs index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'anythingllm' 
        AND tablename = 'event_logs' 
        AND indexname = 'event_logs_event_idx'
    ) THEN
        CREATE INDEX "event_logs_event_idx" ON anythingllm.event_logs("event");
        RAISE NOTICE 'Added index event_logs_event_idx';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS ensure_table_in_anythingllm_schema(text);

-- Reset search path to default for subsequent operations
SET search_path TO anythingllm, public;