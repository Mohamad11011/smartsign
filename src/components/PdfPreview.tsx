"use client";

import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  pdfBase64: string;
  className?: string;
}

export function PdfPreview({ pdfBase64, className }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBase64) {
      setDataUrl(`data:application/pdf;base64,${pdfBase64}`);
    } else {
      setDataUrl(null);
    }
  }, [pdfBase64]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  if (!dataUrl) {
    return <div className="p-8 text-center text-accent-muted">Loading PDF…</div>;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-accent-muted">Scale:</span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="w-32"
        />
        <span className="text-sm text-accent-muted">{numPages} page(s)</span>
      </div>
      <div className="overflow-auto rounded-xl border border-surface-border bg-surface-card p-4 max-h-[70vh]">
        <Document
          file={dataUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="p-8 text-center text-accent-muted">Loading PDF…</div>}
          error={<div className="p-8 text-center text-red-400">Failed to load PDF</div>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} className="mb-4">
              <Page
                pageNumber={pageNum}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
