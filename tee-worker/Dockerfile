# Keyring TEE worker — AI policy judge + secret-injected HTTP execution,
# built to run inside a Phala dstack (Intel TDX) enclave.
FROM oven/bun:1-slim

WORKDIR /app

# Production dependencies only.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Application source (bun runs TypeScript natively — no build step needed).
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["bun", "src/index.ts"]
