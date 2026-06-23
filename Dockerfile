# --- deps: install npm dependencies ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: build the Next.js app ---
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner: slim image with LibreOffice for conversions ---
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SOFFICE_BIN=soffice
ENV PYTHON_BIN=python3

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-core \
    fonts-dejavu \
    fonts-liberation \
    python3 \
    python3-venv \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# pdf2docx handles PDF -> DOCX (LibreOffice's headless PDF import is
# unreliable for styled/multi-column layouts). Installed into a venv since
# Debian's system Python blocks global pip installs.
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir pdf2docx
ENV PATH="/opt/venv/bin:${PATH}"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
