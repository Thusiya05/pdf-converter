import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free DOCX to PDF and PDF to DOCX Converter Online",
  description:
    "Convert Word documents to PDF or PDF files to editable Word documents online, free, with no sign-up. Fast, private, and works in your browser.",
  alternates: { canonical: "/" },
};

const tools = [
  {
    href: "/docx-to-pdf",
    title: "DOCX to PDF",
    description: "Turn a Word document into a clean, shareable PDF.",
  },
  {
    href: "/pdf-to-docx",
    title: "PDF to DOCX",
    description: "Turn a PDF back into an editable Word document.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          Convert DOCX and PDF files online, for free
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          No sign-up, no watermark, no installation. Pick a tool below to get
          started.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-xl border border-gray-200 p-6 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
          >
            <h2 className="text-xl font-semibold text-gray-900">{tool.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{tool.description}</p>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-3xl text-sm text-gray-500">
        <h2 className="text-base font-semibold text-gray-700">
          Why use this converter?
        </h2>
        <p className="mt-2">
          Files are converted on our server using LibreOffice and deleted
          immediately afterward, nothing is stored. Conversions are limited
          to 20MB per file to keep the service fast and free for everyone.
        </p>
      </div>
    </main>
  );
}
