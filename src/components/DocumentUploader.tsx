"use client";

import { useCallback, useState } from "react";

interface DocumentUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export function DocumentUploader({
  onFileSelect,
  accept = "application/pdf",
  disabled = false,
}: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file || file.type !== "application/pdf") return;
      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0] ?? null);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200
        ${dragActive ? "border-primary bg-primary/20 scale-[1.01] shadow-primary-glow-lg" : "border-surface-border bg-surface-card hover:border-primary hover:bg-surface-light active:border-primary active:bg-primary/10"}
        ${disabled ? "opacity-60 pointer-events-none" : "cursor-pointer"}
      `}
    >
      <input
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="hidden"
        id="doc-upload"
        disabled={disabled}
      />
      <label htmlFor="doc-upload" className="cursor-pointer block">
        <div className="mb-3 text-4xl">📄</div>
        <span className="text-accent text-lg font-medium block">
          {fileName ?? "Drop a PDF here or click to upload"}
        </span>
        <span className="text-accent-muted text-sm mt-1 block">
          PDF files only
        </span>
      </label>
    </div>
  );
}
