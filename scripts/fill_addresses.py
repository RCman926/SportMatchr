"""Fill address: on every OttawaCourt from City of Ottawa park inventory."""
from __future__ import annotations

import json
import math
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURTS = ROOT / "constants" / "ottawaCourts.ts"
BASE = "https://maps.ottawa.ca/arcgis/rest/services/Parks_Inventory/MapServer"

STOP = {
    "park", "parc", "courts", "court", "fields", "field", "rink", "rinks",
    "outdoor", "the", "and", "of", "at", "de", "des", "du", "la", "le",
    "disc", "golf", "lawn", "beach", "waterfront", "community", "centre",
    "center", "recreation", "rec", "public",
}

TRUSTED_ADDR = {
    "walter-baker": "100 Charlie Rogers Place",
    "hog-back": "588 Hog's Back Road",
    "mooneys": "2960 Riverside Drive",
    "confederation": "100 Elgin Street",
    "major-hill": "Major's Hill Park, Mackenzie Avenue",
    "canal-skateway": "Queen Elizabeth Driveway",
    "vincent-massey": "Vincent Massey Park, Heron Road",
    "vincent-massey-fields": "Vincent Massey Park, Heron Road",
    "nepean-point": "Nepean Point, Sussex Drive",
    "dow-rink": "Dow's Lake Pavilion, Queen Elizabeth Driveway",
    "north-gower-rec": "2300 Community Way",
    "uottawa": "University of Ottawa, 550 Cumberland Street",
    "carleton": "Carleton University, 1125 Colonel By Drive",
    "remic": "Remic Rapids, Ottawa River Parkway",
    "britannia": "2805 Carling Avenue",
    "brewer": "100 Brewer Way",
    "lansdowne": "450 Queen Elizabeth Driveway",
    "agincourt": "1269 Albany Drive",
    "doug-frobel": "16 Rowley Avenue",
    "tunneys": "Tunney's Pasture, Sir Frederick Banting Driveway",
    "dow-lock": "Dow's Lake, Queen Elizabeth Driveway",
    "majors-hill": "Major's Hill Park, Mackenzie Avenue",
    "bruce-pit": "Bruce Pit, Moodie Drive",
    "stony-swamp": "Stony Swamp, Moodie Drive",
    "mer-bleu": "Mer Bleue Bog, Ridge Road",
    "pine-grove": "Pine Grove Forest, Hunt Club Road",
    "aviation-parkway": "Aviation Parkway",
    "ndc-green": "National District, Queen Elizabeth Driveway",
    "bate-island-putin": "Bate Island, Ottawa River Parkway",
    "pinheys-point": "Pinhey's Point, 270 Pinhey's Point Road",
    "shirleys-bay-putin": "Shirley's Bay, Rifle Road",
    "black-rapids-putin": "Black Rapids, Rideau River",
    "rideau-river-cricket": "Rideau River Eastern Pathway",
    "agora-climbing-meet": "Lebreton Flats, Wellington Street",
    "carp-ridge": "Carp Ridge, Carp Road",
    "millennium": "100 Millennium Boulevard",
    "skatepark-orleans": "Orléans Skatepark",
    "blossom": "Russell Boyd Park, Blossom Park",
    "stittsville-john-cavanaugh": "John Cavanaugh Park, Stittsville",
    "stittsville-recreation": "Stittsville Recreation Complex grounds",
    "golf-practice-meet": "Public park lawn — not a driving range",
}


def haversine_m(a, b):
    r = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = math.radians(b[0] - a[0])
    dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "SportMatchrPinSnap/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def norm(s: str) -> str:
    s = s.lower().replace("’", "'").replace("`", "'")
    s = s.replace("'s", "s").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    toks = [t for t in s.split() if t not in STOP and len(t) > 1]
    return " ".join(toks)


def tokens(s: str) -> set[str]:
    return set(norm(s).split())


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


def is_out_of_ottawa(hood: str, name: str) -> bool:
    blob = f"{hood} {name}".lower()
    for t in (
        "gatineau", "kemptville", "carleton place", "almonte", "arnprior",
        "renfrew", "perth", "merrickville", "chelsea", "wakefield", "embrun",
        "russell", "rockland", "casselman", "limoges", "bourget",
        "mississippi", "appleton", "franktown", "oxford mills", "hull",
        "aylmer", "outaouais", "smiths falls",
    ):
        if t in blob:
            return True
    return False


