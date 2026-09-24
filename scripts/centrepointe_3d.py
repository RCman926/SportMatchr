"""
Build a 3D model of Centrepointe Park from City of Ottawa inventory.

Writes assets/models/centrepointe-park.gltf (open in Blender: File > Import > glTF).

If Blender is on PATH:
  blender --background --python scripts/centrepointe_blender.py
"""
from __future__ import annotations

import json
import math
import struct
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "models"
BASE = "https://maps.ottawa.ca/arcgis/rest/services/Parks_Inventory/MapServer"

# glTF is Y-up. Local park: X east, Z north, Y up (metres).
ORIGIN_LAT = 45.34209094
ORIGIN_LNG = -75.76794707


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "SportMatchrPinSnap/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def query(layer: int, where: str, fields: str) -> list:
    params = urllib.parse.urlencode(
        {
            "where": where,
            "outFields": fields,
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "json",
            "resultRecordCount": "40",
        }
    )
    data = get(f"{BASE}/{layer}/query?{params}")
    if data.get("error"):
        raise RuntimeError(data["error"])
    return data.get("features") or []


def to_local(lat: float, lng: float) -> tuple[float, float]:
    x = (lng - ORIGIN_LNG) * 111320.0 * math.cos(math.radians(ORIGIN_LAT))
    z = (lat - ORIGIN_LAT) * 110540.0
    return x, z


def ear_clip(pts: list[tuple[float, float]]) -> list[int]:
    """Return triangle indices for a simple 2D polygon (no holes)."""
    n = len(pts)
    if n < 3:
        return []
    idx = list(range(n))

    def area(i, j, k):
        (ax, az), (bx, bz), (cx, cz) = pts[i], pts[j], pts[k]
        return (bx - ax) * (cz - az) - (bz - az) * (cx - ax)

    signed = sum(
        (pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1]) for i in range(n)
    )
    if signed < 0:
        idx.reverse()

    def inside(a, b, c, p):
        (ax, az), (bx, bz), (cx, cz), (px, pz) = pts[a], pts[b], pts[c], pts[p]
        v0x, v0z = cx - ax, cz - az
        v1x, v1z = bx - ax, bz - az
        v2x, v2z = px - ax, pz - az
        dot00 = v0x * v0x + v0z * v0z
        dot01 = v0x * v1x + v0z * v1z
        dot02 = v0x * v2x + v0z * v2z
        dot11 = v1x * v1x + v1z * v1z
        dot12 = v1x * v2x + v1z * v2z
        inv = 1.0 / (dot00 * dot11 - dot01 * dot01 + 1e-12)
        u = (dot11 * dot02 - dot01 * dot12) * inv
        v = (dot00 * dot12 - dot01 * dot02) * inv
        return u >= -1e-6 and v >= -1e-6 and u + v <= 1 + 1e-6

    tris: list[int] = []
    guard = 0
    while len(idx) > 3 and guard < 5000:
        guard += 1
        ear = None
        m = len(idx)
        for i in range(m):
            a, b, c = idx[(i - 1) % m], idx[i], idx[(i + 1) % m]
            if area(a, b, c) <= 1e-8:
                continue
            if any(inside(a, b, c, idx[j]) for j in range(m) if idx[j] not in (a, b, c)):
                continue
            ear = i
            break
        if ear is None:
            break
        a, b, c = idx[(ear - 1) % m], idx[ear], idx[(ear + 1) % m]
        tris.extend([a, b, c])
        idx.pop(ear)
    if len(idx) == 3:
        tris.extend(idx)
    return tris


