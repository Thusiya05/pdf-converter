import type { Metadata } from "next";
import Converter from "@/components/Converter";

export const metadata: Metadata = {
  title: "Convert PDF to DOCX Online Free | Editable Word Document",
  description:
    "Convert a PDF file into an editable Word (.docx) document online for free. Drag, drop, and download in seconds. No sign-up, no watermark, no software to install.",
  alternates: { canonical: "/pdf-to-docx" },
};

export default function PdfToDocxPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Convert PDF to DOCX
        </h1>
        <p className="mt-3 text-gray-600">
          Upload a PDF and get back an editable Word document, free, with no
          sign-up and no watermark.
        </p>

        <div className="mt-8">
          <Converter direction="pdf2docx" />
        </div>

        <section className="mt-16 text-sm text-gray-600">
          <h2 className="text-base font-semibold text-gray-800">
            How to convert a PDF file to DOCX
          </h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>Drag and drop your .pdf file into the box above, or click to browse.</li>
            <li>Click the &quot;Convert to Word (.docx)&quot; button and wait a few seconds.</li>
            <li>Download your converted Word document.</li>
          </ol>

          <h2 className="mt-8 text-base font-semibold text-gray-800">FAQ</h2>
          <div className="mt-3 space-y-4">
            <div>
              <p className="font-medium text-gray-800">Will the formatting be preserved?</p>
              <p>
                Text-based PDFs convert cleanly into editable Word documents.
                Scanned/image-only PDFs (with no embedded text) cannot be
                converted to editable text.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">What&apos;s the maximum file size?</p>
              <p>Files up to 20MB are supported.</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Is my file kept after conversion?</p>
              <p>No. Your file is converted on the server and deleted immediately afterward.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
