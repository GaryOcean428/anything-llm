-- Schema-aware migration for AnythingLLM multi-service deployment
-- This migration ensures all tables are created in the anythingllm schema
-- and handles existing tables that may be in the public schema

-- Create anythingllm schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS anythingllm;

-- Set default search path to prioritize anythingllm schema
SET search_path TO anythingllm, public;

-- Function to move table from public to anythingllm schema if it exists
DO $$
DECLARE
    table_name text;
    tables_to_move text[] := ARRAY[
        'api_keys', 'workspace_documents', 'invites', 'system_settings', 'users',
        'recovery_codes', 'password_reset_tokens', 'document_vectors', 'welcome_messages',
        'workspaces', 'workspace_threads', 'workspace_suggested_messages', 'workspace_chats',
        'workspace_agent_invocations', 'workspace_users', 'cache_data', 'embed_configs',
        'embed_chats', 'event_logs', 'slash_command_presets', 'document_sync_queues',
        'document_sync_executions', 'browser_extension_api_keys', 'temporary_auth_tokens',
        'system_prompt_variables', 'prompt_history'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_move
    LOOP
        -- Check if table exists in public schema
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN
            -- Check if table doesn't already exist in anythingllm schema
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'anythingllm' 
                AND table_name = table_name
            ) THEN
                -- Move table from public to anythingllm schema
                EXECUTE format('ALTER TABLE public.%I SET SCHEMA anythingllm', table_name);
                RAISE NOTICE 'Moved table % from public to anythingllm schema', table_name;
            ELSE
                RAISE NOTICE 'Table % already exists in anythingllm schema, skipping move', table_name;
            END IF;
        ELSE
            RAISE NOTICE 'Table % does not exist in public schema, will be created in anythingllm schema', table_name;
        END IF;
    END LOOP;
END $$;

-- Ensure all required tables exist in anythingllm schema
-- (These will be created by Prisma's normal migration process if they don't exist)

-- CreateTable api_keys (if not exists)
CREATE TABLE IF NOT EXISTS anythingllm.api_keys (
    "id" SERIAL NOT NULL,
    "secret" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable workspaces (if not exists) - this is the key table mentioned in the issue
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

-- Create unique constraints if they don't exist
DO $$
BEGIN
    -- api_keys constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_secret_key') THEN
        ALTER TABLE anythingllm.api_keys ADD CONSTRAINT "api_keys_secret_key" UNIQUE ("secret");
    END IF;
    
    -- workspaces constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_slug_key') THEN
        ALTER TABLE anythingllm.workspaces ADD CONSTRAINT "workspaces_slug_key" UNIQUE ("slug");
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- Reset search path to default
RESET search_path;