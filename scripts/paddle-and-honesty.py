"""Add real paddle put-ins and drop leftover dishonest tags."""
from __future__ import annotations

import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "constants" / "ottawaCourts.ts"

# Downtown lawns — river nearby, not a launch.
NO_AUTO_SUP = {"perth-stewart"}

ADD_SPORTS = {
    "andrew-haydon": ["Kayaking", "Canoeing", "Stand-Up Paddleboard"],
    "strathcona": ["Kayaking", "Canoeing", "Stand-Up Paddleboard"],
    "perth-last-duel": ["Kayaking", "Canoeing", "Stand-Up Paddleboard"],
}

REMOVE_SPORTS = {
    "perth-stewart": ["Kayaking", "Canoeing", "Stand-Up Paddleboard"],
    "golf-practice-meet": ["Golf", "Driving Range"],
    "hampton-park-golf-lawn": ["Golf", "Driving Range"],
    "agora-climbing-meet": ["Climbing", "Bouldering", "Archery"],
    "majors-hill": ["Orienteering"],
    "nepean-point": ["Orienteering"],
}

NEW_PLACES = """
  // —— Paddleboard put-ins (bring your own board) ——
  {
    id: 'bate-island-putin',
    name: 'Bate Island paddle put-in',
    neighbourhood: 'Ottawa River',
    sports: ['Stand-Up Paddleboard', 'Kayaking', 'Canoeing'],
    type: 'free',
    season: 'summer',
    lat: 45.4106,
    lng: -75.7475,
    notes: 'Public Ottawa River put-in near Deschênes Rapids — bring your own board',
  },
  {
    id: 'dick-bell-putin',
    name: 'Dick Bell Park shoreline',
    neighbourhood: 'Nepean',
    sports: ['Stand-Up Paddleboard', 'Kayaking', 'Canoeing', 'Running', 'Cycling'],
    type: 'free',
    season: 'summer',
    lat: 45.3489,
    lng: -75.8128,
    notes: 'West-end Ottawa River shoreline next to Andrew Haydon — bring your own board',
  },
  {
    id: 'pinheys-point',
    name: "Pinhey's Point shoreline",
    neighbourhood: 'Dunrobin',
    sports: ['Stand-Up Paddleboard', 'Kayaking', 'Canoeing', 'Hiking', 'Running'],
    type: 'free',
    season: 'summer',
    lat: 45.5074,
    lng: -76.0825,
    notes: 'Ottawa River historic site — public water access; bring your own board',
  },
  {
    id: 'shirleys-bay-putin',
    name: "Shirley's Bay shoreline",
    neighbourhood: "Shirley's Bay",
    sports: ['Stand-Up Paddleboard', 'Kayaking', 'Canoeing', 'Hiking'],
    type: 'free',
    season: 'summer',
    lat: 45.3652,
    lng: -75.8834,
    notes: 'Ottawa River / Greenbelt shoreline — bring your own board',
  },
  {
    id: 'black-rapids-putin',
    name: 'Black Rapids lock (Rideau)',
    neighbourhood: 'Nepean',
    sports: ['Stand-Up Paddleboard', 'Kayaking', 'Canoeing', 'Cycling'],
    type: 'free',
    season: 'summer',
    lat: 45.3184,
    lng: -75.6982,
    notes: 'Rideau Canal lock station — public put-in; bring your own board',
  },
  {
    id: 'billings-rideau-putin',
    name: 'Rideau at Billings Bridge',
    neighbourhood: 'Billings Bridge',
    sports: ['Stand-Up Paddleboard', 'Kayaking', 'Canoeing', 'Cycling', 'Running'],
    type: 'free',
    season: 'summer',
    lat: 45.3868,
    lng: -75.6758,
    notes: 'Rideau River pathway put-in — bring your own board',
  },
"""


def format_sports(sports: list[str], multiline: bool) -> str:
    seen: set[str] = set()
    out: list[str] = []
    for s in sports:
        if s not in seen:
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

    def repl(m: re.Match[str]) -> str:
        prefix, inner = m.group(1), m.group(2)
        place_id = re.search(r"id:\s*'([^']+)'", prefix)
        pid = place_id.group(1) if place_id else ""
        sports = re.findall(r"'([^']+)'", inner)
        multiline = "\n" in inner

        for s in REMOVE_SPORTS.get(pid, []):
            sports = [x for x in sports if x != s]
        for s in ADD_SPORTS.get(pid, []):
            if s not in sports:
                sports.append(s)

        if pid not in NO_AUTO_SUP and (
            "Kayaking" in sports or "Canoeing" in sports
        ):
            if "Stand-Up Paddleboard" not in sports:
                sports.append("Stand-Up Paddleboard")

        return prefix + format_sports(sports, multiline)

    # Each object: from `{` after comma/newline to sports array. Safer: id then sports.
    text2, n = re.subn(
        r"(id:\s*'[^']+'[\s\S]*?sports:\s*)\[(.*?)\]",
        repl,
        text,
        flags=re.S,
    )
    if "bate-island-putin" not in text2:
        needle = "];\n\nexport const FREE_COURT_COUNT"
        if needle not in text2:
            raise SystemExit("could not find array close")
        text2 = text2.replace(needle, NEW_PLACES.rstrip() + "\n];\n\nexport const FREE_COURT_COUNT", 1)

    PATH.write_text(text2, encoding="utf-8")
    print(f"mutated {n} sports arrays")


if __name__ == "__main__":
    main()
