/* Read-only Apps Script deployment smoke check. It never uses a baked-in URL:
 * an Owner supplies the current /exec URLs for the deployment being audited. */
const waterUrl = process.env.ANF3_WATER_SMOKE_URL;
const airUrl = process.env.ANF3_AIR_SMOKE_URL;

if (!waterUrl || !airUrl) {
  console.error('NOT RUN: set ANF3_WATER_SMOKE_URL and ANF3_AIR_SMOKE_URL to explicit /exec URLs.');
  process.exitCode = 2;
} else {
  const cases = [
    [waterUrl, 'pw-prw', ['Building 10', 'Building 12', 'Building 16', 'Other']],
    [waterUrl, 'wfi-pus', ['Building 16', 'Other']],
    [airUrl, 'em-air', ['Building 10', 'Building 12', 'Building 16', 'Other']],
    [airUrl, 'compressed-air', ['Building 10', 'Building 12', 'Building 16', 'Other']]
  ];
  const segment = (value) => {
    const text = String(value || '').toUpperCase();
    const match = text.match(/(?:BUILDING|BLDG|BLD|B)?[\s_.-]*(10|12|16)\b/);
    return match ? `B${match[1]}` : 'OTHER';
  };
  for (const [url, workflow, buildings] of cases) for (const building of buildings) {
    const seen = new Set(); let cursor = ''; let pages = 0;
    do {
      const request = new URL(url);
      request.searchParams.set('action', 'search'); request.searchParams.set('workflow', workflow);
      request.searchParams.set('building', building); request.searchParams.set('limit', '100');
      if (cursor) request.searchParams.set('cursor', cursor);
      const response = await fetch(request, { credentials: 'omit', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false || payload?.success === false) throw new Error(`${workflow} ${building}: ${payload?.error || response.status}`);
      const data = payload.data || {}; const items = Array.isArray(data.items) ? data.items : [];
      for (const item of items) if (segment(item.building) !== segment(building)) throw new Error(`${workflow} ${building}: received mixed building ${item.building}`);
      cursor = String(data.nextCursor || ''); pages += 1;
      if (cursor && (seen.has(cursor) || pages > 100)) throw new Error(`${workflow} ${building}: cursor did not terminate safely`);
      if (cursor) seen.add(cursor);
    } while (cursor);
    console.log(`PASS ${workflow} ${building}: ${pages} page(s), logical building scope preserved`);
  }
}
