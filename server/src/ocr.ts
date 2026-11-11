import { createWorker, type Worker } from "tesseract.js";

// Creating a worker loads the English model (~10 MB, downloaded once and cached),
// so we create one and reuse it for every request.
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker("eng");
  return workerPromise;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

/** Step 1: plain OCR. Image bytes in, unstructured text out. */
export async function readText(image: Buffer): Promise<OcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return { text: data.text.trim(), confidence: data.confidence };
}

export async function shutdownOcr() {
  if (workerPromise) await (await workerPromise).terminate();
}
