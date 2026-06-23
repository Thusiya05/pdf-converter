"use client";

import { useRef, useState } from "react";

type Direction = "docx2pdf" | "pdf2docx";

type Status = "idle" | "converting" | "done" | "error";

const CONFIG: Record<
  Direction,
  { accept: string; sourceLabel: string; targetLabel: string }
> = {
  docx2pdf: {
    accept: ".docx",
    sourceLabel: "Word (.docx)",
    targetLabel: "PDF",
  },
  pdf2docx: {
    accept: ".pdf",
    sourceLabel: "PDF",
    targetLabel: "Word (.docx)",
  },
};

export default function Converter({ direction }: { direction: Direction }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = CONFIG[direction];

  function reset() {
    setStatus("idle");
    setError(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  }

  function handleFileSelected(selected: File | null) {
    reset();
    setFile(selected);
  }

  async function handleConvert() {
    if (!file) return;
    setStatus("converting");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("direction", direction);
      formData.append("file", file);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Conversion failed. Please try again.");
      }

      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setDownloadName(match ? match[1] : `converted${config.accept}`);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Conversion failed.");
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) handleFileSelected(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
        <p className="text-sm text-gray-600">
          Drag and drop a {config.sourceLabel} file here, or click to browse
        </p>
        {file && (
          <p className="mt-2 text-sm font-medium text-gray-900">{file.name}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">Max file size: 20MB</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={!file || status === "converting"}
          onClick={handleConvert}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {status === "converting"
            ? "Converting..."
            : `Convert to ${config.targetLabel}`}
        </button>

        {status === "done" && downloadUrl && (
          <a
            href={downloadUrl}
            download={downloadName}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Download {config.targetLabel}
          </a>
        )}
      </div>

      {status === "error" && error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
