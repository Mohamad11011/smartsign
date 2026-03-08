"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Sparkles, FileUp, MapPin, Users, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DocumentUploader } from "@/components/DocumentUploader";
import { PdfViewerWithFields } from "@/components/PdfViewerWithFields";
import { SignerManager } from "@/components/SignerManager";
import { ContractSummary } from "@/components/ContractSummary";
import { ChatWithContract } from "@/components/ChatWithContract";
import { AiFieldDetection } from "@/components/AiFieldDetection";
import { SaveAsTemplate } from "@/components/SaveAsTemplate";
import { TemplateSelector } from "@/components/TemplateSelector";
import { extractTextFromPdf, extractTextByPage } from "@/lib/pdf-text";
import type { SignatureFieldCoord, Signer } from "@/types/document";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stepper } from "@/components/ui/stepper";

function generateId() {
  return crypto.randomUUID();
}

const WIZARD_STEPS = [
  { id: "upload", label: "Upload" },
  { id: "fields", label: "Place fields" },
  { id: "recipients", label: "Recipients" },
  { id: "send", label: "Review & Send" },
];

function NewDocumentContent() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<SignatureFieldCoord[]>([]);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [aiTab, setAiTab] = useState("summary");

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setFields([]);
    setSigners([]);
    setDocumentId(null);
    setStep(1);
  }, []);

  const handleTemplateSelect = useCallback(
    (data: { file: File; fields: SignatureFieldCoord[]; signers: Signer[] }) => {
      setFile(data.file);
      setFields(data.fields);
      setSigners(data.signers);
      setDocumentId(null);
      setStep(1);
    },
    []
  );

  const searchParams = useSearchParams();
  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/templates/${templateId}`);
        if (!res.ok || cancelled) return;
        const t = await res.json();
        const bytes = Uint8Array.from(atob(t.pdfBase64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const f = new File([blob], t.documentName, { type: "application/pdf" });
        const fieldsData: SignatureFieldCoord[] = (t.fields ?? []).map((field: { id: string; page: number; x: number; y: number; label?: string }) => ({
          id: generateId(),
          page: field.page,
          x: field.x,
          y: field.y,
          label: field.label ?? "Sign here",
        }));
        const signersData: Signer[] = (t.signerRoles ?? []).map((sr: { role: string; signingOrder: number }) => ({
          id: generateId(),
          name: "",
          email: "",
          role: sr.role || "Signer",
          signingOrder: sr.signingOrder,
        }));
        if (!cancelled) {
          setFile(f);
          setFields(fieldsData);
          setSigners(signersData);
          setStep(1);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams]);

  const handleAddField = useCallback((coord: { page: number; x: number; y: number }) => {
    setFields((prev) => [
      ...prev,
      { id: generateId(), page: coord.page, x: coord.x, y: coord.y, label: "Sign here" },
    ]);
  }, []);

  const handleRemoveField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleExtractText = useCallback(async () => {
    if (!file) return "";
    return extractTextFromPdf(file);
  }, [file]);

  const handleGetPages = useCallback(async () => {
    if (!file) return [];
    return extractTextByPage(file);
  }, [file]);

  const handleGetPdfBase64 = useCallback(async () => {
    if (!file) return "";
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, [file]);

  const handleSaveAsTemplate = useCallback(
    async (name: string) => {
      if (!file || fields.length === 0) return;
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const signerRoles = signers.map((s) => ({
        role: s.role || "Signer",
        signingOrder: s.signingOrder,
      }));
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          documentName: file.name,
          pdfBase64,
          fields: fields.map((f) => ({ id: f.id, page: f.page, x: f.x, y: f.y, label: f.label })),
          signerRoles,
        }),
      });
      if (!res.ok) throw new Error("Failed to save template");
    },
    [file, fields, signers]
  );

  const [sendAndSaveState, setSendAndSaveState] = useState<"idle" | "saving" | "sending" | "done" | "error">("idle");
  const [sendAndSaveError, setSendAndSaveError] = useState<string | null>(null);

  const handleSendAndSave = useCallback(async () => {
    if (!file || signers.length === 0 || fields.length === 0) return;
    setSendAndSaveState("saving");
    setSendAndSaveError(null);
    try {
      const recipients = signers.map((s) => `${s.name} <${s.email}> (${s.role || "Signer"} #${s.signingOrder})`).join(", ");
      const recipientsDetail = signers.map((s) => ({
        name: s.name,
        email: s.email,
        role: s.role || "Signer",
        signingOrder: s.signingOrder,
        signerId: s.id,
      }));
      const saveRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, recipients, recipientsDetail, status: "draft" }),
      });
      if (!saveRes.ok) throw new Error("Failed to save document");
      const doc = await saveRes.json();
      const docId = doc.id;
      setDocumentId(docId);

      setSendAndSaveState("sending");
      const pdfBase64 = await handleGetPdfBase64();
      const coordinates = fields.map((f) => ({ page: f.page, x: f.x, y: f.y }));

      for (const signer of signers) {
        const sendRes = await fetch("/api/send-signing-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfBase64,
            documentName: file.name,
            signerEmail: signer.email,
            signerName: signer.name,
            signerId: signer.id,
            documentId: docId,
            recipientsDetail,
            coordinates,
          }),
        });
        if (!sendRes.ok) {
          const data = await sendRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to send invite");
        }
      }
      setSendAndSaveState("done");
    } catch (err) {
      setSendAndSaveError(err instanceof Error ? err.message : "Something went wrong");
      setSendAndSaveState("error");
    }
  }, [file, signers, fields, handleGetPdfBase64]);

  const canGoNext = () => {
    if (step === 0) return !!file;
    if (step === 1) return fields.length > 0;
    if (step === 2) return signers.length > 0;
    return true;
  };

  const resetWizard = () => {
    setFile(null);
    setFields([]);
    setSigners([]);
    setTemplateName("");
    setStep(0);
    setSendAndSaveState("idle");
    setSendAndSaveError(null);
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-surface-border bg-surface-light/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-accent tracking-tight">New document</h1>
        <nav className="flex gap-6">
          <Link href="/documents/new" className="text-primary font-medium hover:text-primary-hover transition-colors">
            New document
          </Link>
          <Link href="/dashboard" className="text-accent-muted hover:text-accent active:text-primary transition-colors">
            Dashboard
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full overflow-auto">
        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-accent mb-2">
                Sign documents smarter
              </h2>
              <p className="text-accent-muted text-lg">
                Upload a PDF or start from a template
              </p>
            </div>
            <Stepper steps={WIZARD_STEPS} currentStep={0} />
            <div className="space-y-6 pt-8">
              <DocumentUploader key="upload" onFileSelect={handleFileSelect} />
              <TemplateSelector onSelect={handleTemplateSelect} />
            </div>
          </div>
        )}

        {/* Step 1: Place fields */}
        {step === 1 && file && (
          <div className="space-y-6">
            <Stepper
              steps={WIZARD_STEPS}
              currentStep={1}
              onStepClick={(i) => i === 0 && setStep(0)}
            />
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-4">
              <div className="xl:col-span-8">
                <Card className="overflow-hidden">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Place signature fields
                    </CardTitle>
                    <p className="text-sm text-accent-muted">
                      Click on the PDF where signers should sign. Add at least one field to continue.
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <PdfViewerWithFields
                      file={file}
                      fields={fields}
                      onAddField={handleAddField}
                      onRemoveField={handleRemoveField}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="xl:col-span-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={aiTab} onValueChange={setAiTab}>
                      <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
                        <TabsTrigger value="chat" className="text-xs">Chat</TabsTrigger>
                        <TabsTrigger value="detect" className="text-xs">Detect</TabsTrigger>
                      </TabsList>
                      <TabsContent value="summary">
                        <ContractSummary onAnalyze={handleExtractText} disabled={!file} embedded />
                      </TabsContent>
                      <TabsContent value="chat">
                        <ChatWithContract onGetContractText={handleExtractText} disabled={!file} embedded />
                      </TabsContent>
                      <TabsContent value="detect">
                        <AiFieldDetection onGetPages={handleGetPages} disabled={!file} embedded />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={fields.length === 0}
                    className="flex-1"
                  >
                    Next: Add recipients
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Recipients */}
        {step === 2 && file && (
          <div className="space-y-6">
            <Stepper
              steps={WIZARD_STEPS}
              currentStep={2}
              onStepClick={(i) => setStep(i)}
            />
            <div className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Add recipients
                  </CardTitle>
                  <p className="text-sm text-accent-muted">
                    Add signers in the order they should sign. Each will receive a unique signing link.
                  </p>
                </CardHeader>
                <CardContent>
                  <SignerManager signers={signers} onChange={setSigners} />
                </CardContent>
              </Card>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={signers.length === 0}
                  className="flex-1"
                >
                  Next: Review & Send
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && file && (
          <div className="space-y-6">
            <Stepper
              steps={WIZARD_STEPS}
              currentStep={3}
              completedStep={sendAndSaveState === "done" ? WIZARD_STEPS.length : undefined}
              onStepClick={(i) => setStep(i)}
            />
            <div className="pt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    Review & Send
                  </CardTitle>
                  <p className="text-sm text-accent-muted">
                    Send signing links to your recipients. You can also save as a template for reuse.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-surface-border bg-surface-light/30 p-4">
                    <p className="text-sm font-medium text-accent">{file.name}</p>
                    <p className="text-xs text-accent-muted mt-1">
                      {fields.length} field(s) · {signers.length} recipient(s)
                    </p>
                  </div>
                  <SaveAsTemplate
                    templateName={templateName}
                    onTemplateNameChange={setTemplateName}
                    onSave={handleSaveAsTemplate}
                    disabled={!file}
                    fields={fields}
                    signers={signers}
                  />
                  <div className="flex flex-col gap-4 pt-4 border-t border-surface-border">
                    <Button
                      onClick={handleSendAndSave}
                      disabled={!file || fields.length === 0 || signers.length === 0 || sendAndSaveState === "saving" || sendAndSaveState === "sending"}
                      className="w-full py-6 text-base font-semibold"
                    >
                      {sendAndSaveState === "saving" && "Saving document…"}
                      {sendAndSaveState === "sending" && `Sending invites…`}
                      {sendAndSaveState === "done" && "Sent! ✓"}
                      {(sendAndSaveState === "idle" || sendAndSaveState === "error") && "Send and Save"}
                    </Button>
                    {sendAndSaveError && (
                      <p className="text-sm text-red-400">{sendAndSaveError}</p>
                    )}
                    {sendAndSaveState === "done" && (
                      <p className="text-sm text-green-400">
                        Document saved and signing links sent to all {signers.length} recipient(s).
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={resetWizard} className="text-accent-muted">
                        Start over
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-full">
          <header className="border-b border-surface-border bg-surface-light/50 px-6 py-4">
            <div className="text-accent-muted">Loading…</div>
          </header>
        </div>
      }
    >
      <NewDocumentContent />
    </Suspense>
  );
}
