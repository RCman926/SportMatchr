"""Snap SportMatchr pins to City of Ottawa facility points / park centroids."""
from __future__ import annotations

import json
import math
import re
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURTS = ROOT / "constants" / "ottawaCourts.ts"
CACHE = ROOT / "scripts" / "_ottawa_inventory.json"

BASE = "https://maps.ottawa.ca/arcgis/rest/services/Parks_Inventory/MapServer"
LAYERS = {
    "park": (24, "NAME", False),
    "tennis": (21, "PARKNAME", True),
    "basketball": (3, "PARKNAME", True),
    "field": (19, "PARKNAME", True),
    "diamond": (1, "PARKNAME", True),
    "rink": (13, "PARKNAME", True),
    "volleyball": (22, "PARKNAME", True),
    "pickleball": (27, "PARKNAME", True),
    "beach": (0, "PARKNAME", True),
    "boat": (4, "PARKNAME", True),
    "skate": (16, "PARKNAME", True),
}

STOP = {
    "park",
    "parc",
    "courts",
    "court",
    "fields",
    "field",
    "rink",
    "rinks",
    "outdoor",
    "the",
    "and",
    "of",
    "at",
    "de",
    "des",
    "du",
    "la",
    "le",
    "disc",
    "golf",
    "lawn",
    "beach",
    "waterfront",
    "community",
    "centre",
    "center",
    "recreation",
    "rec",
    "public",
    "school",
    "high",
    "elementary",
}


def from3857(x: float, y: float) -> tuple[float, float]:
    lon = x * 180 / 20037508.342789244
    lat = math.atan(math.exp(y * math.pi / 20037508.342789244)) * 360 / math.pi - 90
    return lat, lon


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    r = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = math.radians(b[0] - a[0])
    dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def norm(s: str) -> str:
    s = s.lower().replace("’", "'").replace("`", "'")
    s = s.replace("'s", "s").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    toks = [t for t in s.split() if t not in STOP and len(t) > 1]
    return " ".join(toks)


def tokens(s: str) -> set[str]:
    return set(norm(s).split())


def fetch_layer(layer_id: int, fields: str, geometry: bool) -> list[dict]:
    out = []
    offset = 0
    while True:
        params = {
            "where": "1=1",
            "outFields": fields,
            "returnGeometry": "true" if geometry else "false",
            "outSR": "4326",
            "f": "json",
            "resultOffset": str(offset),
            "resultRecordCount": "1000",
        }
        url = f"{BASE}/{layer_id}/query?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "SportMatchrPinSnap/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
        if data.get("error"):
            raise RuntimeError(data["error"])
        feats = data.get("features") or []
        out.extend(feats)
        if len(feats) < 1000:
            break
        offset += len(feats)
        if offset > 20000:
            break
        time.sleep(0.12)
    return out


def point_of(feat: dict) -> tuple[float, float] | None:
    attrs = feat.get("attributes") or {}
    lat, lng = attrs.get("LATITUDE"), attrs.get("LONGITUDE")
    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)) and lat and lng:
        return float(lat), float(lng)
    geom = feat.get("geometry") or {}
    if "x" in geom and "y" in geom:
        x, y = geom["x"], geom["y"]
        if abs(x) > 180:  # still mercator
            return from3857(x, y)
        return float(y), float(x)  # ArcGIS 4326 is x=lon, y=lat
    return None


def park_name(feat: dict, field: str) -> str:
    attrs = feat.get("attributes") or {}
    return (attrs.get(field) or attrs.get("PARKNAME") or attrs.get("NAME") or "").strip()


def load_inventory() -> dict:
    inv: dict[str, list] = {}
    if CACHE.exists():
        inv = json.loads(CACHE.read_text(encoding="utf-8"))
    for key, (lid, field, geom) in LAYERS.items():
        if inv.get(key):
            print(f"cache {key} {len(inv[key])}", flush=True)
            continue
        print(f"fetch {key} layer {lid}...", flush=True)
        fields = "NAME,LATITUDE,LONGITUDE" if key == "park" else "PARKNAME"
        try:
            feats = fetch_layer(lid, fields, geom)
        except Exception as e:
            print(f"  FAIL {e}", flush=True)
            inv[key] = []
            continue
        rows = []
        for f in feats:
            pt = point_of(f)
            name = park_name(f, field)
            if not name or not pt:
                continue
            rows.append({"name": name, "lat": round(pt[0], 6), "lng": round(pt[1], 6)})
        inv[key] = rows
        print(f"  {len(rows)} points", flush=True)
        CACHE.write_text(json.dumps(inv), encoding="utf-8")
    return inv


