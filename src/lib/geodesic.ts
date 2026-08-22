/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GEODESIC GEOMETRY
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal, dependency-free 3D primitives for the Digital Core.
 *
 * Everything here is pure and allocation-free at render time: meshes are built
 * once at module scope, then the render loop only reads them. This is what keeps
 * the hero visual at ~1-2% CPU instead of pulling in a WebGL runtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Triangle as three indices into a `Mesh.vertices` array. */
export type Face = readonly [number, number, number];

/** Undirected edge as two indices into a `Mesh.vertices` array. */
export type Edge = readonly [number, number];

export interface Mesh {
  vertices: Vec3[];
  faces: Face[];
  edges: Edge[];
}

/* ── Vector helpers ────────────────────────────────────────────────────────── */

function normalise(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/** Unit normal of a triangle, via the cross product of two of its edges. */
export function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const uz = b.z - a.z;
  const vx = c.x - a.x;
  const vy = c.y - a.y;
  const vz = c.z - a.z;
  return normalise({
    x: uy * vz - uz * vy,
    y: uz * vx - ux * vz,
    z: ux * vy - uy * vx,
  });
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Rotates a point around X then Y. Two axes is enough — a third would add
 * tumbling that reads as noise at these speeds.
 */
export function rotate(v: Vec3, rx: number, ry: number): Vec3 {
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = v.y * cosX - v.z * sinX;
  const z1 = v.y * sinX + v.z * cosX;

  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x2 = v.x * cosY + z1 * sinY;
  const z2 = -v.x * sinY + z1 * cosY;

  return { x: x2, y: y1, z: z2 };
}

/* ── Mesh construction ─────────────────────────────────────────────────────── */

/** Regular icosahedron with all vertices on the unit sphere. */
export function icosahedron(): Mesh {
  const t = (1 + Math.sqrt(5)) / 2;

  const raw: Array<[number, number, number]> = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];

  const vertices = raw.map(([x, y, z]) => normalise({ x, y, z }));

  // Wound counter-clockwise when viewed from outside, so normals point outward.
  const faces: Face[] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  return { vertices, faces, edges: deriveEdges(faces) };
}

/** Collects every unique undirected edge from a face list. */
function deriveEdges(faces: readonly Face[]): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];

  for (const [a, b, c] of faces) {
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = p < q ? `${p}_${q}` : `${q}_${p}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([p, q]);
    }
  }

  return edges;
}

/**
 * One round of Loop-style subdivision projected back onto the unit sphere:
 * each triangle becomes four, and every new vertex is pushed out to radius 1.
 * Midpoints are cached per edge so shared vertices are never duplicated.
 */
export function subdivide(mesh: Mesh): Mesh {
  const vertices = [...mesh.vertices];
  const midpointCache = new Map<string, number>();

  const midpoint = (i: number, j: number): number => {
    const key = i < j ? `${i}_${j}` : `${j}_${i}`;
    const cached = midpointCache.get(key);
    if (cached !== undefined) return cached;

    const a = vertices[i];
    const b = vertices[j];
    if (!a || !b) throw new Error(`subdivide: missing vertex ${i}/${j}`);

    vertices.push(
      normalise({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
      }),
    );

    const index = vertices.length - 1;
    midpointCache.set(key, index);
    return index;
  };

  const faces: Face[] = [];
  for (const [a, b, c] of mesh.faces) {
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    faces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }

  return { vertices, faces, edges: deriveEdges(faces) };
}

/**
 * Builds a geodesic sphere.
 *
 *   0 → 12 vertices,  30 edges
 *   1 → 42 vertices, 120 edges   (used on compact viewports)
 *   2 → 162 vertices, 480 edges  (used on desktop)
 */
export function buildGeodesic(subdivisions: number): Mesh {
  let mesh = icosahedron();
  for (let i = 0; i < subdivisions; i += 1) mesh = subdivide(mesh);
  return mesh;
}
