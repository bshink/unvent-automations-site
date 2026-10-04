// Builds storm.json and blocks.json for the Hail lead finder demo.
// Run: node demos/hail-leads/build-snapshot.mjs
// Needs (outside the repo, in $S): data/mesh.json (from mesh-decode.py), data/260425.csv (SPC),
// and tad/ cache (filled on first run from TAD, ~2 min). Raw downloads never go in the repo.
//   S=/private/tmp/claude-501/-Users-brandonshin-Desktop-AI-Shit/175529d9-9200-4d16-9101-61814c3aa130/scratchpad/hail
//
// Checks run 2026-10-03 (results recorded verbatim / summarized):
//
// 1. SPC CORS (so the page can fetch live reports)
//    curl -sI https://www.spc.noaa.gov/climo/reports/today_hail.csv
//    -> HTTP/2 200, content-type: text/csv, access-control-allow-origin: *
//
// 2. Iowa State MTArchive (MRMS MESH) availability
//    curl -sI https://mtarchive.geol.iastate.edu/2026/04/26/mrms/ncep/MESH_Max_1440min/MESH_Max_1440min_00.50_20260426-120000.grib2.gz
//    -> HTTP/1.1 200 OK (Apache/2.4.62). All 106 2-minute MESH files 03:00Z-06:30Z Apr 26 returned 200.
//    Not used live by the page (no CORS check made, GRIB2 needs a decoder): decoded offline into storm.json.
//
// 3. TAD (Tarrant Appraisal District) map service
//    GET https://tad.newedgeservices.com/arcgis/rest/services/InteractiveMap/TADMap/MapServer/0?f=json
//    -> ArcGIS 11.5 Feature Layer, polygon geometry, source SR 2276, maxRecordCount 2000, supports resultOffset paging.
//    returnCentroid=true is IGNORED by this server (response had no centroid), so polygons are requested at
//    geometryPrecision=5 and centroids are computed here.
//    Terms: TAD's layout PDF (tad_layout.pdf, downloaded from their site) says the data "may now be downloaded
//    from our Web site at no charge". Only these fields are requested: ActualYearBuilt, MarketValue, MainArea,
//    PropertyUseCode (in the filter), SitusAddress, MarketAreaDescription. No owner fields are ever requested or stored.
//    Filter: PropertyUseCode='A' (single-family).
//
// Privacy by design: output rows are 3-decimal cells (~110 m) with a street-level label; a block has no house numbers,
// no parcel IDs, no owner data.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSpcCsv, inStudyBox, spcLocalTime, addHome, topKey, median, mmToIn, tierOfMm, rankBlocks, decodeRow } from './hail.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const S = process.env.HAIL_S || '/private/tmp/claude-501/-Users-brandonshin-Desktop-AI-Shit/175529d9-9200-4d16-9101-61814c3aa130/scratchpad/hail';
const TAD = 'https://tad.newedgeservices.com/arcgis/rest/services/InteractiveMap/TADMap/MapServer/0/query';
const FIELDS = 'OBJECTID,ActualYearBuilt,MarketValue,MainArea,SitusAddress,MarketAreaDescription'; // cached pages carry these; only year built and street are kept
const MIN_MM = 19;
const TILE = 0.05;
// yearMin/yearMax are stored as offsets from the median year built (yearMed - yearMin, yearMax - yearMed) to save ~50 KB.
// Size budget: demos/hail-leads/*.json must stay under 1.2 MB. Blocks of fewer than 4 homes, and 4-home blocks under 1 in
// of hail, are dropped (about 10% of homes, mostly cell edges and 0.75 in fringe). lat/lon are stored as integer thousandths of a
// degree offset from ORIGIN to save ~270 KB.
const MIN_BLOCK_HOMES = 4;
const ORIGIN = { lat: 32.6, lon: -97.56 };
const t0 = Date.now();

const mesh = JSON.parse(readFileSync(`${S}/data/mesh.json`, 'utf8'));
const g = mesh.daily;
const meshAt = (lat, lon) => {
  const r = Math.floor((g.lat0 + 0.005 - lat) / 0.01);
  const c = Math.floor((lon - (g.lon0 - 0.005)) / 0.01);
  if (r < 0 || c < 0 || r >= g.rows || c >= g.cols) return 0;
  return g.mm[r * g.cols + c];
};

const cellOf = (lat, lon) => {
  const r = Math.floor((g.lat0 + 0.005 - lat) / 0.01), c = Math.floor((lon - (g.lon0 - 0.005)) / 0.01);
  return r * g.cols + c;
};

