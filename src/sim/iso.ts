// Isometric projection: x runs right-down, y runs left-down, z is up.
export const C30 = Math.cos(Math.PI / 6);

export type P3 = readonly [number, number, number?];

const r1 = (n: number) => Math.round(n * 10) / 10;

export function project([x, y, z = 0]: P3): [number, number] {
  return [r1((x - y) * C30), r1((x + y) * 0.5 - z)];
}

export const points = (ps: readonly P3[]) => ps.map((p) => project(p).join(",")).join(" ");

/** The three visible faces of an axis-aligned box: right (+x), left (+y), top. */
export function boxFaces(x: number, y: number, z: number, w: number, d: number, h: number) {
  return {
    right: points([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]),
    left: points([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]),
    top: points([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]),
  };
}