def parse_places(text: str) -> list[dict]:
    places = []
    for m in re.finditer(r"\n  \{\n    id: '([^']+)'", text):
        chunk = text[m.start() : m.start() + 2500]
        end = chunk.find("\n  },")
        if end != -1:
            chunk = chunk[: end + 6]
        nm = re.search(r"name:\s*(?:'((?:\\'|[^'])*)'|\"([^\"]*)\")", chunk)
        hood = re.search(r"neighbourhood:\s*(?:'((?:\\'|[^'])*)'|\"([^\"]*)\")", chunk)
        sm = re.search(r"sports:\s*\[([\s\S]*?)\]", chunk)
        sports = re.findall(r"'([^']+)'", sm.group(1)) if sm else []
        lat = re.search(r"lat:\s*([0-9.\-]+)", chunk)
        lng = re.search(r"lng:\s*([0-9.\-]+)", chunk)
        if not (nm and lat and lng):
            continue
        places.append(
            {
                "id": m.group(1),
                "name": (nm.group(1) or nm.group(2) or "").replace("\\'", "'"),
                "hood": ((hood.group(1) or hood.group(2)) if hood else "") or "",
                "sports": sports,
                "lat": float(lat.group(1)),
                "lng": float(lng.group(1)),
            }
        )
    return places


SPORT_PREF = [
    ("Basketball", "basketball"),
    ("Outdoor Basketball", "basketball"),
    ("Tennis", "tennis"),
    ("Pickleball", "pickleball"),
    ("Volleyball", "volleyball"),
    ("Beach Volleyball", "volleyball"),
    ("Soccer", "field"),
    ("Football", "field"),
    ("Baseball", "diamond"),
    ("Softball", "diamond"),
    ("Slo-Pitch", "diamond"),
    ("Ice Hockey", "rink"),
    ("Shinny", "rink"),
    ("Skating", "rink"),
    ("Swimming", "beach"),
    ("Kayaking", "boat"),
    ("Stand-Up Paddleboard", "boat"),
    ("Skateboarding", "skate"),
]


def preferred_kind(sports: list[str]) -> list[str]:
    kinds = []
    for s, k in SPORT_PREF:
        if s in sports and k not in kinds:
            kinds.append(k)
    return kinds


def index_by_name(rows: list[dict]) -> dict[str, list[dict]]:
    idx = defaultdict(list)
    for r in rows:
        n = norm(r["name"])
        if n:
            idx[n].append(r)
        for t in tokens(r["name"]):
            if len(t) >= 5:
                idx[t].append(r)
    return idx


def score_name(place_name: str, city_name: str) -> float:
    a, b = tokens(place_name), tokens(city_name)
    if not a or not b:
        return 0
    if a == b:
        return 1.0
    if a <= b or b <= a:
        return 0.86 + 0.1 * len(a & b) / max(len(a | b), 1)
    inter = len(a & b)
    if not inter:
        return 0
    return inter / len(a | b)


OUT_TOWN = (
    "gatineau",
    "kemptville",
    "carleton place",
    "almonte",
    "arnprior",
    "renfrew",
    "perth",
    "merrickville",
    "chelsea",
    "wakefield",
    "embrun",
    "russell",
    "rockland",
    "casselman",
    "limoges",
    "clarence",
    "bourget",
    "sarsfield",
    "mississippi",
    "appleton",
    "franktown",
    "oxford mills",
    "manotick",
    "richmond",  # village SW of Ottawa — still in city, keep
)


def is_out_of_ottawa(hood: str, name: str) -> bool:
    blob = f"{hood} {name}".lower()
    for t in (
        "gatineau",
        "kemptville",
        "carleton place",
        "almonte",
        "arnprior",
        "renfrew",
        "perth",
        "merrickville",
        "chelsea",
        "wakefield",
        "embrun",
        "russell",
        "rockland",
        "casselman",
        "limoges",
        "bourget",
        "mississippi",
        "appleton",
        "franktown",
        "oxford mills",
        "hull",
        "aylmer",
        "outaouais",
    ):
        if t in blob:
            return True
    return False


