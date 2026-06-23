# DocConvert

DOCX <-> PDF converter built with Next.js. DOCX -> PDF runs through
headless LibreOffice (free, self-hosted). PDF -> DOCX runs through the
[CloudConvert](https://cloudconvert.com) API — LibreOffice's own headless
PDF import is unreliable for styled/real-world documents (it drops table
columns and text frames), and a free Python-based attempt (`pdf2docx`) had
the same problem, so this direction uses a paid API for acceptable fidelity.

## Local development

Requires Node 20+. To actually exercise conversions you also need:

- A local LibreOffice install (the `soffice` binary on your PATH) for
  DOCX -> PDF.
- A CloudConvert API key (see below) for PDF -> DOCX.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

If `soffice` isn't on your PATH, set `SOFFICE_BIN` to the full path of the
binary (e.g. on Windows: `C:\Program Files\LibreOffice\program\soffice.exe`).

To test PDF -> DOCX locally, create a `.env.local` file (already
gitignored) with:

```
CLOUDCONVERT_API_KEY=your-api-key-here
```

## Running with Docker (recommended way to test DOCX -> PDF locally)

The Docker image bundles LibreOffice, so this is the most reliable way to
test that conversion flow before deploying:

```bash
docker build -t docconvert .
docker run -p 3000:3000 -e CLOUDCONVERT_API_KEY=your-api-key-here docconvert
```

Open http://localhost:3000.

## Environment variables

- `NEXT_PUBLIC_SITE_URL` — the public URL of the deployed site (used for
  canonical links, sitemap, robots.txt, and Open Graph tags). Set this to
  your real domain in production, e.g. `https://docconvert.example.com`.
- `SOFFICE_BIN` — path to the `soffice` executable. Defaults to `soffice`
  (works inside the provided Docker image).
- `CLOUDCONVERT_API_KEY` — **required** for PDF -> DOCX to work. Get one at
  [cloudconvert.com](https://cloudconvert.com) (sign up, then
  Dashboard -> API Keys -> create a key with `task.read`/`task.write`
  scopes). Without this set, PDF -> DOCX requests return a clear error
  instead of crashing. Never commit this key to git — set it via
  `.env.local` locally and via your host's environment variable settings
  in production.

## Deploying to Railway

1. Push this repo to GitHub.
2. Create a new Railway project, choose "Deploy from GitHub repo".
3. Railway auto-detects the `Dockerfile` and builds/deploys it as a single
   service — no extra config needed.
4. Set environment variables: `NEXT_PUBLIC_SITE_URL` (your Railway-issued
   domain or custom domain) and `CLOUDCONVERT_API_KEY`.
5. Railway sets `PORT` automatically; the app already binds to
   `process.env.PORT` via the Dockerfile's `ENV PORT=3000` default and
   Next's standalone server, which reads `PORT` at runtime.

## Deploying to Render

1. Push this repo to GitHub.
2. Create a new Render "Web Service", connect the repo, and choose
   "Docker" as the environment (Render auto-detects the `Dockerfile`).
3. Set environment variables: `NEXT_PUBLIC_SITE_URL` (your Render-issued
   domain or custom domain) and `CLOUDCONVERT_API_KEY`.
4. Render injects `PORT` automatically; no extra config needed.

## Limits

- Max upload size: 20MB per file.
- Rate limit: 10 conversions per hour per IP (in-memory, resets if the
  server restarts — fine for a single-instance deployment, not for a
  multi-instance/auto-scaled one). This also caps CloudConvert usage/cost
  per user.
- PDF -> DOCX conversions cost money via CloudConvert once you're past
  their free tier (~25 conversions/day) — keep an eye on usage if traffic
  grows.
