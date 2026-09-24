"""Tag kiteboarding / sailing only on real Ottawa River launch spots."""
from __future__ import annotations

import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "constants" / "ottawaCourts.ts"

KITE = {
    "britannia",
    "westboro-beach",
    "andrew-haydon",
    "dick-bell-putin",
    "shirleys-bay-putin",
    "pinheys-point",
    "constance-bay",
    "gatineau-aylmer-beach",
    "fitzroy",
}
SAIL = {
    "britannia",
    "andrew-haydon",
    "dick-bell-putin",
    "constance-bay",
    "gatineau-aylmer-beach",
    "dows-lake-rowing-meet",
}


def fmt(sports: list[str], multiline: bool) -> str:
    seen: set[str] = set()
    out: list[str] = []
    for s in sports:
        if s not in seen:
            seen.add(s)
            out.append(s)
    if multiline or len(out) > 6:
        body = ",\n      ".join(f"'{s}'" for s in out)
        return "[\n      " + body + ",\n    ]"
    return "[" + ", ".join(f"'{s}'" for s in out) + "]"


def main() -> None:
    text = PATH.read_text(encoding="utf-8")

    def repl(m: re.Match[str]) -> str:
        prefix, inner = m.group(1), m.group(2)
        pid_m = re.search(r"id:\s*'([^']+)'", prefix)
        pid = pid_m.group(1) if pid_m else ""
        sports = re.findall(r"'([^']+)'", inner)
        multiline = "\n" in inner
        if pid in KITE and "Kiteboarding" not in sports:
            sports.append("Kiteboarding")
        if pid in SAIL and "Sailing" not in sports:
            sports.append("Sailing")
        return prefix + fmt(sports, multiline)

    text2, n = re.subn(
        r"(id:\s*'[^']+'[\s\S]*?sports:\s*)\[(.*?)\]",
        repl,
        text,
        flags=re.S,
    )
    PATH.write_text(text2, encoding="utf-8")
    print(f"mutated {n}")


if __name__ == "__main__":
    main()
