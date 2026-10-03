// Data layer for the Pool permit alert demo. Zero deps, works in Node 18+ and the browser.
// Source: City of Los Angeles building permit records (public open data).

export const SINCE = '2026-07-01';

const BASE = 'https://data.lacity.org/resource/pi9x-tg5x.json';
const params = new URLSearchParams({
  $where: `permit_type='Swimming-Pool/Spa' AND issue_date>='${SINCE}'`,
  $order: 'issue_date DESC',
  $limit: '2000',
});
export const SOQL_URL = `${BASE}?${params.toString().replace(/\+/g, '%20')}`;

// Parcels (apn) that carry any wildfire-rebuild permit since the Jan 2025 fires. A pool permit on one of
// these parcels is a rebuild for a fire victim even when its own description has no tag.
const WILDFIRE_PARAMS = new URLSearchParams({
  $select: 'apn',
  $group: 'apn',
  $where: "issue_date>='2025-01-07' AND (upper(work_desc) like '%WILDFIRE%' OR upper(work_desc) like '%WILD FIRE%')",
  $limit: '50000',
});
export const WILDFIRE_APN_URL = `${BASE}?${WILDFIRE_PARAMS.toString().replace(/\+/g, '%20')}`;

// Drops raw rows whose parcel is in apnSet (a Set of apn strings).
export function excludeParcels(rows, apnSet) {
  return rows.filter((r) => !(r.apn && apnSet.has(String(r.apn))));
}

// Latest refresh_time among raw rows, as YYYY-MM-DD.
export function latestRefresh(rows) {
  return rows.reduce((m, r) => { const d = String(r.refresh_time || '').slice(0, 10); return d > m ? d : m; }, '');
}

const INCLUDE = ['NEW POOL', 'NEW SWIMMING POOL', 'POOL AND SPA', 'NEW POOL AND SPA', 'NEW SPA AND POOL'];
// Excludes always win over includes. WILDFIRE: "2025 Wildfire Project" rebuilds for fire
// victims are never framed as sales targets.
const EXCLUDE = [
  'WILDFIRE', 'REMODEL', 'FENCE', 'BARRIER', 'SUPPLEMENTAL', 'REVISION', 'REVISE', 'DEMOLI',
  'SUPPL. PERMIT', 'SUPPL PERMIT', 'REPLASTER', 'EQUIPMENT ONLY', '(E) POOL', '(E) SWIMMING POOL', 'EXISTING POOL', 'EXISTING SWIMMING POOL',
];

// Catches 'NEW 36'-0" X 15'-0" POOL AND ...' and 'NEW 418 SQUARE FOOT "L" SHAPE SWIMMING POOL'.
const NEW_POOL_RE = /\bNEW\b[^.]{0,60}\b(SWIMMING )?POOL\b/;

export function isNewPool(row) {
  // Pacific Palisades is excluded outright while the post-fire rebuild is underway.
  if (String(row.zip_code) === '90272') return false;
  const d = String(row.work_desc || '').toUpperCase();
  if (!INCLUDE.some((k) => d.includes(k)) && !NEW_POOL_RE.test(d)) return false;
  if (EXCLUDE.some((k) => d.includes(k))) return false;
  const lat = parseFloat(row.lat);
  const lon = parseFloat(row.lon);
  return Number.isFinite(lat) && Number.isFinite(lon);
}

const SMALL = new Set(['of', 'and', 'the']);
export function title(s) {
  return String(s || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (/^[nsew]$/.test(w)) return w.toUpperCase();
      if (/^(nb|sb|eb|wb)$/.test(w)) return w.toUpperCase();
      if (/^\d/.test(w)) return w.replace(/(\d)(st|nd|rd|th)$/, '$1$2');
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

// "822 N GALLOWAY ST" -> "800 block of N Galloway St". Never exposes the exact number.
export function blockFrom(address) {
  const a = String(address || '').trim().replace(/\s+/g, ' ');
  const m = a.match(/^(\d+)(?:\s*-\s*\d+)?(?:\s+\d+\/\d+)?\s+(.+)$/);
  if (!m) return a ? title(a.replace(/^\d[\d\s\/-]*/, '')) || 'Unknown street' : 'Unknown street';
  const n = parseInt(m[1], 10);
  const rest = title(m[2].replace(/^\d+\/\d+\s+/, ''));
  return `${Math.floor(n / 100) * 100} block of ${rest}`;
}

// Neighborhood council names arrive in two spellings ("ENCINO NC" and "Encino").
// Strip the NC/CC/NDC suffix (or "NC " prefix), then Title Case each word, hyphen and slash part.
const CNC_FIX = { 'Noho West': 'NoHo West' };
export function cleanCnc(s) {
  let c = String(s || '').trim().replace(/\s+/g, ' ');
  c = c.replace(/\s+(NC|CC|NDC)$/i, '').replace(/^NC\s+/i, '');
  c = c.toLowerCase().replace(/(^|[\s\-\/])([a-z])/g, (m, p, ch) => p + ch.toUpperCase());
  c = c.replace(/ (Of|And|The) /g, (m) => m.toLowerCase());
  return CNC_FIX[c] || c || 'Los Angeles';
}

const r3 = (x) => Number(parseFloat(x).toFixed(3));

export function anonymize(row) {
  return {
    id: row.permit_nbr,
    block: blockFrom(row.primary_address),
    cnc: cleanCnc(row.cnc || row.cpa),
    zip: row.zip_code,
    issue_date: String(row.issue_date || '').slice(0, 10),
    valuation: Number(row.valuation) || 0,
    lat: r3(row.lat),
    lon: r3(row.lon),
    status: row.status_desc,
  };
}
