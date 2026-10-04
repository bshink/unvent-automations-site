#!/usr/bin/env python3
"""Decode MRMS MESH GRIB2 files for the Apr 25-26 2026 west Fort Worth hail storm.

Run (the venv with eccodes is NOT committed):
  S=/private/tmp/claude-501/-Users-brandonshin-Desktop-AI-Shit/175529d9-9200-4d16-9101-61814c3aa130/scratchpad/hail
  $S/venv/bin/python demos/hail-leads/mesh-decode.py

Inputs (in $S, never committed):
  data/mesh_0426_12z.grib2     MESH_Max_1440min, valid 12Z Apr 26 (daily max)
  mesh2min/HHMM00.grib2        2-minute MESH, 03:00Z-06:30Z Apr 26 (106 files)
Output: $S/data/mesh.json
  daily: {lat0, lon0, dLat, dLon, rows, cols, mm[]}  integer mm, 0.01 deg, row 0 = north edge
  frames: [{t:'10:00 PM', cells:[[r,c,mm],...]}]     10-minute cumulative max, cells >= 19 mm only
"""
import json, os, glob
import numpy as np
import eccodes as ec

S = os.environ.get('HAIL_S', '/private/tmp/claude-501/-Users-brandonshin-Desktop-AI-Shit/175529d9-9200-4d16-9101-61814c3aa130/scratchpad/hail')
LAT_N, LAT_S, LON_W, LON_E = 32.95, 32.62, -97.56, -97.10
MIN_MM = 19


def read(path):
    with open(path, 'rb') as f:
        g = ec.codes_grib_new_from_file(f)
        ni, nj = ec.codes_get(g, 'Ni'), ec.codes_get(g, 'Nj')
        lat1 = ec.codes_get(g, 'latitudeOfFirstGridPointInDegrees')
        lon1 = ec.codes_get(g, 'longitudeOfFirstGridPointInDegrees')
        v = ec.codes_get_values(g).reshape(nj, ni)
        ec.codes_release(g)
    return v, lat1, lon1 - 360.0  # row 0 = north, 0.01 deg


def window(v, lat1, lon1):
    r0 = int(round((lat1 - LAT_N) / 0.01))
    r1 = int(round((lat1 - LAT_S) / 0.01))
    c0 = int(round((LON_W - lon1) / 0.01))
    c1 = int(round((LON_E - lon1) / 0.01))
    w = v[r0:r1, c0:c1]
    w = np.where(w < 0, 0, w)          # -3 = no data / below threshold
    w = np.where(w > 500, 0, w)        # 9999 missing
    return np.rint(w).astype(int), lat1 - r0 * 0.01 - 0.005 + 0.005, lon1 + c0 * 0.01


v, lat1, lon1 = read(f'{S}/data/mesh_0426_12z.grib2')
dm, lat0, lon0 = window(v, lat1, lon1)
rows, cols = dm.shape
out = {'daily': {'lat0': round(lat0, 3), 'lon0': round(lon0, 3), 'dLat': -0.01, 'dLon': 0.01,
                 'rows': rows, 'cols': cols, 'mm': dm.flatten().tolist()}, 'frames': []}

files = sorted(glob.glob(f'{S}/mesh2min/*.grib2'))
cum = np.zeros_like(dm)
labels = {}
for fp in files:
    hhmm = os.path.basename(fp)[:4]
    h, m = int(hhmm[:2]), int(hhmm[2:])
    v2, a, b = read(fp)
    w, _, _ = window(v2, a, b)
    cum = np.maximum(cum, w)
    if m % 10 == 0:
        lh = (h - 5) % 24            # CDT = UTC-5
        ap = 'PM' if lh >= 12 else 'AM'
        t = f'{(lh % 12) or 12}:{m:02d} {ap}'
        rr, cc = np.where(cum >= MIN_MM)
        out['frames'].append({'t': t, 'cells': [[int(r), int(c), int(cum[r, c])] for r, c in zip(rr, cc)]})

with open(f'{S}/data/mesh.json', 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print('grid', rows, 'x', cols, 'lat0', out['daily']['lat0'], 'lon0', out['daily']['lon0'])
print('daily max mm', int(dm.max()), 'cells>=19:', int((dm >= MIN_MM).sum()))
print('frames', len(out['frames']), 'final frame max', int(cum.max()), 'cells>=19:', int((cum >= MIN_MM).sum()))
print('frames cells', [len(fr['cells']) for fr in out['frames']])
