"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { SignatureFieldCoord } from "@/types/document";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerWithFieldsProps {
  file: File | string;
  fields: SignatureFieldCoord[];
  onAddField: (coord: { page: number; x: number; y: number }) => void;
  onRemoveField?: (id: string) => void;
  readOnly?: boolean;
}

const FIELD_WIDTH = 180;
const FIELD_HEIGHT = 50;

export function PdfViewerWithFields({
  file,
  fields,
  onAddField,
  onRemoveField,
  readOnly = false,
}: PdfViewerWithFieldsProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.2);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof file === "string") {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setFileUrl(file);
      return;
    }
    const url = URL.createObjectURL(file);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setFileUrl(url);
    return () => {
      const toRevoke = urlRef.current;
      urlRef.current = null;
      if (toRevoke) {
        setTimeout(() => URL.revokeObjectURL(toRevoke), 500);
      }
    };
  }, [file]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, page: number) => {
      if (readOnly) return;
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onAddField({ page, x: x / scale, y: y / scale });
    },
    [onAddField, readOnly, scale]
  );

  if (!fileUrl) {
    return <div className="p-8 text-center text-accent-muted">Loading PDF…</div>;
  }

  const fileKey = typeof file === "string" ? file : `${file.name}-${file.size}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 pl-4">
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
      <div className="overflow-auto rounded-xl border border-surface-border bg-surface-card p-4">
        <Document
          key={fileKey}
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="p-8 text-center text-accent-muted">Loading PDF…</div>}
          error={<div className="p-8 text-center text-red-400">Failed to load PDF</div>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} className="relative inline-block mb-4">
              <div
                className="relative cursor-crosshair"
                onClick={(e) => handlePageClick(e, pageNum)}
              >
                <Page
                  pageNumber={pageNum}
                  width={undefined}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer
                />
              </div>
              {fields
                .filter((f) => f.page === pageNum)
                .map((f) => (
                  <div
                    key={f.id}
                    className="absolute border-2 border-dashed border-primary bg-primary/20 rounded flex items-center justify-center text-xs text-primary"
                    style={{
                      left: f.x * scale,
                      top: f.y * scale,
                      width: FIELD_WIDTH,
                      height: FIELD_HEIGHT,
                    }}
                  >
                    {f.label ?? "Sign here"}
                    {!readOnly && onRemoveField && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveField(f.id);
                        }}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
