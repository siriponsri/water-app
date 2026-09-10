/* =========================================================================
   Printing a batch of worksheets
   -------------------------------------------------------------------------
   The lab prints a run of worksheets at a time, not one. Firing the browser's
   print dialog once per worksheet is unusable past about three, so the
   selected records are generated one at a time on the local server — the same
   `/api/pdfs` route and the same controlled templates as a single print, no
   new server surface — and then stitched into one document in the browser.

   That gives one print dialog, one paper stack in worksheet order, and one
   file if they would rather save it. Merging happens here rather than on the
   server because the pages are already rendered and controlled by then:
   nothing about the document content is decided in the browser.

   Rendering and merging are two steps, not one, because the operator needs to
   SEE the stack before it reaches paper. `renderBatch()` returns each
   worksheet as its own document with its page count; the preview shows them,
   lets the operator drop the ones they did not mean to print, and only then
   does `mergeParts()` build the document that is actually printed. Dropping a
   worksheet in the preview costs nothing — it is already rendered, so no
   second trip to the server is needed to change the selection.
   ========================================================================= */

import { PDFDocument } from 'pdf-lib';
import { getSystemRecord } from './api';
import { getCachedRecord } from './storage';
import type { Workflow } from './appData';
import { normalizeCvTestMethod, pdfRouteForRecord, cvSamplingFamily } from './recordPolicy';
import { documentPayload } from './documentPayload';

export type BatchItem = { recordKey: string; worksheetNo: string };

export type BatchProgress = {
  done: number;
  total: number;
  current: string;
};

/** One rendered worksheet, held on its own so the preview can drop it. */
export type BatchPart = {
  recordKey: string;
  worksheetNo: string;
  bytes: ArrayBuffer;
  pageCount: number;
};

export type BatchRender = {
  parts: BatchPart[];
  /** Worksheets that could not be rendered, with the reason. */
  skipped: { worksheetNo: string; reason: string }[];
};

async function pdfForRecord(workflow: Workflow, recordKey: string, presetMethod?: string) {
  const cached = await getCachedRecord(workflow.domain, workflow.id, recordKey);
  const value = cached ?? await getSystemRecord(workflow, recordKey);
  const record = value.record;
  const method = presetMethod || (workflow.id === 'cv' ? normalizeCvTestMethod(record.testMethod || record.samplingMethod) : undefined);
  const route = pdfRouteForRecord(workflow, record, method);
  if (!route) {
    throw new Error(cvSamplingFamily(record) === 'rinse'
      ? 'the rinse test method is not set on this record'
      : 'no template is configured for this workflow');
  }
  const response = await fetch('/api/pdfs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow: route,
      worksheetNo: String(record.worksheetNo || record.docNo || recordKey),
      cvContext: workflow.id === 'cv'
        ? { samplingFamily: cvSamplingFamily(record), testMethod: method }
        : undefined,
      data: documentPayload(route, record, value.samples, String(record.worksheetNo || record.docNo || recordKey), method)
    })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'the server refused it');
  const file = await fetch(`/api/pdfs/${result.pdfId}/download`);
  if (!file.ok) throw new Error('the rendered file could not be read back');
  return { bytes: await file.arrayBuffer(), route };
}

/**
 * Renders every selected worksheet, in the order given, keeping each as its
 * own document. One failure does not stop the run — the reason is reported per
 * worksheet, so a batch of forty is not lost to one record with a missing
 * method.
 */
export async function renderBatch(
  workflow: Workflow,
  items: BatchItem[],
  presetMethod: string | undefined,
  onProgress: (progress: BatchProgress) => void,
  signal?: AbortSignal
): Promise<BatchRender> {
  const parts: BatchPart[] = [];
  const skipped: { worksheetNo: string; reason: string }[] = [];

  for (let index = 0; index < items.length; index += 1) {
    if (signal?.aborted) break;
    const item = items[index];
    onProgress({ done: index, total: items.length, current: item.worksheetNo });
    try {
      const { bytes } = await pdfForRecord(workflow, item.recordKey, presetMethod);
      /* Load once here to learn the page count and to fail early on a
         corrupt file, rather than at merge time with the dialog already up. */
      const source = await PDFDocument.load(bytes);
      parts.push({
        recordKey: item.recordKey,
        worksheetNo: item.worksheetNo,
        bytes,
        pageCount: source.getPageCount()
      });
    } catch (reason) {
      skipped.push({
        worksheetNo: item.worksheetNo,
        reason: reason instanceof Error ? reason.message : 'it could not be rendered'
      });
    }
  }

  onProgress({ done: items.length, total: items.length, current: '' });
  return { parts, skipped };
}

/** Stitches the chosen parts, in the order given, into one document. */
export async function mergeParts(parts: BatchPart[]): Promise<Blob | null> {
  if (!parts.length) return null;
  const merged = await PDFDocument.create();
  for (const part of parts) {
    const source = await PDFDocument.load(part.bytes);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  /* Copy into a fresh buffer: pdf-lib returns a view over its own memory. */
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy], { type: 'application/pdf' });
}
