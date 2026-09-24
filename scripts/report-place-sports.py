"""Report catalog sports with/without an honest free place."""
from __future__ import annotations

import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sports_ts = (root / "constants" / "sports.ts").read_text(encoding="utf-8")
courts_ts = (root / "constants" / "ottawaCourts.ts").read_text(encoding="utf-8")

catalog = re.findall(r"\{ name: '([^']+)'", sports_ts)
# sports arrays in courts
place_sports: set[str] = set()
for inner in re.findall(r"sports:\s*\[(.*?)\]", courts_ts, flags=re.S):
    place_sports.update(re.findall(r"'([^']+)'", inner))

sup_places = []
for m in re.finditer(
    r"id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?sports:\s*\[(.*?)\]",
    courts_ts,
    flags=re.S,
):
    sports = re.findall(r"'([^']+)'", m.group(3))
    if "Stand-Up Paddleboard" in sports:
        sup_places.append(m.group(2))

missing = [s for s in catalog if s not in place_sports]
print(f"catalog={len(catalog)} tagged_on_places={len(place_sports)}")
print(f"missing ({len(missing)}):")
for s in missing:
    print(f"  - {s}")
print(f"\nSUP places ({len(sup_places)}):")
for n in sup_places:
    print(f"  - {n}")

ids = re.findall(r"id:\s*'([^']+)'", courts_ts)
from collections import Counter
dups = [i for i, c in Counter(ids).items() if c > 1]
print(f"\nduplicate ids: {dups or 'none'}")
print(f"place count: {len(ids)}")
