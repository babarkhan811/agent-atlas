// Detect beaconing from connection timestamps (TypeScript version of lab.py).
//
// Groups connections by (source host, destination), measures the gaps between
// them, and flags pairs whose gaps are very regular, using the coefficient of
// variation (standard deviation / mean) so jittered beacons are still caught.
// Results are candidates for an analyst, not verdicts. Run with: node lab.ts

export type Connection = [src: string, dest: string, ts: number];
export type Beacon = { src: string; dest: string; count: number; meanInterval: number; cv: number };

export function detectBeacons(connections: Iterable<Connection>, minCount = 20, maxCv = 0.15, allowlist: Set<string> = new Set()): Beacon[] {
  const byPair = new Map<string, number[]>();
  for (const [src, dest, ts] of connections) {
    const key = `${src}|${dest}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(ts);
  }
  const found: Beacon[] = [];
  for (const [key, times] of byPair) {
    if (allowlist.has(key) || times.length < minCount) continue;
    times.sort((a, b) => a - b);
    const gaps = times.slice(1).map((t, i) => t - times[i]!).filter((g) => g > 0);
    if (gaps.length < minCount - 1) continue;
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((s, g) => s + (g - avg) ** 2, 0) / gaps.length);
    const cv = sd / avg;
    if (cv <= maxCv) {
      const [src, dest] = key.split("|") as [string, string];
      found.push({ src, dest, count: times.length, meanInterval: Math.round(avg * 10) / 10, cv: Math.round(cv * 1000) / 1000 });
    }
  }
  return found.sort((a, b) => a.cv - b.cv);
}

/** Small seeded random generator so examples and tests are repeatable. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

if (import.meta.main) {
  const rnd = seeded(7);
  const conns: Connection[] = [];
  for (let i = 0; i < 200; i++) conns.push(["DEV-SRV-03", "198.51.100.23", i * 60 + (rnd() * 8 - 4)]); // jittered beacon
  let t = 0;
  for (let i = 0; i < 200; i++) { t += -Math.log(1 - rnd()) * 90; conns.push(["HR-PC-07", "news.example", t]); } // browsing
  console.log(detectBeacons(conns));
}
