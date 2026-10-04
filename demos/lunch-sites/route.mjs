// Sample fleet, depot, and Tuesday lunch run for the Job-site lunch finder demo. Zero deps, Node 18+ and the browser.
// Everything here is a sample: the fleet is fictional, the depot is a rounded point, and drive times are estimates.
// A judge can recompute the plan: import { planFleet } from './route.mjs' and pass the rows of sites.json.

export const FLEET = 'Figueroa Fleet Kitchens';
export const OWNER = 'Teo';
export const DEPOT = { lat: 34.02, lon: -118.258 };
export const RADIUS_MI = 3;
export const ROAD_FACTOR = 1.3; // straight-line miles x 1.3 to approximate street miles
export const MPH = 12; // city driving at midday
export const STOP_MIN = 20; // minutes parked at each stop
export const WINDOW = [10 * 60 + 45, 11 * 60 + 30]; // 10:45 to 11:30, minutes after midnight
export const CLOCK = [9 * 60 + 30, 12 * 60 + 30]; // 9:30 AM to 12:30 PM
export const SAME_SPOT_MI = 0.05; // parcels this close share one parking spot
export const MAX_PER_TRUCK = 3; // two stops is typical; a third only when it still lands inside the window

export function miles(a, b) {
  const R = 3958.8, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const driveMin = (mi) => (mi * ROAD_FACTOR) / MPH * 60;

export function nearDepot(sites) {
  return sites.filter((s) => miles(DEPOT, s) <= RADIUS_MI);
}

// Project size tier from the permit valuation (dollars). Not a headcount.
export const sizeTier = (v) => (v >= 150e6 ? 3 : v >= 50e6 ? 2 : v >= 10e6 ? 1 : 0);

// Crew-activity score, from city records only (no headcounts are invented):
//   score = 2 x insp7  +  insp60 / 5  +  4 x sizeTier
//   insp7    = non-cancelled city inspections in the latest 7 days on file (inspectionsThrough and the 6 days before)
//   insp60   = non-cancelled city inspections in the 60 days on file
//   sizeTier = 0 under $10M, 1 from $10M, 2 from $50M, 3 from $150M of permit valuation
// An inspection this week is the strongest sign a crew is on site now, so it carries the most weight.
// A stop that serves several parcels scores the sum of its parcels.
export const scoreSite = (s) => 2 * (s.insp7 || 0) + (s.insp60 || 0) / 5 + 4 * sizeTier(s.valuation || 0);

// A site is busy this week when it logged at least one inspection in the latest 7 days on file.
export const isBusy = (s) => (s.insp7 || 0) > 0;

// Trucks in the sample fleet, sized to the busy stops: 2 for 4 or fewer, 4 for 12 or more, otherwise 3.
export const trucksFor = (busyStops) => (busyStops <= 4 ? 2 : busyStops >= 12 ? 4 : 3);

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Near-depot sites, merged into parking stops. Highest score first; parcels within SAME_SPOT_MI of a head share its stop.
export function groupStops(sites) {
  const left = nearDepot(sites).slice().sort((a, b) => scoreSite(b) - scoreSite(a) || byId(a, b));
  const stops = [];
  while (left.length) {
    const head = left[0];
    const group = left.filter((s) => miles(head, s) <= SAME_SPOT_MI);
    group.forEach((s) => left.splice(left.indexOf(s), 1));
    stops.push({
      sites: group, lat: head.lat, lon: head.lon,
      score: group.reduce((t, s) => t + scoreSite(s), 0),
      busy: group.some(isBusy),
    });
  }
  return stops.sort((a, b) => b.score - a.score || byId(a.sites[0], b.sites[0]));
}

// Times for one truck visiting stops in order: first stop at WINDOW[0], then drive + STOP_MIN between stops.
function timeTruck(order) {
  const depart = WINDOW[0] - driveMin(miles(DEPOT, order[0]));
  let clock = null, at = DEPOT, total = 0;
  const legs = order.map((s) => {
    const legMi = miles(at, s), dm = driveMin(legMi);
    total += dm;
    const arrive = clock === null ? WINDOW[0] : clock + dm;
    clock = arrive + STOP_MIN;
    at = s;
    return { stop: s, legMi, driveMin: dm, arrive, leave: arrive + STOP_MIN };
  });
  return { depart, legs, total, fits: legs.every((l) => l.arrive >= WINDOW[0] && l.arrive <= WINDOW[1]) };
}
function perms(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map((p) => [x].concat(p)));
}
// Visiting order for a set of stops: busiest stop first (crews there are the surest sale at 10:45) when every arrival
// still lands inside the window; otherwise the fitting order with the least driving. Null if no order fits.
function bestOrder(set) {
  const busiestFirst = timeTruck(set.slice().sort((a, b) => b.score - a.score));
  if (busiestFirst.fits) return busiestFirst;
  let best = null;
  for (const p of perms(set)) {
    const t = timeTruck(p);
    if (t.fits && (!best || t.total < best.total)) best = t;
  }
  return best;
}

