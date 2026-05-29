-- Per-user smart contract addresses deployed on first login
ALTER TABLE "users"
  ADD COLUMN "agent_registry_address" text,
  ADD COLUMN "condition_address"      text;
