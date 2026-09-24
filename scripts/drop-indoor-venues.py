"""Drop indoor-venue sports and meetup pins that only existed for them."""
from __future__ import annotations

import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "constants" / "ottawaCourts.ts"

DELETE_IDS = {
    "bowling-meet-west",
    "curling-meet-riverside",
    "squash-meet-centretown",
    "kanata-golf-club-range",
    "cedarhill-range",
    "chasseurs-range",
}

STRIP = {
    "Water Polo",
    "Squash",
    "Racquetball",
    "Bowling",
    "Climbing",
    "Bouldering",
    "Boxing",
    "Martial Arts",
    "Wrestling",
    "Fencing",
    "Archery",
    "CrossFit",
    "Weight Training",
    "Dance Fitness",
    "Pilates",
    "Qi Gong",
    "Padel",
    "Handball",
    "Netball",
    "Ice Climbing",
    "Speed Skating",
    "Curling",
    "Golf",
    "Driving Range",
    "Table Tennis",
    "Lawn Bowling",
    "Bocce",
    "Cornhole",
    "Field Hockey",
}


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

    text, n_del = re.subn(
        r"\n  \{\n    id: '[^']+',[\s\S]*?\n  \},",
        drop_obj,
        text,
    )

    def clean_sports(m: re.Match[str]) -> str:
        inner = m.group(1)
        sports = re.findall(r"'([^']+)'", inner)
        return "sports: " + fmt(sports, "\n" in inner)

    text, n_sports = re.subn(r"sports:\s*\[(.*?)\]", clean_sports, text, flags=re.S)
    PATH.write_text(text, encoding="utf-8")
    print(f"deleted blocks via {n_del} object scans; cleaned {n_sports} sports arrays")


if __name__ == "__main__":
    main()
