# DocConvert

Free DOCX <-> PDF converter built with Next.js. DOCX -> PDF runs through
headless LibreOffice; PDF -> DOCX runs through the Python `pdf2docx`
library (LibreOffice's headless PDF import is unreliable for
styled/multi-column layouts like resumes). No third-party API dependency.

## Local development

Requires Node 20+. To actually exercise conversions you also need:

- A local LibreOffice install (the `soffice` binary on your PATH) for
  DOCX -> PDF.
- Python 3 with `pdf2docx` installed (`pip install pdf2docx`) for
  PDF -> DOCX.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

If `soffice` isn't on your PATH, set `SOFFICE_BIN` to the full path of the
binary (e.g. on Windows: `C:\Program Files\LibreOffice\program\soffice.exe`).
If `python3` isn't on your PATH (common on Windows, where it's just
`python`), set `PYTHON_BIN` accordingly.

## Running with Docker (recommended way to test conversion locally)

The Docker image bundles LibreOffice, so this is the most reliable way to
test the full conversion flow before deploying:

```bash
docker build -t docconvert .
docker run -p 3000:3000 docconvert
```

Open http://localhost:3000.

## Environment variables

- `NEXT_PUBLIC_SITE_URL` — the public URL of the deployed site (used for
  canonical links, sitemap, robots.txt, and Open Graph tags). Set this to
  your real domain in production, e.g. `https://docconvert.example.com`.
- `SOFFICE_BIN` — path to the `soffice` executable. Defaults to `soffice`
  (works inside the provided Docker image).
- `PYTHON_BIN` — path to the Python executable used for PDF -> DOCX.
  Defaults to `python3` (works inside the provided Docker image).

## Deploying to Railway

1. Push this repo to GitHub.
2. Create a new Railway project, choose "Deploy from GitHub repo".
3. Railway auto-detects the `Dockerfile` and builds/deploys it as a single
   service — no extra config needed.
4. Set the `NEXT_PUBLIC_SITE_URL` environment variable to your Railway-issued
   domain (or custom domain).
5. Railway sets `PORT` automatically; the app already binds to
   `process.env.PORT` via the Dockerfile's `ENV PORT=3000` default and
   Next's standalone server, which reads `PORT` at runtime.

## Deploying to Render

1. Push this repo to GitHub.
2. Create a new Render "Web Service", connect the repo, and choose
   "Docker" as the environment (Render auto-detects the `Dockerfile`).
3. Set the `NEXT_PUBLIC_SITE_URL` environment variable to your Render-issued
   domain (or custom domain).
4. Render injects `PORT` automatically; no extra config needed.

## Limits

- Max upload size: 20MB per file.
- Rate limit: 10 conversions per hour per IP (in-memory, resets if the
  server restarts — fine for a single-instance deployment, not for a
  multi-instance/auto-scaled one).
