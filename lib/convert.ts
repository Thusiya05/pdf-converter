import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { conversionQueue } from "./queue";
import type { Direction } from "./validate";

const CONVERT_TIMEOUT_MS = 60_000;
const SOFFICE_BIN = process.env.SOFFICE_BIN || "soffice";
const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_API_BASE = "https://api.cloudconvert.com/v2";
const CLOUDCONVERT_POLL_INTERVAL_MS = 1500;

export class ConversionError extends Error {}

function toFileUri(absolutePath: string): string {
  let normalized = absolutePath.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  return `file://${normalized}`;
}

// DOCX -> PDF goes through headless LibreOffice, which handles this
// direction reliably.
function runSofficeDocxToPdf(
  inputPath: string,
  outDir: string,
  profileDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--norestore",
      "--convert-to",
      "pdf",
      "--outdir",
      outDir,
      `-env:UserInstallation=${toFileUri(profileDir)}`,
      inputPath,
    ];

    const child = execFile(
      SOFFICE_BIN,
      args,
      { timeout: CONVERT_TIMEOUT_MS },
      (error, _stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(new ConversionError("Conversion timed out."));
            return;
          }
          reject(
            new ConversionError(
              `Conversion failed: ${stderr?.trim() || error.message}`
            )
          );
          return;
        }
        resolve();
      }
    );

    child.on("error", (err) => {
      reject(new ConversionError(`Could not start soffice: ${err.message}`));
    });
  });
}

type CloudConvertTask = {
  id: string;
  name: string;
  operation: string;
  status: string;
  message?: string;
  result?: {
    form?: { url: string; parameters: Record<string, string> };
    files?: { url: string; filename?: string }[];
  };
};

type CloudConvertJob = {
  id: string;
  status: string;
  tasks: CloudConvertTask[];
};

async function cloudConvertRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${CLOUDCONVERT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ConversionError(
      `CloudConvert API error (${response.status}): ${body.slice(0, 300)}`
    );
  }

  const json = await response.json();
  return json.data as T;
}

// PDF -> DOCX goes through the CloudConvert API instead of LibreOffice.
// Headless soffice's PDF import is built for editing simple PDFs and
// frequently drops content (text frames, table columns) for styled,
// real-world documents; CloudConvert's engine handles this far more
// reliably, at the cost of a per-conversion fee and a third-party
// dependency.
async function convertPdfToDocxViaCloudConvert(
  inputPath: string,
  outputPath: string
): Promise<void> {
  if (!CLOUDCONVERT_API_KEY) {
    throw new ConversionError(
      "PDF to DOCX conversion is not configured (missing CLOUDCONVERT_API_KEY)."
    );
  }

  let job = await cloudConvertRequest<CloudConvertJob>("/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tasks: {
        "import-file": { operation: "import/upload" },
        "convert-file": {
          operation: "convert",
          input: "import-file",
          output_format: "docx",
        },
        "export-file": { operation: "export/url", input: "convert-file" },
      },
    }),
  });

  const uploadTask = job.tasks.find((task) => task.name === "import-file");
  const uploadForm = uploadTask?.result?.form;
  if (!uploadForm) {
    throw new ConversionError(
      "CloudConvert did not return an upload target."
    );
  }

  const fileBuffer = await readFile(inputPath);
  const formData = new FormData();
  for (const [key, value] of Object.entries(uploadForm.parameters)) {
    formData.append(key, value);
  }
  formData.append("file", new Blob([fileBuffer]), "input.pdf");

  const uploadResponse = await fetch(uploadForm.url, {
    method: "POST",
    body: formData,
  });
  if (!uploadResponse.ok) {
    throw new ConversionError("Failed to upload file to CloudConvert.");
  }

  const deadline = Date.now() + CONVERT_TIMEOUT_MS;
  for (;;) {
    job = await cloudConvertRequest<CloudConvertJob>(`/jobs/${job.id}`);

    if (job.status === "finished") break;

    if (job.status === "error") {
      const failedTask = job.tasks.find((task) => task.status === "error");
      throw new ConversionError(
        `CloudConvert conversion failed: ${failedTask?.message || "unknown error"}`
      );
    }

    if (Date.now() > deadline) {
      throw new ConversionError("Conversion timed out.");
    }

    await new Promise((r) => setTimeout(r, CLOUDCONVERT_POLL_INTERVAL_MS));
  }

  const exportTask = job.tasks.find(
    (task) => task.operation === "export/url"
  );
  const resultFile = exportTask?.result?.files?.[0];
  if (!resultFile?.url) {
    throw new ConversionError(
      "CloudConvert did not return a converted file."
    );
  }

  const downloadResponse = await fetch(resultFile.url);
  if (!downloadResponse.ok) {
    throw new ConversionError(
      "Failed to download the converted file from CloudConvert."
    );
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

export async function convertFile(
  buffer: Buffer,
  direction: Direction
): Promise<Buffer> {
  const workDir = await mkdtemp(path.join(tmpdir(), "convert-"));
  const sourceExt = direction === "docx2pdf" ? "docx" : "pdf";
  const targetExt = direction === "docx2pdf" ? "pdf" : "docx";
  const inputPath = path.join(workDir, `input.${sourceExt}`);
  const profileDir = path.join(workDir, "lo-profile");
  const outputPath = path.join(workDir, `input.${targetExt}`);

  try {
    await writeFile(inputPath, buffer);

    await conversionQueue.add(() =>
      direction === "docx2pdf"
        ? runSofficeDocxToPdf(inputPath, workDir, profileDir)
        : convertPdfToDocxViaCloudConvert(inputPath, outputPath)
    );

    const outputStat = await stat(outputPath).catch(() => null);
    if (!outputStat || outputStat.size === 0) {
      throw new ConversionError(
        "Conversion produced no output. The source file may be corrupted or unsupported."
      );
    }

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
