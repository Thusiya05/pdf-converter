import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { conversionQueue } from "./queue";
import type { Direction } from "./validate";

const CONVERT_TIMEOUT_MS = 60_000;
const SOFFICE_BIN = process.env.SOFFICE_BIN || "soffice";
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const PDF_TO_DOCX_SCRIPT = path.join(process.cwd(), "scripts", "pdf_to_docx.py");

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

// PDF -> DOCX goes through the pdf2docx Python library instead of
// LibreOffice. Headless soffice's PDF import is built for editing simple
// PDFs and frequently produces an empty document for styled/multi-column
// layouts (e.g. resumes); pdf2docx actually parses the PDF layout (text,
// tables, images) and rebuilds a real Word document.
function runPdfToDocx(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      PYTHON_BIN,
      [PDF_TO_DOCX_SCRIPT, inputPath, outputPath],
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
      reject(new ConversionError(`Could not start pdf2docx: ${err.message}`));
    });
  });
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
        : runPdfToDocx(inputPath, outputPath)
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
