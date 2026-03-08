import * as pdfjs from "pdfjs-dist";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

const { getDocument } = pdfjs;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await getDocument(arrayBuffer).promise;
  const numPages = doc.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(text);
  }

  return parts.join("\n\n").trim();
}

export interface PageText {
  page: number;
  text: string;
}

export async function extractTextByPage(file: File): Promise<PageText[]> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await getDocument(arrayBuffer).promise;
  const numPages = doc.numPages;
  const result: PageText[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    result.push({ page: i, text: text.trim() });
  }

  return result;
}
