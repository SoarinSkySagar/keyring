-- Migration: replace NextAuth tables with Privy auth
-- Run: psql $DATABASE_URL -f drizzle/0001_privy_auth.sql

-- Add Privy DID column to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE;

-- Drop NextAuth-only columns from users
ALTER TABLE users
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS image;

-- Drop NextAuth support tables
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS verification_tokens;
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS siwe_nonces;
