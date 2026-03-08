"use client";

import { useCallback, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignatureDrawingProps {
  onSave: (base64Png: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
}

export function SignatureDrawing({
  onSave,
  onCancel,
  width = 400,
  height = 200,
}: SignatureDrawingProps) {
  const canvasRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    setIsEmpty(true);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const base64 = canvas.toDataURL("image/png");
    onSave(base64);
  }, [isEmpty, onSave]);

  const handleBegin = useCallback(() => {
    setIsEmpty(false);
  }, []);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-3">
      <h3 className="font-medium text-accent">Draw your signature</h3>
      <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
        <SignatureCanvas
          ref={canvasRef}
          canvasProps={{
            width,
            height,
            className: "w-full border-0 rounded",
            style: { touchAction: "none" },
          }}
          onBegin={handleBegin}
          backgroundColor="rgb(255, 255, 255)"
          penColor="rgb(0, 0, 0)"
          minWidth={1}
          maxWidth={3}
          throttle={16}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 border border-surface-border rounded-xl text-accent hover:bg-surface-light hover:border-primary/50 active:bg-primary/20 active:border-primary text-sm transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save signature
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-surface-border rounded-xl text-accent-muted hover:text-accent hover:border-primary/50 active:bg-surface-light text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
