import { describe, expect, it } from 'vitest';
import { buildDocumentRequestPayload } from './batchPrint';

describe('buildDocumentRequestPayload', () => {
  it('sends self-contained pages for an over-capacity EM record', () => {
    const samples = Array.from({ length: 51 }, (_, index) => ({
      samplingPoint: `Room ${index + 1}`,
      tempRoom: index + 1,
      occurResult: index + 1
    }));
    const request = buildDocumentRequestPayload(
      'em-air',
      { building: 'Building 12', temp: '22' },
      samples,
      'AT-26-B12-0001'
    );

    expect(request.pages).toHaveLength(2);
    expect(request.pages?.[0].building).toBe('Building 12');
    expect(request.pages?.[1].building).toBe('Building 12');
    expect(request.pages?.[1].roomNo01).toBe('Room 51');
    expect(request.pages?.[1].occurResult01).toBe('51');
    expect(request.pages?.[1].sampleCount).toBe('51');
  });

  it('keeps page-two source samples while repeating edited header values', () => {
    const samples = Array.from({ length: 31 }, (_, index) => ({
      samplingPoint: `Point ${index + 1}`,
      resultAvg: index + 1
    }));
    const request = buildDocumentRequestPayload(
      'cleaning-validation-rinse-pour',
      { building: 'Other', sampleMatrix: 'Rinse', comment: 'System comment' },
      samples,
      'CVR-26-OT-0001',
      'pour-plate',
      { comment: 'Reviewed comment', resultAvg01: 'Edited first page result' }
    );

    expect(request.pages).toHaveLength(2);
    expect(request.pages?.[0].comment).toBe('Reviewed comment');
    expect(request.pages?.[1].comment).toBe('Reviewed comment');
    expect(request.pages?.[0].resultAvg01).toBe('Edited first page result');
    expect(request.pages?.[1].resultAvg01).toBe('31');
  });

  it('keeps a one-page route on the existing flat request shape', () => {
    const request = buildDocumentRequestPayload(
      'pw-prw',
      { building: 'Building 10' },
      [{ samplingPoint: 'P1', resultAvg: 1 }],
      'WT-26-B10-0001'
    );

    expect(request.pages).toBeUndefined();
    expect(request.data.samplingPoint01).toBe('P1');
  });
});
