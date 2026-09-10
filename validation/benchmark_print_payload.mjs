/* Mapping timing is always available. Supply ANF3_BENCHMARK_SERVER on a local
 * converter-capable machine to measure the complete request -> PDF response. */
import { performance } from 'node:perf_hooks';
import { documentPayload } from '../apps/web/src/documentPayload.ts';

const samples = Array.from({ length: 30 }, (_, index) => ({
  samplingPoint: `Point ${index + 1}`, result1: '2.1', result2: 'TNTC', resultAvg: '3.2',
  tempRoom: 22.4, rhRoom: 55.6
}));
const record = { worksheetNo: 'WT-26-B16-0001', samplingDate: '2026-09-10T17:00:00.000Z' };
const iterations = 1000;
const started = performance.now();
for (let index = 0; index < iterations; index += 1) documentPayload('pw-prw', record, samples, record.worksheetNo);
const elapsed = performance.now() - started;
console.log(JSON.stringify({ workflow: 'pw-prw', iterations, elapsedMs: Number(elapsed.toFixed(2)), averageMs: Number((elapsed / iterations).toFixed(4)) }));

const server = process.env.ANF3_BENCHMARK_SERVER;
if (server) {
  const worksheetNo = process.env.ANF3_BENCHMARK_WORKSHEET || 'BENCH-LOCAL-0001';
  const requestStarted = performance.now();
  const response = await fetch(`${server.replace(/\/$/, '')}/api/pdfs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow: 'pw-prw', worksheetNo: worksheetNo, data: documentPayload('pw-prw', record, samples, worksheetNo) })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.pdfId) throw new Error(body.error || `PDF benchmark request failed: ${response.status}`);
  console.log(JSON.stringify({ stage: 'request-to-pdf-response', elapsedMs: Number((performance.now() - requestStarted).toFixed(2)), pdfId: body.pdfId }));
}
