// Data layer for the Job-site lunch finder demo. Zero deps, works in Node 18+ and the browser.
// Sources: City of Los Angeles building permits and LA Building and Safety inspections (public open data).
import { blockFrom, cleanCnc } from '../pool-permits/anonymize.mjs';

export { blockFrom, cleanCnc };

const PERMITS = 'https://data.lacity.org/resource/pi9x-tg5x.json';
const INSPECTIONS = 'https://data.lacity.org/resource/9w5z-rg2h.json';
export const SINCE = '2024-01-01';
export const ACTIVE_DAYS = 60;
export const SKIP_RESULTS = ['Insp Cancelled', 'Cancelled', 'No Access for Inspection'];

const qs = (o) => new URLSearchParams(o).toString().replace(/\+/g, '%20');

export const PERMITS_URL = `${PERMITS}?${qs({
  $select: 'permit_nbr,apn,valuation,square_footage,cnc,cpa,issue_date,permit_type,permit_sub_type,use_desc,lat,lon,primary_address,zip_code,work_desc,status_desc',
  $where: `issue_date>='${SINCE}' AND valuation::number>=3000000 AND permit_group='Building' AND permit_sub_type!='1 or 2 Family Dwelling' AND (permit_type='Bldg-New' OR permit_type='Bldg-Addition' OR permit_type='Bldg-Alter/Repair') AND status_desc='Issued' AND NOT upper(work_desc) like '%WILDFIRE%' AND zip_code!='90272'`,
  $limit: '5000',
})}`;

export const INSPECTIONS_MAX_URL = `${INSPECTIONS}?${qs({ $select: 'max(inspection_date) as mx' })}`;

const toSpaces = (n) => String(n).replace(/-/g, ' ');

// keys: permit numbers (hyphenated or spaced). since: YYYY-MM-DD cutoff. Batch ~80 keys per call.
export function inspectionsUrl(keys, since) {
  const list = keys.map((k) => `'${toSpaces(k)}'`).join(',');
  return `${INSPECTIONS}?${qs({
    $select: 'permit,inspection_date,inspection,inspection_result',
    $where: `permit in(${list})${since ? ` AND inspection_date>='${since}'` : ''}`,
    $limit: '20000',
  })}`;
}

// Defensive client-side re-check of the server-side filter.
export function isCandidate(row) {
  const type = row.permit_type;
  if (!['Bldg-New', 'Bldg-Addition', 'Bldg-Alter/Repair'].includes(type)) return false;
  if (row.permit_group && row.permit_group !== 'Building') return false;
  if (row.permit_sub_type === '1 or 2 Family Dwelling') return false;
  if (row.status_desc !== 'Issued') return false;
  if (String(row.issue_date || '').slice(0, 10) < SINCE) return false;
  if (!(Number(row.valuation) >= 3000000)) return false;
  if (String(row.zip_code) === '90272') return false;
  if (String(row.work_desc || '').toUpperCase().includes('WILDFIRE')) return false;
  return Number.isFinite(parseFloat(row.lat)) && Number.isFinite(parseFloat(row.lon));
}

export function stageOf(type) {
  const t = String(type || '').toLowerCase();
  if (/grading|excavat|footing|shotcrete|reinf\.? concrete|reinforced concrete|piling|pier|caisson/.test(t)) return 'foundation and concrete';
  if (/steel|welding|light gage|wood frame|shear wall|masonry/.test(t)) return 'structure and framing';
  if (/drywall|insulation|t-bar|rough/.test(t)) return 'interior';
  if (/final|tco|cofo/.test(t)) return 'finishing up';
  return 'in progress';
}

// Large commercial addresses end in unit ranges ("1-362", "#1-28", "Lvl 5-12"); drop them before block-leveling.
const stripUnits = (a) => String(a || '').replace(/\s+(?:#|Lvl\s+)?\d+-\d+$/i, '');
// Floor, level and suite tokens that survive block-leveling ("S Flower St 50th Floor", "S Grand Ave Lvls 14&21", "W Pico Blvd 209").
const SUFFIX = /^(.*?\b(?:St|Ave|Blvd|Dr|Way|Pl|Rd|Ln|Ct|Pkwy|Ter|Hwy|Cir|Sq|Walk|Trl|Broadway)\b).*$/;
const tidyBlock = (b) => String(b || '').replace(/\s+(?:Fl|Floor|Ste|Suite|Unit|Lvls?)\b.*$/i, '').replace(SUFFIX, '$1');
// Airside or secured locations a catering truck cannot serve. World Way is the LAX terminal loop.
export const EXCLUDE_BLOCK = /\bWorld Way\b/i;
const r3 = (x) => Number(parseFloat(x).toFixed(3));
const day = (s) => String(s || '').slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const cutoffFor = (asOf) => addDays(asOf, -ACTIVE_DAYS);
// First day of the latest week on file (asOf and the six days before it).
export const weekStartFor = (asOf) => addDays(asOf, -6);

// Groups candidate permits by parcel into sites; keeps only sites with a qualifying inspection in the last 60 days
// relative to asOf (newest inspection date in the data). Output has no raw address, APN, description or names.
export function groupSites(permits, inspections, asOf) {
  const cut = cutoffFor(asOf);
  const byPermit = {};
  for (const h of inspections) {
    if (SKIP_RESULTS.includes(h.inspection_result)) continue;
    const d = day(h.inspection_date);
    if (d < cut || d > asOf) continue;
    (byPermit[String(h.permit).replace(/ /g, '-')] ||= []).push({ d, type: h.inspection });
  }
  const groups = new Map();
  for (const p of permits) {
    if (!isCandidate(p)) continue;
    const k = p.apn || p.permit_nbr;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const sites = [];
  for (const ps of groups.values()) {
    const insp = ps.flatMap((p) => byPermit[p.permit_nbr] || []);
    if (!insp.length) continue;
    insp.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    const last = insp[insp.length - 1];
    const first = ps[0];
    const sf = Math.max(0, ...ps.map((p) => Number(p.square_footage) || 0));
    const site = {
      id: first.permit_nbr,
      block: tidyBlock(blockFrom(stripUnits(first.primary_address))),
      area: cleanCnc(first.cnc || first.cpa),
      lat: r3(first.lat),
      lon: r3(first.lon),
      permits: ps.length,
      valuation: ps.reduce((s, p) => s + (Number(p.valuation) || 0), 0),
    };
    if (EXCLUDE_BLOCK.test(site.block)) continue;
    if (sf) site.sqft = sf;
    site.subType = first.permit_sub_type;
    site.issued = ps.map((p) => day(p.issue_date)).sort()[0];
    site.insp60 = insp.length;
    const wk = weekStartFor(asOf);
    site.insp7 = insp.filter((h) => h.d >= wk).length;
    site.lastInsp = last.d;
    site.lastInspType = last.type;
    site.stage = stageOf(last.type);
    sites.push(site);
  }
  return sites.sort((a, b) => b.insp60 - a.insp60 || (a.id < b.id ? -1 : 1));
}

export const anonymize = groupSites;