def pick_point(place: dict, inv: dict) -> tuple[float, float, str] | None:
    if is_out_of_ottawa(place.get("hood", ""), place["name"]):
        return None
    here = (place["lat"], place["lng"])
    kinds = preferred_kind(place["sports"])
    search_kinds = ["park", *kinds] if kinds else ["park"]
    candidates: list[tuple[float, dict, str]] = []

    def consider(rows: list[dict], kind: str):
        for r in rows:
            sc = score_name(place["name"], r["name"])
            if sc < 0.72:
                continue
            dist = haversine_m(here, (r["lat"], r["lng"]))
            if dist > 3500 and sc < 0.97:
                continue
            rank = sc * 1000 - min(dist, 8000) / 20
            candidates.append((rank, r, kind))

    seen = set()
    for kind in search_kinds:
        if kind in seen:
            continue
        seen.add(kind)
        consider(inv.get(kind, []), kind)

    if not candidates:
        # Unique distinctive token → that city park (e.g. Remic, Beaverbrook).
        toks = [t for t in tokens(place["name"]) if len(t) >= 5]
        skip_toks = {
            "trail",
            "trails",
            "clarence",
            "vincent",
            "jackson",
            "parkway",
            "green",
            "swamp",
            "shoreline",
            "centennial",
            "appleton",
            "future",
            "riverside",
            "waterfront",
        }
        park_rows = inv.get("park") or []
        for t in toks:
            if t in skip_toks:
                continue
            hits = [r for r in park_rows if t in norm(r["name"])]
            if len(hits) == 1:
                r = hits[0]
                kind = "park"
                if kinds:
                    facs = [
                        f
                        for k in kinds
                        for f in inv.get(k, [])
                        if score_name(r["name"], f["name"]) >= 0.8
                    ]
                    if facs:
                        r, kind = facs[0], kinds[0]
                if haversine_m(here, (r["lat"], r["lng"])) > 4000:
                    continue
                return r["lat"], r["lng"], f"{kind}:{r['name']}"
        return None
    candidates.sort(key=lambda x: -x[0])
    best_sc = score_name(place["name"], candidates[0][1]["name"])
    pool = [
        c
        for c in candidates
        if score_name(place["name"], c[1]["name"]) >= best_sc - 0.05
    ]
    pref = set(kinds)
    fac = [c for c in pool if c[2] in pref] if pref else []
    use = fac or pool
    use.sort(key=lambda x: haversine_m(here, (x[1]["lat"], x[1]["lng"])))
    r, kind = use[0][1], use[0][2]
    return r["lat"], r["lng"], f"{kind}:{r['name']}"


