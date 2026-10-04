// Builds sites.json for the Job-site lunch finder demo. Run: node demos/lunch-sites/build-snapshot.mjs
//
// Checks run 2026-10-03 (results recorded verbatim):
//
// 1. Socrata CORS, permits
//    curl -sI -H 'Origin: https://example.com' 'https://data.lacity.org/resource/pi9x-tg5x.json?$limit=1'
//    -> Access-Control-Allow-Origin: *
// 2. Socrata CORS, inspections
//    curl -sI -H 'Origin: https://example.com' 'https://data.lacity.org/resource/9w5z-rg2h.json?$limit=1'
//    -> Access-Control-Allow-Origin: *
// 3. Newest dates
//    curl -s 'https://data.lacity.org/resource/9w5z-rg2h.json?$select=max(inspection_date) as mx' -> 2026-09-26
//    curl -s 'https://data.lacity.org/resource/pi9x-tg5x.json?$select=max(issue_date) as mx'      -> 2026-09-26
//
// Active = a non-cancelled inspection in the 60 days before the newest inspection date (not today).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERMITS_URL, INSPECTIONS_MAX_URL, inspectionsUrl, isCandidate, groupSites, cutoffFor } from './sites.mjs';

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Socrata ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const asOf = String((await get(INSPECTIONS_MAX_URL))[0].mx).slice(0, 10);
const cut = cutoffFor(asOf);
const permits = (await get(PERMITS_URL)).filter(isCandidate);
const keys = permits.map((p) => p.permit_nbr);
let inspections = [];
for (let i = 0; i < keys.length; i += 80) inspections = inspections.concat(await get(inspectionsUrl(keys.slice(i, i + 80), cut)));

const rows = groupSites(permits, inspections, asOf);
const out = {
  generated: new Date().toLocaleDateString('en-CA'), // local date. After a rebuild, update the hub desc numbers in demos/index.html from the Top 10 printout.
  inspectionsThrough: asOf,
  source: 'City of Los Angeles building permits and inspections',
  rows,
};
writeFileSync(fileURLToPath(new URL('./sites.json', import.meta.url)), JSON.stringify(out) + '\n');

console.log(`Permits: ${permits.length} | inspection rows: ${inspections.length} | inspectionsThrough ${asOf} (cutoff ${cut}) | active sites: ${rows.length}`);
const count = (f) => rows.reduce((o, r) => ((o[f(r)] = (o[f(r)] || 0) + 1), o), {});
console.log('By year issued:', count((r) => r.issued.slice(0, 4)));
console.log('By stage:', count((r) => r.stage));
console.log('Top 10 by insp60:');
for (const r of rows.slice(0, 10)) console.log(String(r.insp60).padStart(4), r.block, '|', r.area);