class Mesh:
    def __init__(self, name: str, color: tuple[float, float, float], metallic=0.0, roughness=0.85):
        self.name = name
        self.color = color
        self.metallic = metallic
        self.roughness = roughness
        self.pos: list[float] = []
        self.norm: list[float] = []
        self.idx: list[int] = []

    def add_tri(self, a, b, c):
        p = len(self.pos) // 3
        for v in (a, b, c):
            self.pos.extend(v)
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        nx = uy * vz - uz * vy
        ny = uz * vx - ux * vz
        nz = ux * vy - uy * vx
        L = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
        n = (nx / L, ny / L, nz / L)
        self.norm.extend(n * 3)
        self.idx.extend([p, p + 1, p + 2])

    def add_quad(self, a, b, c, d):
        self.add_tri(a, b, c)
        self.add_tri(a, c, d)


def box(mesh: Mesh, cx, cz, sx, sz, y0, y1, yaw=0.0):
    """Axis-aligned in XZ then yaw around Y (radians). sx=east size, sz=north size."""
    hx, hz = sx / 2, sz / 2
    c, s = math.cos(yaw), math.sin(yaw)

    def rot(x, z):
        return cx + x * c - z * s, cz + x * s + z * c

    corners = [(-hx, -hz), (hx, -hz), (hx, hz), (-hx, hz)]
    top = []
    bot = []
    for x, z in corners:
        rx, rz = rot(x, z)
        bot.append((rx, y0, rz))
        top.append((rx, y1, rz))
    mesh.add_quad(top[0], top[1], top[2], top[3])
    mesh.add_quad(bot[3], bot[2], bot[1], bot[0])
    mesh.add_quad(bot[0], bot[1], top[1], top[0])
    mesh.add_quad(bot[1], bot[2], top[2], top[1])
    mesh.add_quad(bot[2], bot[3], top[3], top[2])
    mesh.add_quad(bot[3], bot[0], top[0], top[3])


def soccer_lines(cx, cz, length, width, yaw=0.0):
    """White line boards on a field whose length is north (Z) before yaw."""
    mesh = Mesh("lines", (0.95, 0.95, 0.92), roughness=0.4)
    t = 0.18
    h0, h1 = 0.12, 0.16
    hx, hz = width / 2, length / 2

    def edge(lx, lz, sx, sz):
        c, s = math.cos(yaw), math.sin(yaw)
        wx = cx + lx * c - lz * s
        wz = cz + lx * s + lz * c
        box(mesh, wx, wz, sx, sz, h0, h1, yaw)

    edge(0, hz, width, t)
    edge(0, -hz, width, t)
    edge(hx, 0, t, length)
    edge(-hx, 0, t, length)
    edge(0, 0, width, t)
    pb_l, pb_w = 16.5, min(40.32, width - 4)
    edge(0, hz - pb_l / 2, pb_w, t)
    edge(0, -(hz - pb_l / 2), pb_w, t)
    edge(pb_w / 2, hz - pb_l / 2, t, pb_l)
    edge(-pb_w / 2, hz - pb_l / 2, t, pb_l)
    edge(pb_w / 2, -(hz - pb_l / 2), t, pb_l)
    edge(-pb_w / 2, -(hz - pb_l / 2), t, pb_l)
    return mesh


def diamond_mesh(cx, cz, name: str) -> Mesh:
    """Softball infield diamond, home plate toward south-west of centroid."""
    mesh = Mesh(name, (0.72, 0.45, 0.28), roughness=0.9)
    baseline = 27.4
    # Diamond in XZ, y 0.08–0.14
    y0, y1 = 0.08, 0.14
    # home south, first east, second north, third west
    hs = baseline / math.sqrt(2)
    home = (cx, y1, cz - hs)
    first = (cx + hs, y1, cz)
    second = (cx, y1, cz + hs)
    third = (cx - hs, y1, cz)
    home_b = (home[0], y0, home[2])
    first_b = (first[0], y0, first[2])
    second_b = (second[0], y0, second[2])
    third_b = (third[0], y0, third[2])
    mesh.add_quad(home, first, second, third)
    mesh.add_quad(third_b, second_b, first_b, home_b)
    # Outfield fan from home through first → second → third (north)
    grass = Mesh(name + "_outfield", (0.28, 0.55, 0.30))
    r = 68.0
    origin = (home[0], 0.06, home[2])
    prev = None
    for i in range(11):
        a = (math.pi * i) / 10  # east to west via north
        cur = (home[0] + r * math.cos(a), 0.06, home[2] + r * math.sin(a))
        if prev:
            grass.add_tri(origin, prev, cur)
        prev = cur
    return mesh, grass