def nominatim(name: str, near: tuple[float, float], hood: str = "") -> tuple[float, float, str] | None:
    q = urllib.parse.urlencode(
        {
            "q": f"{name} {hood} Ontario Canada".strip(),
            "format": "json",
            "limit": "5",
            "countrycodes": "ca",
        }
    )
    url = f"https://nominatim.openstreetmap.org/search?{q}"
    req = urllib.request.Request(
        url, headers={"User-Agent": "SportMatchrPinSnap/1.0 (ottawa pickup map)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            hits = json.load(r)
    except Exception:
        return None
    if not hits:
        return None
    ranked = []
    for h in hits:
        label = h.get("name") or h.get("display_name") or ""
        sc = score_name(name, label)
        if sc < 0.5:
            sc2 = score_name(name, h.get("display_name") or "")
            sc = max(sc, sc2)
        if sc < 0.5:
            continue
        ranked.append((sc, h))
    if not ranked:
        return None
    ranked.sort(key=lambda x: -x[0])
    best = ranked[0][1]
    return float(best["lat"]), float(best["lon"]), f"osm:{best.get('display_name','')[:80]}"


def apply_updates(text: str, updates: dict[str, tuple[float, float]]) -> str:
    def repl(m: re.Match[str]) -> str:
        pid = m.group(1)
        if pid not in updates:
            return m.group(0)
        lat, lng = updates[pid]
        block = m.group(0)
        block = re.sub(r"lat:\s*[0-9.\-]+", f"lat: {lat:.5f}", block, count=1)
        block = re.sub(r"lng:\s*[0-9.\-]+", f"lng: {lng:.5f}", block, count=1)
        return block

    return re.sub(
        r"\{\s*id:\s*'([^']+)'[\s\S]*?lng:\s*[0-9.\-]+",
        repl,
        text,
    )


TRUSTED = {
    "vincent-massey": (45.37908, -75.69538),
    "vincent-massey-fields": (45.37680, -75.69620),
    "major-hill": (45.42721, -75.69709),
    "majors-hill": (45.42721, -75.69709),
    "confederation": (45.42237, -75.69160),
    "walter-baker": (45.29449, -75.90388),
    "nepean-point": (45.42951, -75.70092),
    "dow-rink": (45.39633, -75.70556),
    "bruce-pit": (45.32308, -75.79891),
    "stony-swamp": (45.29351, -75.81523),
    "pine-grove": (45.34759, -75.60204),
    "fitzroy": (45.46938, -76.20634),
    "rockcliffe-park-more": (45.45001, -75.67427),
    "manotick-dickinson": (45.22684, -75.68324),
    "manotick-mahoney": (45.24475, -75.69989),
    "cp-riverside": (45.13330, -76.14997),
    "hog-back": (45.37140, -75.69690),
    "canal-skateway": (45.42380, -75.69090),
    "mer-bleu": (45.39660, -75.56280),
    "katimavik-courts": (45.31404, -75.88441),
    "tunneys": (45.40580, -75.73950),
    "agincourt": (45.36059, -75.75404),
    "doug-frobel": (45.34902, -75.74173),
    "carlingwood": (45.37684, -75.77286),
    "springfield": (45.41273, -75.67289),
    "springfield-rink": (45.42528, -75.65610),
    "kanata-lakes": (45.32819, -75.92221),
    "genevieve": (45.42885, -75.66137),
    "plumbers": (45.41524, -75.68672),
    "plant": (45.40748, -75.71508),
    "south-keys": (45.35428, -75.66246),
    "blossom": (45.35218, -75.62568),
    "findlay-creek": (45.31580, -75.60427),
    "outdoor-rink-westboro": (45.38387, -75.75397),
    "remic": (45.40347, -75.75008),
    "champagne": (45.45468, -75.51573),
    "clarence-creek-park": (45.50489, -75.21963),
    "mooneys": (45.36524, -75.69107),
}


def main() -> None:
    text = COURTS.read_text(encoding="utf-8")
    places = parse_places(text)
    print("places", len(places), flush=True)
    inv = load_inventory()
    updates = {}
    report = []
    unmatched = []
    for p in places:
        if p["id"] in TRUSTED:
            lat, lng = TRUSTED[p["id"]]
            moved = haversine_m((p["lat"], p["lng"]), (lat, lng))
            updates[p["id"]] = (lat, lng)
            report.append((moved, p["id"], p["name"], "trusted", lat, lng))
            continue
        hit = pick_point(p, inv)
        if not hit:
            unmatched.append(p)
            continue
        lat, lng, src = hit
        moved = haversine_m((p["lat"], p["lng"]), (lat, lng))
        updates[p["id"]] = (lat, lng)
        report.append((moved, p["id"], p["name"], src, lat, lng))

    report.sort(reverse=True)
    print("\n=== biggest moves (m) ===", flush=True)
    for row in report[:40]:
        print(f"{row[0]:7.0f}  {row[1]:28}  {row[2][:40]:40}  {row[3][:50]}", flush=True)
    filtered = {}
    for moved, pid, name, src, lat, lng in report:
        if moved > 4000 and src != "trusted":
            print("drop far", pid, round(moved), src[:40], flush=True)
            continue
        filtered[pid] = (lat, lng)
    print("\nunmatched", [p["id"] for p in unmatched], flush=True)
    print("updated", len(filtered), "of", len(places), flush=True)
    new = apply_updates(text, filtered)
    COURTS.write_text(new, encoding="utf-8", newline="\n")
    print("wrote", COURTS, flush=True)


if __name__ == "__main__":
    main()
