import { File as NodeBufferFile } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { ConversionError, convertFile } from "@/lib/convert";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  ValidationError,
  expectedTargetExtension,
  isValidDirection,
  sanitizeDownloadFilename,
  targetMimeType,
  validateAndReadFile,
} from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 3600) },
      }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const direction = formData.get("direction");
  if (!isValidDirection(direction)) {
    return NextResponse.json({ error: "Invalid conversion direction." }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof NodeBufferFile)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const file = fileEntry as unknown as File;

  try {
    const buffer = await validateAndReadFile(file, direction);
    const converted = await convertFile(buffer, direction);

    const filename = sanitizeDownloadFilename(
      file.name,
      expectedTargetExtension(direction)
    );

    return new NextResponse(new Uint8Array(converted), {
      status: 200,
      headers: {
        "Content-Type": targetMimeType(direction),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(converted.length),
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ConversionError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Unexpected conversion error:", err);
    return NextResponse.json(
      { error: "Something went wrong during conversion." },
      { status: 500 }
    );
  }
}