def park_slab(ring_ll: list) -> Mesh:
    mesh = Mesh("Park_ground", (0.32, 0.52, 0.28), roughness=0.95)
    pts = [to_local(lat, lng) for lng, lat in ring_ll]
    # drop closing duplicate
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    tris = ear_clip(pts)
    y0, y1 = 0.0, 0.08
    # top
    for i in range(0, len(tris), 3):
        a, b, c = tris[i], tris[i + 1], tris[i + 2]
        mesh.add_tri((pts[a][0], y1, pts[a][1]), (pts[b][0], y1, pts[b][1]), (pts[c][0], y1, pts[c][1]))
    # bottom
    for i in range(0, len(tris), 3):
        a, b, c = tris[i], tris[i + 1], tris[i + 2]
        mesh.add_tri((pts[c][0], y0, pts[c][1]), (pts[b][0], y0, pts[b][1]), (pts[a][0], y0, pts[a][1]))
    # walls
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        a = (pts[i][0], y0, pts[i][1])
        b = (pts[j][0], y0, pts[j][1])
        c = (pts[j][0], y1, pts[j][1])
        d = (pts[i][0], y1, pts[i][1])
        mesh.add_quad(a, b, c, d)
    return mesh


def slug(s: str) -> str:
    s = s.replace("Sports Field - ", "Field_").replace("Ball Diamond - ", "Diamond_")
    return "".join(ch if ch.isalnum() else "_" for ch in s).strip("_")


