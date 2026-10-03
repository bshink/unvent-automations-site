// Builds permits.json for the Pool permit alert demo. Run: node demos/pool-permits/build-snapshot.mjs
//
// Checks run 2026-10-03 (results recorded verbatim):
//
// 1. Socrata CORS
//    curl -sI -H 'Origin: https://unventautomations.com' "https://data.lacity.org/resource/pi9x-tg5x.json?$limit=1"
//    -> HTTP/1.1 200 OK
//    -> Access-Control-Allow-Origin: *
//
// 2. OpenFreeMap style CORS
//    curl -sI https://tiles.openfreemap.org/styles/positron
//    -> HTTP/2 200
//    -> access-control-allow-origin: *
//
// 3. OpenFreeMap terms (fetched https://openfreemap.org and https://openfreemap.org/tos/)
//    Home page: "OpenFreeMap lets you display custom maps on your website and apps for free."
//    Home page: "...completely free: there are no limits on the number of map views or requests.
//                There's no registration, no user database, no API keys, and no cookies."
//    Home page FAQ "Is commercial usage allowed?" -> "Yes."
//    Home page: "Attribution is required. If you are using MapLibre, they are automatically added."
//    https://openfreemap.org/tos/ : no commercial-use or rate-limit line found; only a
//    "Limitation of Liability" section. No uptime guarantee is stated anywhere I found.
//
// Filter tuning notes are in the build report, not here.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SOQL_URL, SINCE, WILDFIRE_APN_URL, isNewPool, anonymize, excludeParcels, latestRefresh } from './anonymize.mjs';

const [res, apnRes] = await Promise.all([fetch(SOQL_URL), fetch(WILDFIRE_APN_URL)]);
if (!res.ok) throw new Error(`Socrata ${res.status}`);
if (!apnRes.ok) throw new Error(`Socrata wildfire parcels ${apnRes.status}`);
const rawAll = await res.json();
const apnSet = new Set((await apnRes.json()).map((r) => String(r.apn)));
const raw = excludeParcels(rawAll, apnSet);
const refreshed = latestRefresh(rawAll);

const seen = new Set();
const rows = raw
  .filter(isNewPool)
  .map(anonymize)
  .filter((r) => r.id && !seen.has(r.id) && seen.add(r.id))
  .sort((a, b) => (a.issue_date < b.issue_date ? 1 : a.issue_date > b.issue_date ? -1 : 0));

const out = {
  generated: new Date().toISOString().slice(0, 10),
  source: 'City of Los Angeles permit records',
  since: SINCE,
  refreshed,
  rows,
};
writeFileSync(fileURLToPath(new URL('./permits.json', import.meta.url)), JSON.stringify(out, null, 2) + '\n');

console.log(`Fetched ${rawAll.length} pool/spa permits, ${apnSet.size} wildfire parcels, ${rawAll.length - raw.length} dropped by parcel, refreshed ${refreshed}, kept ${rows.length} new-pool rows`);
const by = {};
for (const r of rows) (by[r.cnc] ||= []).push(r);
const top = Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 15);
console.log('\ncount  cnc');
for (const [k, v] of top) console.log(String(v.length).padStart(5), ' ', k);
console.log('\nBounding boxes (top 3)');
for (const [k, v] of top.slice(0, 3)) {
  const la = v.map((r) => r.lat), lo = v.map((r) => r.lon);
  console.log(`${k}: lat ${Math.min(...la)}..${Math.max(...la)}, lon ${Math.min(...lo)}..${Math.max(...lo)}`);
}
