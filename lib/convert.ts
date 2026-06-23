import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { conversionQueue } from "./queue";
import type { Direction } from "./validate";

const CONVERT_TIMEOUT_MS = 60_000;
const SOFFICE_BIN = process.env.SOFFICE_BIN || "soffice";

export class ConversionError extends Error {}

function toFileUri(absolutePath: string): string {
  let normalized = absolutePath.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  return `file://${normalized}`;
}

function runSoffice(
  inputPath: string,
  outDir: string,
  targetExt: string,
  profileDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--norestore",
      "--convert-to",
      targetExt,
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
      runSoffice(inputPath, workDir, targetExt, profileDir)
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