def write_gltf(meshes: list[Mesh], path: Path) -> None:
    blobs = []
    accessors = []
    buffer_views = []
    meshes_js = []
    materials = []
    nodes = []
    offset = 0

    def add_f32(data: list[float], ctype: str, count: int):
        nonlocal offset
        raw = struct.pack("<" + "f" * len(data), *data)
        pad = (4 - (len(raw) % 4)) % 4
        raw += b"\x00" * pad
        bv = len(buffer_views)
        buffer_views.append(
            {"buffer": 0, "byteOffset": offset, "byteLength": len(raw) - pad, "target": 34962}
        )
        # min/max
        if ctype == "VEC3":
            xs, ys, zs = data[0::3], data[1::3], data[2::3]
            acc = {
                "bufferView": bv,
                "componentType": 5126,
                "count": count,
                "type": "VEC3",
                "min": [min(xs), min(ys), min(zs)],
                "max": [max(xs), max(ys), max(zs)],
            }
        else:
            acc = {"bufferView": bv, "componentType": 5126, "count": count, "type": ctype}
        accessors.append(acc)
        blobs.append(raw)
        offset += len(raw)
        return len(accessors) - 1

    def add_u16(data: list[int]):
        nonlocal offset
        raw = struct.pack("<" + "H" * len(data), *data)
        pad = (4 - (len(raw) % 4)) % 4
        raw += b"\x00" * pad
        bv = len(buffer_views)
        buffer_views.append(
            {"buffer": 0, "byteOffset": offset, "byteLength": len(raw) - pad, "target": 34963}
        )
        accessors.append(
            {
                "bufferView": bv,
                "componentType": 5123,
                "count": len(data),
                "type": "SCALAR",
            }
        )
        blobs.append(raw)
        offset += len(raw)
        return len(accessors) - 1

    for m in meshes:
        if not m.idx:
            continue
        pi = add_f32(m.pos, "VEC3", len(m.pos) // 3)
        ni = add_f32(m.norm, "VEC3", len(m.norm) // 3)
        ii = add_u16(m.idx)
        mi = len(materials)
        materials.append(
            {
                "name": m.name + "_mat",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [*m.color, 1.0],
                    "metallicFactor": m.metallic,
                    "roughnessFactor": m.roughness,
                },
            }
        )
        meshes_js.append(
            {
                "name": m.name,
                "primitives": [
                    {
                        "attributes": {"POSITION": pi, "NORMAL": ni},
                        "indices": ii,
                        "material": mi,
                    }
                ],
            }
        )
        nodes.append({"name": m.name, "mesh": len(meshes_js) - 1})

    buf = b"".join(blobs)
    import base64

    uri = "data:application/octet-stream;base64," + base64.b64encode(buf).decode("ascii")
    gltf = {
        "asset": {
            "version": "2.0",
            "generator": "SportMatchr Centrepointe 3D — City of Ottawa inventory",
        },
        "scene": 0,
        "scenes": [{"name": "Centrepointe_Park", "nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes_js,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(buf), "uri": uri}],
    }
    path.write_text(json.dumps(gltf), encoding="utf-8")
    print("wrote", path, "nodes", len(nodes), "bytes", path.stat().st_size)


def main() -> None:
    park = query(24, "NAME LIKE '%Centrepointe Park%'", "NAME,ADDRESS")
    fields = query(
        19,
        "PARKNAME LIKE '%Centrepointe%'",
        "FIELD_NAME,REGULAR_USE_TYPE,FIELD_SIZE,WIDTH,LENGTH",
    )
    diamonds = query(1, "PARKNAME LIKE '%Centrepointe%'", "FIELD_NAME,DIAMOND_TYPE")
    rinks = query(13, "PARKNAME LIKE '%Centrepointe%'", "PARKNAME")

    meshes: list[Mesh] = []
    ring = park[0]["geometry"]["rings"][0]
    meshes.append(park_slab(ring))

    # Soccer fields — city WIDTH/LENGTH in metres. Length along north.
    for f in fields:
        a = f["attributes"]
        g = f["geometry"]
        cx, cz = to_local(g["y"], g["x"])
        w = float(a.get("WIDTH") or 60)
        length = float(a.get("LENGTH") or 85)
        name = slug(a["FIELD_NAME"])
        turf = Mesh(name, (0.22, 0.48, 0.24))
        box(turf, cx, cz, w, length, 0.09, 0.13)
        meshes.append(turf)
        lines = soccer_lines(cx, cz, length, w)
        lines.name = name + "_lines"
        meshes.append(lines)

    for d in diamonds:
        a = d["attributes"]
        g = d["geometry"]
        cx, cz = to_local(g["y"], g["x"])
        inf, out = diamond_mesh(cx, cz, slug(a["FIELD_NAME"]))
        meshes.append(inf)
        meshes.append(out)

    if rinks:
        g = rinks[0]["geometry"]
        cx, cz = to_local(g["y"], g["x"])
        ice = Mesh("Outdoor_Rink", (0.82, 0.91, 0.95), roughness=0.2)
        box(ice, cx, cz, 26, 56, 0.10, 0.18)
        boards = Mesh("Outdoor_Rink_boards", (0.85, 0.85, 0.88), roughness=0.5)
        t = 0.35
        box(boards, cx, cz + 28, 26.7, t, 0.18, 1.22)
        box(boards, cx, cz - 28, 26.7, t, 0.18, 1.22)
        box(boards, cx + 13.35, cz, t, 56.7, 0.18, 1.22)
        box(boards, cx - 13.35, cz, t, 56.7, 0.18, 1.22)
        meshes.append(ice)
        meshes.append(boards)

    # Meet pin at current SportMatchr pin (rink / lot)
    pin = Mesh("Meet_pin", (0.17, 0.37, 0.54))
    px, pz = to_local(45.33979, -75.77097)
    box(pin, px, pz, 3.5, 3.5, 0.18, 4.2)
    meshes.append(pin)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_gltf(meshes, OUT_DIR / "centrepointe-park.gltf")


if __name__ == "__main__":
    main()