// ---- tiles that contain any footprint cell >= 19 mm
const tiles = new Map();
for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
  if (g.mm[r * g.cols + c] < MIN_MM) continue;
  const lat = g.lat0 - r * 0.01, lon = g.lon0 + c * 0.01;
  const ti = Math.floor(lat / TILE + 1e-9), tj = Math.floor(lon / TILE + 1e-9);
  tiles.set(`${ti},${tj}`, [ti, tj]);
}

// ---- TAD pull (sequential, cached)
mkdirSync(`${S}/tad`, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function page(ti, tj, offset) {
  const f = `${S}/tad/t_${ti}_${tj}_${offset}.json`;
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const env = [tj * TILE, ti * TILE, (tj + 1) * TILE, (ti + 1) * TILE].map((x) => x.toFixed(4)).join(',');
  const p = new URLSearchParams({
    where: "PropertyUseCode='A'", geometry: env, geometryType: 'esriGeometryEnvelope', inSR: '4326', outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects', outFields: FIELDS, returnGeometry: 'true', geometryPrecision: '5',
    orderByFields: 'OBJECTID', resultOffset: String(offset), resultRecordCount: '2000', f: 'json',
  });
  let j;
  for (let a = 0; a < 4; a++) {
    try {
      const res = await fetch(`${TAD}?${p}`);
      j = await res.json();
      if (j.features) break;
    } catch (e) { /* retry */ }
    await sleep(2000 * (a + 1));
  }
  if (!j || !j.features) throw new Error(`TAD failed tile ${ti},${tj} offset ${offset}: ${JSON.stringify(j).slice(0, 200)}`);
  writeFileSync(f, JSON.stringify(j));
  await sleep(300);
  return j;
}

function centroid(rings) {
  const ring = rings[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
    const k = x0 * y1 - x1 * y0;
    a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k;
  }
  if (Math.abs(a) < 1e-14) {
    const n = ring.length;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

const seen = new Set();
let fetched = 0, noGeom = 0, noYear = 0, outOfBox = 0;
const homes = [];
for (const [ti, tj] of tiles.values()) {
  for (let offset = 0; ; offset += 2000) {
    const j = await page(ti, tj, offset);
    for (const ft of j.features) {
      const id = ft.attributes.OBJECTID;
      if (seen.has(id)) continue;
      seen.add(id);
      fetched++;
      if (!ft.geometry || !ft.geometry.rings || !ft.geometry.rings.length) { noGeom++; continue; }
      const [lon, lat] = centroid(ft.geometry.rings);
      if (!(lat > 32.62 && lat < 32.95 && lon > -97.56 && lon < -97.1)) { outOfBox++; continue; }
      const mm = meshAt(lat, lon);
      if (mm < MIN_MM) continue;
      const a = ft.attributes;
      if (!(a.ActualYearBuilt > 0)) noYear++;
      homes.push({ lat, lon, mm, cell: cellOf(lat, lon), year: a.ActualYearBuilt || 0, address: a.SitusAddress || '' });
    }
    if (!j.exceededTransferLimit) break;
  }
}

// ---- aggregate to blocks
const cells = new Map();
for (const h of homes) addHome(cells, h);
const streets = [];
const OLD_BEFORE = 2006; // 'homes built before 2006' = 20+ years old in 2026. Year built is not roof age.
let gridOverride = 0;
const idx = (arr, v) => { let i = arr.indexOf(v); if (i < 0) { i = arr.length; arr.push(v); } return i; };
const rows = [];
let droppedSmall = 0, droppedHomes = 0;
for (const c of cells.values()) {
  if (c.mmMax < MIN_MM) continue;
  if (c.n < MIN_BLOCK_HOMES || (c.n === MIN_BLOCK_HOMES && c.mmMax < 25)) { droppedSmall++; droppedHomes += c.n; continue; }
  // Every block gets a street label: the most common street among its homes (ignoring unparseable addresses).
  const named = new Map([...c.streets].filter(([k]) => k && k !== 'Unknown street'));
  const st = named.size ? topKey(named)[0] : 'Unknown street';
  const ys = c.years;
  const row = [Math.round(c.lat * 1000) - ORIGIN.lat * 1000, Math.round(c.lon * 1000) - ORIGIN.lon * 1000, c.n, c.mmMax,
    ...(ys.length ? (() => { const md = Math.round(median(ys)); return [md, md - Math.min(...ys), Math.max(...ys) - md]; })() : [0, 0, 0]),
    ys.filter((y) => y < OLD_BEFORE).length, idx(streets, st)];
  // Radar cell that produced mmMax. The page replays frames from the block's own center cell; when the strongest home
  // sits in a neighbouring radar cell, store that cell index so the replay ends exactly at meshMm.
  if (cellOf(c.lat, c.lon) !== c.mmCell) { row.push(c.mmCell); gridOverride++; }
  rows.push(row);
}
rows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const blocks = {
  generated: '2026-10-03',
  origin: { lat: ORIGIN.lat, lon: ORIGIN.lon, step: 0.001 },
  fields: ['latK', 'lonK', 'homes', 'meshMm', 'yearMed', 'yearsBeforeMed', 'yearsAfterMed', 'homesBuiltBefore2006', 'streetIdx', 'gridIdx (optional)'],
  builtBefore: OLD_BEFORE,
  streets, rows,
};
writeFileSync(join(HERE, 'blocks.json'), JSON.stringify(blocks));

// ---- SPC
const spcAll = parseSpcCsv(readFileSync(`${S}/data/260425.csv`, 'utf8'));
const spcKept = spcAll.filter((r) => inStudyBox(r)).map((r) => [r.lat, r.lon, r.size, spcLocalTime(r.time), r.location]);
const spcTimed = spcAll.filter((r) => inStudyBox(r));
const storm = {
  meta: {
    date: '2026-04-25', startLocal: '10:00 PM', endLocal: '1:30 AM', tz: 'America/Chicago',
    area: 'Fort Worth and Tarrant County, TX',
    sources: {
      spc: 'NOAA Storm Prediction Center preliminary hail reports, 260425_rpts_hail.csv',
      mesh: 'NOAA MRMS MESH (Maximum Estimated Size of Hail), via Iowa State MTArchive; MESH_Max_1440min and 2-minute MESH_00.50',
      parcels: 'Tarrant Appraisal District public map service (single-family, year built)',
    },
    box: { latMin: 32.62, latMax: 32.95, lonMin: -97.56, lonMax: -97.1 },
  },
  spc: spcKept,
  mesh: { lat0: g.lat0, lon0: g.lon0, dLat: g.dLat, dLon: g.dLon, rows: g.rows, cols: g.cols, mm: g.mm },
  frames: mesh.frames,
};
writeFileSync(join(HERE, 'storm.json'), JSON.stringify(storm));

// ---- report
const hn = (inch) => homes.filter((h) => mmToIn(h.mm) >= inch - 1e-9).length;
const maxMm = homes.reduce((m, h) => Math.max(m, h.mm), 0);
console.log(`parcels fetched (unique single-family in tiles): ${fetched} (no geometry ${noGeom}, centroid outside box ${outOfBox})`);
console.log(`tiles queried: ${tiles.size}`);
console.log(`homes kept (MESH >= 19 mm): ${homes.length} (missing year built: ${noYear})`);
console.log(`blocks kept: ${rows.length} (dropped ${droppedSmall} blocks under ${MIN_BLOCK_HOMES} homes (or 4 homes under 1 in) = ${droppedHomes} homes); homes in kept blocks: ${rows.reduce((s, r) => s + r[2], 0)}`);
console.log(`homes >= 1 in: ${hn(1)}`);
console.log(`homes >= 1.5 in: ${hn(1.5)}`);
console.log(`homes >= 2 in: ${hn(2)}`);
console.log(`max MESH: ${maxMm} mm = ${mmToIn(maxMm).toFixed(2)} in`);
console.log(`SPC reports kept: ${spcKept.length} of ${spcAll.length} (box); times ${spcTimed.map((r) => r.time).sort()[0]}-${spcTimed.map((r) => r.time).sort().slice(-1)[0]} UTC`);
console.log(`streets: ${streets.length}, blocks labelled 'Unknown street': ${rows.filter((r) => streets[r[8]] === 'Unknown street').length}, grid overrides: ${gridOverride}`);
console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('--- 5 sample rows');
const samp = [0.1, 0.3, 0.5, 0.7, 0.9].map((q) => rows[Math.floor(rows.length * q)]);
for (const r of samp) console.log(JSON.stringify(r), '=>', JSON.stringify(decodeRow(r, blocks)));
console.log('--- top 10 (hail, then oldest)');
for (const r of rankBlocks(rows).slice(0, 10)) { const d = decodeRow(r, blocks); console.log(`${d.lat},${d.lon} ${d.inches} in (${d.mm} mm) homes=${d.homes} built ${d.yearMin}-${d.yearMax} med ${d.yearMed} pre2006=${d.builtBefore2006}  ${d.label}`); }
