import type { Metadata } from "next";
import Converter from "@/components/Converter";

export const metadata: Metadata = {
  title: "Convert DOCX to PDF Online Free | No Sign-up Required",
  description:
    "Convert a Word (.docx) document to PDF online for free. Drag, drop, and download in seconds. No sign-up, no watermark, no software to install.",
  alternates: { canonical: "/docx-to-pdf" },
};

export default function DocxToPdfPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Convert DOCX to PDF
        </h1>
        <p className="mt-3 text-gray-600">
          Upload a Word document and get back a clean, portable PDF, free,
          with no sign-up and no watermark.
        </p>

        <div className="mt-8">
          <Converter direction="docx2pdf" />
        </div>

        <section className="mt-16 text-sm text-gray-600">
          <h2 className="text-base font-semibold text-gray-800">
            How to convert a DOCX file to PDF
          </h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>Drag and drop your .docx file into the box above, or click to browse.</li>
            <li>Click the &quot;Convert to PDF&quot; button and wait a few seconds.</li>
            <li>Download your converted PDF file.</li>
          </ol>

          <h2 className="mt-8 text-base font-semibold text-gray-800">FAQ</h2>
          <div className="mt-3 space-y-4">
            <div>
              <p className="font-medium text-gray-800">Is this really free?</p>
              <p>Yes. There&apos;s no sign-up, no limit on the number of conversions, and no watermark on your file.</p>
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
