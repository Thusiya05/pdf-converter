export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export type Direction = "docx2pdf" | "pdf2docx";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

// DOCX is a zip container; browsers/OSes sometimes report a generic type
// instead of the OOXML mime, so we accept a couple of common fallbacks.
const SOURCE_MIME_TYPES: Record<Direction, string[]> = {
  docx2pdf: [DOCX_MIME, "application/octet-stream", "application/zip"],
  pdf2docx: [PDF_MIME, "application/octet-stream"],
};

const SOURCE_EXTENSION: Record<Direction, string> = {
  docx2pdf: ".docx",
  pdf2docx: ".pdf",
};

const TARGET_EXTENSION: Record<Direction, string> = {
  docx2pdf: ".pdf",
  pdf2docx: ".docx",
};

const TARGET_MIME_TYPE: Record<Direction, string> = {
  docx2pdf: PDF_MIME,
  pdf2docx: DOCX_MIME,
};

export function isValidDirection(value: unknown): value is Direction {
  return value === "docx2pdf" || value === "pdf2docx";
}

export function expectedSourceExtension(direction: Direction): string {
  return SOURCE_EXTENSION[direction];
}

export function expectedTargetExtension(direction: Direction): string {
  return TARGET_EXTENSION[direction];
}

export function targetMimeType(direction: Direction): string {
  return TARGET_MIME_TYPE[direction];
}

export class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function hasValidSignature(buffer: Buffer, direction: Direction): boolean {
  if (direction === "pdf2docx") {
    return buffer.subarray(0, 4).toString("ascii") === "%PDF";
  }
  // DOCX is a zip archive: local file header signature "PK" 0x03 0x04
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

function isUnsafeFilenameChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return code < 32 || char === '"' || char === "\\" || char === "/";
}

export function sanitizeDownloadFilename(
  originalName: string,
  targetExt: string
): string {
  const base = originalName.replace(/\.[^/.]+$/, "");
  const cleanBase = Array.from(base)
    .filter((ch) => !isUnsafeFilenameChar(ch))
    .join("")
    .trim();
  return `${cleanBase || "converted"}${targetExt}`;
}

/**
 * Validates size, extension, mime type, and file-signature magic bytes,
 * then returns the file contents as a Buffer for the caller to convert.
 */
export async function validateAndReadFile(
  file: File,
  direction: Direction
): Promise<Buffer> {
  if (file.size === 0) {
    throw new ValidationError("The uploaded file is empty.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError("File exceeds the 20MB size limit.", 413);
  }

  const expectedExt = expectedSourceExtension(direction);
  if (!file.name.toLowerCase().endsWith(expectedExt)) {
    throw new ValidationError(`Expected a ${expectedExt} file for this conversion.`);
  }

  if (file.type && !SOURCE_MIME_TYPES[direction].includes(file.type)) {
    throw new ValidationError(`Unsupported file type: ${file.type}.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasValidSignature(buffer, direction)) {
    throw new ValidationError(
      `The file doesn't look like a valid ${expectedExt} file.`
    );
  }

  return buffer;
}