// The Tuesday lunch run.
// 1. Merge near-depot parcels into stops; keep the busy ones (an inspection in the latest week), highest score first.
// 2. Size the fleet with trucksFor and take the top 2 busy stops per truck as the pool.
// 3. Each truck takes the highest-scoring stop left in the pool, then the nearest pool stop it can still reach inside the window.
// 4. A truck takes a third busy stop only if every arrival still lands inside the window.
// 5. Each truck leaves the depot so its first stop is at 10:45. Busy stops left over are counted for tomorrow or another truck.
export function planFleet(sites) {
  const stops = groupStops(sites);
  const busy = stops.filter((s) => s.busy);
  const nTrucks = trucksFor(busy.length);
  const pool = busy.slice(0, nTrucks * 2);
  const used = new Set();
  const trucks = [];
  for (let t = 0; t < nTrucks; t++) {
    const head = pool.find((s) => !used.has(s));
    if (!head) break;
    used.add(head);
    const set = [head];
    const partners = pool.filter((s) => !used.has(s)).sort((a, b) => miles(head, a) - miles(head, b));
    for (const p of partners) {
      if (bestOrder([head, p])) { set.push(p); used.add(p); break; }
    }
    if (set.length === 2) {
      for (const x of busy) {
        if (used.has(x) || set.length >= MAX_PER_TRUCK) continue;
        if (bestOrder(set.concat([x]))) { set.push(x); used.add(x); break; }
      }
    }
    const o = bestOrder(set);
    trucks.push({ n: t + 1, name: 'Truck ' + (t + 1), depart: o.depart, stops: o.legs.map((l, i) => ({
      label: (t + 1) + String.fromCharCode(65 + i), truck: t + 1, sites: l.stop.sites, lat: l.stop.lat, lon: l.stop.lon,
      score: l.stop.score, legMi: l.legMi, driveMin: l.driveMin, arrive: l.arrive, leave: l.leave,
    })) });
  }
  const leftover = busy.filter((s) => !used.has(s));
  const plan = {
    trucks,
    stops: trucks.flatMap((t) => t.stops),
    busyStops: busy.length,
    uncoveredStops: leftover.length,
    uncoveredSites: leftover.reduce((n, s) => n + s.sites.length, 0),
  };
  plan.problems = checkPlan(plan);
  return plan;
}

// Every planned stop must arrive inside the lunch window, and each truck's first stop is at 10:45.
// Returns a list of problems; empty means the plan is good. The page shows 'ERROR route' in QC when it is not empty.
export function checkPlan(plan) {
  const out = [];
  if (!plan.trucks.length) out.push('no trucks planned');
  for (const t of plan.trucks) {
    if (!t.stops.length || Math.abs(t.stops[0].arrive - WINDOW[0]) > 1e-9) out.push(t.name + ' first stop is not at 10:45');
    for (const s of t.stops) {
      if (!(s.arrive >= WINDOW[0] && s.arrive <= WINDOW[1])) out.push('stop ' + s.label + ' arrives ' + fmtClock(s.arrive) + ', outside the window');
    }
  }
  return out;
}

export function fmtClock(min) {
  const m = Math.round(min), h = Math.floor(m / 60), mm = m % 60;
  return ((h + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
}
