"""Strip sports that were tagged for catalog coverage, not because the facility exists."""
from __future__ import annotations

import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "constants" / "ottawaCourts.ts"

# Not a real public facility at typical Ottawa parks / rinks / tennis courts.
DENY = {
    "Padel",
    "Handball",
    "Netball",
    "Field Hockey",
    "Lawn Bowling",
    "Speed Skating",
    "Cornhole",
    "Bocce",
    "Qi Gong",
    "Dance Fitness",
    "Pilates",
    "Wrestling",
    "Fencing",
    "Boxing",
    "Martial Arts",
    "Ice Climbing",
}


def clean_sports_block(inner: str) -> str:
    sports = re.findall(r"'([^']+)'", inner)
    cleaned = [s for s in sports if s not in DENY]
    if not cleaned:
        cleaned = ["Running"]
    multiline = "\n" in inner or len(cleaned) > 6
    if multiline:
        body = ",\n      ".join(f"'{s}'" for s in cleaned)
        return "sports: [\n      " + body + ",\n    ]"
    return "sports: [" + ", ".join(f"'{s}'" for s in cleaned) + "]"


def main() -> None:
    text = PATH.read_text(encoding="utf-8")
    text2, n = re.subn(
        r"sports:\s*\[(.*?)\]",
        lambda m: clean_sports_block(m.group(1)),
        text,
        flags=re.S,
    )
    PATH.write_text(text2, encoding="utf-8")
    print(f"cleaned {n} sports arrays")


if __name__ == "__main__":
    main()
