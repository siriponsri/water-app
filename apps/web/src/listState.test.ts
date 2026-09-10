import { describe, expect, it } from 'vitest';
import { listReturnRoute, normalizeListSearchParams } from './listState';

describe('List URL state', () => {
  it('removes an incompatible workflow instead of mixing domains', () => {
    const normalized = normalizeListSearchParams(new URLSearchParams('domain=air&workflow=pw-prw&q=needle'));
    expect(normalized.get('domain')).toBe('air');
    expect(normalized.get('workflow')).toBeNull();
    expect(normalized.get('q')).toBe('needle');
  });

  it('derives the domain when a valid workflow is the only scope', () => {
    const normalized = normalizeListSearchParams(new URLSearchParams('workflow=wfi-pus'));
    expect(normalized.get('domain')).toBe('water');
    expect(normalized.get('workflow')).toBe('wfi-pus');
  });

  it('preserves both supported grouping modes', () => {
    expect(normalizeListSearchParams(new URLSearchParams('groupBy=building')).get('groupBy')).toBe('building');
    expect(normalizeListSearchParams(new URLSearchParams('groupBy=work')).get('groupBy')).toBe('work');
    expect(normalizeListSearchParams(new URLSearchParams('groupBy=unknown')).get('groupBy')).toBeNull();
  });

  it('keeps the complete return query', () => {
    const route = listReturnRoute(
      new URLSearchParams('building=Building+10&q=needle&from=2026-09-01&to=2026-09-10&groupBy=work'),
      'water',
      'pw-prw',
    );
    expect(route).toBe('/list?building=Building+10&q=needle&from=2026-09-01&to=2026-09-10&groupBy=work&domain=water&workflow=pw-prw');
  });
});
