FROM node:20-slim AS base
# OpenSSL is needed by Prisma's query engine.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install all deps (prisma CLI is a devDependency but is needed at runtime for
# `prisma db push`, so we don't prune dev deps here).
COPY package.json package-lock.json* ./
RUN npm install

# Prisma client must be generated against the schema before copying the rest
# so the generated client is in node_modules.
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

# Apply schema to the DB (idempotent) then boot. For real migrations swap
# `prisma db push` for `prisma migrate deploy`.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/index.js"]
