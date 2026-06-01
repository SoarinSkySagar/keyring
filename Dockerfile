# Keyring — monorepo Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_PRIVY_APP_ID=xxx \
#     --build-arg NEXT_PUBLIC_APP_URL=https://your-domain.com \
#     --build-arg NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS=0x... \
#     -t keyring .
#
# Run:
#   docker run --env-file .env -p 3000:3000 -p 3001:3001 keyring
#
# All secrets (DATABASE_URL, PRIVY_APP_SECRET, GEMINI_API_KEY, PIMLICO_*,
# DSTACK_SIMULATOR_ENDPOINT, etc.) are injected at runtime via --env-file.
# Never bake secrets into the image.

FROM oven/bun:1

# make is needed to run Makefile targets.
# phala@1.1.19 is pinned so the simulator socket path never changes between builds.
RUN apt-get update && apt-get install -y make && rm -rf /var/lib/apt/lists/*
RUN bun install -g phala@1.1.19

WORKDIR /app

# ─── Build-time vars ──────────────────────────────────────────────────────────
# NEXT_PUBLIC_* variables are baked into the Next.js bundle at build time;
# they cannot be changed at runtime without rebuilding.
ARG NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS

ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS=$NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS

# ─── Source code only (no node_modules, no .env, no build output) ─────────────
COPY Makefile ./
COPY client/ client/
COPY tee-worker/ tee-worker/

# ─── Install all dependencies ─────────────────────────────────────────────────
# Installs: client (bun), tee-worker (bun)
RUN make install

# ─── Build ────────────────────────────────────────────────────────────────────
# Produces client/.next (Next.js production bundle)
RUN make build

# ─── Runtime defaults ─────────────────────────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3000 3001

# Starts: phala simulator → tee-worker → Next.js production server
# Pass DSTACK_SIMULATOR_ENDPOINT in your .env so the tee-worker finds the socket.
CMD ["make", "prod"]
