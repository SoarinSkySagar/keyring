ALTER TABLE "agents" ADD COLUMN "rate_limit_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "agents" ADD COLUMN "rate_limit_max_total" integer;
ALTER TABLE "agents" ADD COLUMN "rate_limit_per_minute" integer;
ALTER TABLE "agents" ADD COLUMN "rate_limit_per_hour" integer;
ALTER TABLE "agents" ADD COLUMN "rate_limit_per_day" integer;
