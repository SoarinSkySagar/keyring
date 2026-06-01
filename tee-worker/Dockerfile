# Keyring TEE worker — AI policy judge + secret-injected HTTP execution,
# built to run inside a Phala dstack (Intel TDX) enclave.
FROM node:22-slim

WORKDIR /app

# Production dependencies only (tsx, express, @phala/dstack-sdk, dotenv).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Application source (run directly with tsx — no build step).
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
