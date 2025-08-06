-- Create users table if it does not exist (aligns with prisma schema)
CREATE SCHEMA IF NOT EXISTS anythingllm;

CREATE TABLE IF NOT EXISTS anythingllm.users (
  id                  SERIAL PRIMARY KEY,
  username            TEXT UNIQUE,
  password            TEXT NOT NULL,
  pfpFilename         TEXT,
  role                TEXT NOT NULL DEFAULT 'default',
  suspended           INTEGER NOT NULL DEFAULT 0,
  seen_recovery_codes BOOLEAN DEFAULT false,
  createdAt           TIMESTAMPTZ NOT NULL DEFAULT now(),
  lastUpdatedAt       TIMESTAMPTZ NOT NULL DEFAULT now(),
  dailyMessageLimit   INTEGER,
  bio                 TEXT DEFAULT ''
);

-- Add email column if missing
ALTER TABLE anythingllm.users
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Ensure unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON anythingllm.users(email);
