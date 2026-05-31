ALTER TABLE "agents" ADD COLUMN "allowed_secret_ids" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "agents" ADD COLUMN "wallet_address" text;
ALTER TABLE "agents" ADD COLUMN "ip_id" text;
