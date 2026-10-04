// Data layer for the Hail lead finder demo. Zero deps, works in Node 18+ and the browser.
// Sources: NOAA SPC preliminary hail reports, NOAA MRMS MESH radar estimates, Tarrant Appraisal District public map.

import { blockFrom, title } from '../pool-permits/anonymize.mjs';

export { title };

export const SPC_URL = (yymmdd) => `https://www.spc.noaa.gov/climo/reports/${yymmdd}_rpts_hail.csv`;
export const SPC_TODAY_URL = 'https://www.spc.noaa.gov/climo/reports/today_hail.csv';
export const STUDY_BOX = { latMin: 32.62, latMax: 32.95, lonMin: -97.56, lonMax: -97.1 };

// Tier bins in inches (SPC / insurance-claim size classes). A home gets the highest tier at or under its value.
export const TIERS = [0.75, 1, 1.5, 1.75, 2, 2.5, 2.75];
export const TIER_NAMES = { 0.75: 'Penny', 1: 'Quarter', 1.5: 'Ping pong', 1.75: 'Golf ball', 2: 'Hen egg', 2.5: 'Tennis ball', 2.75: 'Baseball' };
export const MM_PER_IN = 25.4;
export const mmToIn = (mm) => mm / MM_PER_IN;
export function tierOf(inches) {
  let t = null;
  for (const b of TIERS) if (inches + 1e-9 >= b) t = b;
  return t;
}
export const tierOfMm = (mm) => tierOf(mmToIn(mm));
export const tierLabel = (t) => (t == null ? 'Under 0.75 in' : `${t} in (${TIER_NAMES[t]})`);

// Minimal CSV line split: first 7 columns are plain, the rest is the free-text comment (may hold commas).
export function parseSpcCsv(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter(Boolean);
  const out = [];
  for (const line of lines.slice(1)) {
    const p = line.split(',');
    if (p.length < 7) continue;
    const lat = parseFloat(p[5]);
    const lon = parseFloat(p[6]);
    const size = parseInt(p[1], 10);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(size)) continue;
    out.push({ time: p[0], size, location: p[2], county: p[3], state: p[4], lat, lon, comments: p.slice(7).join(',') });
  }
  return out;
}

export function inStudyBox(r, b = STUDY_BOX) {
  return r.lat >= b.latMin && r.lat <= b.latMax && r.lon >= b.lonMin && r.lon <= b.lonMax;
}

// SPC "HHMM" in UTC (reports after midnight UTC belong to the next calendar day, irrelevant here) -> "10:04 PM" CDT.
export function spcLocalTime(hhmm, offsetHours = -5) {
  const s = String(hhmm).padStart(4, '0');
  const h = ((parseInt(s.slice(0, 2), 10) + offsetHours) % 24 + 24) % 24;
  return `${h % 12 || 12}:${s.slice(2)} ${h >= 12 ? 'PM' : 'AM'}`;
}

// "1320  CALIFORNIA PKWY N" -> "1300 block of California Pkwy N". Never exposes the exact house number.
export const blockOf = blockFrom;
export const streetOf = (address) => blockFrom(address).replace(/^\d+ block of /, '').replace(/\b(Nw|Ne|Sw|Se)\b/g, (m) => m.toUpperCase());

export const round3 = (x) => Number(Number(x).toFixed(3));
export const blockKey = (lat, lon) => `${round3(lat)},${round3(lon)}`;

export function median(a) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Folds one home into a cell map. cells: Map<key, {lat,lon,mmMax,mmCell,n,years[],streets:Map}>
export function addHome(cells, home) {
  const k = blockKey(home.lat, home.lon);
  let c = cells.get(k);
  if (!c) {
    c = { lat: round3(home.lat), lon: round3(home.lon), mmMax: 0, mmCell: -1, mmSum: 0, n: 0, years: [], streets: new Map() };
    cells.set(k, c);
  }
  c.n++;
  c.mmSum += home.mm;
  if (home.mm > c.mmMax) { c.mmMax = home.mm; c.mmCell = home.cell ?? -1; }
  if (home.year > 0) c.years.push(home.year);
  const st = streetOf(home.address);
  c.streets.set(st, (c.streets.get(st) || 0) + 1);
  return c;
}

export const topKey = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];

// Expands a blocks.json row into readable form. Rows store lat/lon as integer steps from blocks.origin.
// Fields: latK, lonK, homes, meshMm, yearMed, yearMed-yearMin, yearMax-yearMed, homesBuiltBefore2006, streetIdx, [gridIdx].
// Year built is not roof age (roofs get replaced); it is only labelled as year built.
export function decodeRow(row, blocks) {
  const [latK, lonK, homes, mm, yMed, dLo, dHi, old, si, gi] = row;
  const y0 = yMed ? yMed - dLo : 0, y1 = yMed ? yMed + dHi : 0;
  const o = blocks.origin;
  const street = blocks.streets[si] || 'Unknown street';
  return {
    lat: round3(o.lat + latK * o.step), lon: round3(o.lon + lonK * o.step), homes, mm, inches: Number(mmToIn(mm).toFixed(2)), tier: tierOfMm(mm),
    yearMin: y0, yearMed: yMed, yearMax: y1, builtBefore2006: old,
    street, label: street === 'Unknown street' ? 'Unnamed street area' : `${street} area`, gridIdx: gi ?? null,
  };
}

// Highest hail first, then oldest median year built first, then more homes.
export function rankBlocks(rows) {
  return [...rows].sort((a, b) => b[3] - a[3] || (a[4] || 9999) - (b[4] || 9999) || b[2] - a[2]);
}
