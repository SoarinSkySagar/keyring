# Keyring — root Makefile
# ─────────────────────────────────────────────────────────────────────────────
# All commands run from the repo root. Sub-projects are driven via --cwd /
# --root flags so the working directory never changes and the single root .env
# is picked up automatically.
#
# Requirements: bun ≥1.2  |  forge (Foundry)  |  phala CLI

.PHONY: install build dev demo prod help

# ── Install ───────────────────────────────────────────────────────────────────
install:
	@echo "▶  client …"
	bun --cwd client install
	@echo "▶  tee-worker …"
	bun --cwd tee-worker install
	@echo "▶  contracts …"
	forge install --root contracts
	@echo "✓  all deps installed"

# ── Build ─────────────────────────────────────────────────────────────────────
build:
	@echo "▶  client (Next.js) …"
	bun --cwd client run build
	@echo "▶  contracts (forge) …"
	forge build --root contracts
	@echo "✓  build complete"

# ── Dev ───────────────────────────────────────────────────────────────────────
# Starts all three services in one process group.
# Ctrl-C kills everything cleanly via the trap.
dev:
	@trap 'kill 0' INT; \
	phala simulator start & \
	bun --cwd tee-worker run dev & \
	bun --cwd client run dev & \
	wait

# ── Demo server ───────────────────────────────────────────────────────────────
demo:
	bun demo-server.js

# ── Production ────────────────────────────────────────────────────────────────
# Run `make build` first. Starts the built output — no hot reload.
prod:
	@trap 'kill 0' INT; \
	phala simulator start & \
	bun --cwd tee-worker run start & \
	bun --cwd client run start & \
	wait

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  make install   install deps  (bun: client + tee-worker,  forge: contracts)"
	@echo "  make build     build client (Next.js) and compile contracts (forge)"
	@echo "  make dev       simulator + tee-worker (watch) + Next.js dev"
	@echo "  make demo      demo server on :4000"
	@echo "  make prod      simulator + tee-worker + Next.js production  (run build first)"
	@echo ""