def fetch_parks():
    rows = []
    offset = 0
    while True:
        params = urllib.parse.urlencode(
            {
                "where": "1=1",
                "outFields": "NAME,ADDRESS,LATITUDE,LONGITUDE",
                "returnGeometry": "false",
                "f": "json",
                "resultOffset": str(offset),
                "resultRecordCount": "1000",
            }
        )
        data = get(f"{BASE}/24/query?{params}")
        feats = data.get("features") or []
        for f in feats:
            a = f["attributes"]
            addr = (a.get("ADDRESS") or "").strip()
            if a.get("NAME") and a.get("LATITUDE") and addr:
                rows.append(
                    {
                        "name": a["NAME"],
                        "address": addr,
                        "lat": float(a["LATITUDE"]),
                        "lng": float(a["LONGITUDE"]),
                    }
                )
        if len(feats) < 1000:
            break
        offset += len(feats)
    return rows


def parse_places(text: str) -> list[dict]:
    places = []
    for m in re.finditer(r"\n  \{\n    id: '([^']+)'", text):
        chunk = text[m.start() : m.start() + 2800]
        end = chunk.find("\n  },")
        if end != -1:
            chunk = chunk[: end + 6]
        nm = re.search(r"name:\s*(?:'((?:\\'|[^'])*)'|\"([^\"]*)\")", chunk)
        hood = re.search(r"neighbourhood:\s*(?:'((?:\\'|[^'])*)'|\"([^\"]*)\")", chunk)
        lat = re.search(r"lat:\s*([0-9.\-]+)", chunk)
        lng = re.search(r"lng:\s*([0-9.\-]+)", chunk)
        if not (nm and lat and lng):
            continue
        places.append(
            {
                "id": m.group(1),
                "name": (nm.group(1) or nm.group(2) or "").replace("\\'", "'"),
                "hood": ((hood.group(1) or hood.group(2)) if hood else "") or "",
                "lat": float(lat.group(1)),
                "lng": float(lng.group(1)),
            }
        )
    return places


def pick_address(place: dict, parks: list[dict]) -> str | None:
    if place["id"] in TRUSTED_ADDR:
        return TRUSTED_ADDR[place["id"]]
    if is_out_of_ottawa(place["hood"], place["name"]):
        return None
    here = (place["lat"], place["lng"])
    ranked = []
    for r in parks:
        sc = score_name(place["name"], r["name"])
        dist = haversine_m(here, (r["lat"], r["lng"]))
        if sc < 0.55 and dist > 250:
            continue
        if dist > 4000 and sc < 0.97:
            continue
        rank = sc * 1000 - min(dist, 8000) / 15
        ranked.append((rank, sc, dist, r))
    if not ranked:
        near = min(parks, key=lambda r: haversine_m(here, (r["lat"], r["lng"])))
        dist = haversine_m(here, (near["lat"], near["lng"]))
        if dist <= 180:
            return clean_addr(near["address"])
        return None
    ranked.sort(key=lambda x: -x[0])
    _, sc, dist, r = ranked[0]
    if sc >= 0.7 or dist <= 220:
        return clean_addr(r["address"])
    if dist <= 180:
        return clean_addr(r["address"])
    return None


def clean_addr(addr: str) -> str:
    addr = addr.replace("’", "'").strip()
    # Drop city suffix — we already say Ottawa
    addr = re.sub(r",\s*(Ottawa|Nepean|Kanata|Gloucester|Cumberland|Vanier|Rideau|West Carleton|Osgoode|Goulbourn)\s*$", "", addr, flags=re.I)
    return addr


def ts_str(s: str) -> str:
    if "'" in s and '"' not in s:
        return f'"{s}"'
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def apply_addresses(text: str, addrs: dict[str, str]) -> str:
    def repl(m: re.Match[str]) -> str:
        pid = m.group(1)
        block = m.group(0)
        if pid not in addrs:
            return block
        line = f"    address: {ts_str(addrs[pid])},\n"
        if re.search(r"\n    address:", block):
            return re.sub(r"\n    address:.*", "\n" + line.rstrip("\n"), block, count=1)
        return re.sub(
            r"(\n    neighbourhood: .+\n)",
            r"\1" + line,
            block,
            count=1,
        )

    return re.sub(
        r"\{\s*\n    id: '([^']+)'[\s\S]*?\n    neighbourhood: .+\n",
        repl,
        text,
    )


def main() -> None:
    text = COURTS.read_text(encoding="utf-8")
    places = parse_places(text)
    print("places", len(places), flush=True)
    parks = fetch_parks()
    print("parks with address", len(parks), flush=True)
    addrs = {}
    missing = []
    for p in places:
        hit = pick_address(p, parks)
        if hit:
            addrs[p["id"]] = hit
        else:
            missing.append(p["id"])
    print("addressed", len(addrs), "missing", len(missing), flush=True)
    print("missing", missing, flush=True)
    new = apply_addresses(text, addrs)
    COURTS.write_text(new, encoding="utf-8", newline="\n")
    print("wrote", COURTS, flush=True)


if __name__ == "__main__":
    main()
