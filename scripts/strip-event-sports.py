"""Strip arranged-event sports from place tags; drop fake disc-golf pins."""
from __future__ import annotations

import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "constants" / "ottawaCourts.ts"

STRIP = {"Outdoor Yoga", "Yoga", "Tai Chi"}
DELETE_IDS = {"disc-golf-andrew", "disc-golf-riverside"}

NEW = """
  {
    id: 'disc-golf-draveurs',
    name: 'Parcours des Draveurs disc golf',
    neighbourhood: 'Gatineau',
    sports: ['Disc Golf'],
    type: 'free',
    season: 'summer',
    lat: 45.4312,
    lng: -75.7298,
    notes: 'Free 9-hole public course — bring discs',
  },
  {
    id: 'disc-golf-ferguson',
    name: 'Ferguson Forest disc golf',
    neighbourhood: 'Kemptville',
    sports: ['Disc Golf', 'Hiking', 'Trail Running'],
    type: 'free',
    season: 'summer',
    lat: 45.0086,
    lng: -75.6472,
    notes: 'Free public baskets in the forest — bring discs',
  },
"""


def fmt(sports: list[str], multiline: bool) -> str:
    seen: set[str] = set()
    out: list[str] = []
    for s in sports:
        if s in STRIP or s in seen:
            continue
        seen.add(s)
        out.append(s)
    if not out:
        out = ["Running"]
    if multiline or len(out) > 6:
        body = ",\n      ".join(f"'{s}'" for s in out)
        return "[\n      " + body + ",\n    ]"
    return "[" + ", ".join(f"'{s}'" for s in out) + "]"


def main() -> None:
    text = PATH.read_text(encoding="utf-8")

    def drop_obj(m: re.Match[str]) -> str:
        block = m.group(0)
        id_m = re.search(r"id:\s*'([^']+)'", block)
        if id_m and id_m.group(1) in DELETE_IDS:
            return ""
        return block

    text, _ = re.subn(
        r"\n  \{\n    id: '[^']+',[\s\S]*?\n  \},",
        drop_obj,
        text,
    )

    def clean(m: re.Match[str]) -> str:
        inner = m.group(1)
        sports = re.findall(r"'([^']+)'", inner)
        return "sports: " + fmt(sports, "\n" in inner)

    text, n = re.subn(r"sports:\s*\[(.*?)\]", clean, text, flags=re.S)

    if "disc-golf-draveurs" not in text:
        needle = "];\n\nexport const FREE_COURT_COUNT"
        if needle not in text:
            raise SystemExit("could not insert disc golf pins")
        text = text.replace(needle, NEW.rstrip() + "\n];\n\nexport const FREE_COURT_COUNT", 1)

    PATH.write_text(text, encoding="utf-8")
    print(f"cleaned {n} sports arrays")


if __name__ == "__main__":
    main()
