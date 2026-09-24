"""Strip club / booked / indoor leftovers from place tags."""
from __future__ import annotations

import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "constants" / "ottawaCourts.ts"

STRIP = {
    "Sailing",
    "Rowing",
    "Futsal",
    "Badminton",
    "Downhill Skiing",
    "Snowboarding",
    "Dodgeball",
    "Orienteering",
}
DELETE_IDS = {"camp-fortune-meet"}


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
        return "sports: " + fmt(re.findall(r"'([^']+)'", m.group(1)), "\n" in m.group(1))

    text, n = re.subn(r"sports:\s*\[(.*?)\]", clean, text, flags=re.S)
    PATH.write_text(text, encoding="utf-8")
    print(f"cleaned {n} arrays")


if __name__ == "__main__":
    main()
