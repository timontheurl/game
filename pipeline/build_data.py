"""Berechnet Pre-Assists aus den StatsBomb Open Data und schreibt JSON für die Website.

Aufruf:  python3 pipeline/build_data.py
Ausgabe: web/data/competitions.json und web/data/seasons/<slug>.json

Definition Pre-Assist (siehe auch web/app/methodik):
  Tor -> Assist (StatsBomb key_pass des Torschusses) -> Pre-Assist =
  der letzte angekommene Pass eines Mitspielers an den Assistgeber, in derselben
  Ballbesitzphase, ohne dass dazwischen ein Gegner den Ball kontrolliert oder
  ein anderer Mitspieler den Ball berührt hat.
"""

from __future__ import annotations

import http.client
import json
import re
import sys
import time
import unicodedata
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = Path(__file__).resolve().parent / ".cache"
OUT_DIR = ROOT / "web" / "data"
CACHE_VERSION = 3

# Welche Saisons auf der Website erscheinen. coverage: "full" = alle Spiele der Liga,
# "team" = nur Spiele eines Teams (StatsBomb hat nur diese freigegeben).
SEASONS = [
    {"slug": "bundesliga-2023-24", "competition_id": 9, "season_id": 281,
     "name": "Bundesliga", "country": "Deutschland", "season": "2023/24",
     "coverage": "team", "coverage_team": "Bayer Leverkusen"},
    {"slug": "premier-league-2015-16", "competition_id": 2, "season_id": 27,
     "name": "Premier League", "country": "England", "season": "2015/16",
     "coverage": "full"},
    {"slug": "la-liga-2015-16", "competition_id": 11, "season_id": 27,
     "name": "La Liga", "country": "Spanien", "season": "2015/16",
     "coverage": "full"},
]

# StatsBomb-Positionen -> deutsche Kürzel
POSITIONS = {
    "Goalkeeper": "TW",
    "Right Back": "RV", "Left Back": "LV", "Right Wing Back": "RV", "Left Wing Back": "LV",
    "Right Center Back": "IV", "Center Back": "IV", "Left Center Back": "IV",
    "Right Defensive Midfield": "ZDM", "Center Defensive Midfield": "ZDM", "Left Defensive Midfield": "ZDM",
    "Right Center Midfield": "ZM", "Center Midfield": "ZM", "Left Center Midfield": "ZM",
    "Right Midfield": "RM", "Left Midfield": "LM",
    "Right Attacking Midfield": "ZOM", "Center Attacking Midfield": "ZOM", "Left Attacking Midfield": "ZOM",
    "Right Wing": "RF", "Left Wing": "LF",
    "Right Center Forward": "ST", "Center Forward": "ST", "Left Center Forward": "ST", "Secondary Striker": "HS",
}

# StatsBomb-Ländernamen -> Codes für die Flaggen (flag-icons)
COUNTRY_CODES = {
    "Albania": "al", "Algeria": "dz", "Angola": "ao", "Argentina": "ar", "Armenia": "am", "Australia": "au",
    "Austria": "at", "Belgium": "be", "Benin": "bj", "Bosnia and Herzegovina": "ba", "Brazil": "br",
    "Bulgaria": "bg", "Burkina Faso": "bf", "Burundi": "bi", "Cameroon": "cm", "Canada": "ca",
    "Cape Verde Islands": "cv", "Central African Republic": "cf", "Chile": "cl", "China PR": "cn",
    "Colombia": "co", "Congo": "cg", "Congo DR": "cd", "Costa Rica": "cr", "Côte d'Ivoire": "ci",
    "Croatia": "hr", "Curaçao": "cw", "Cyprus": "cy", "Czech Republic": "cz", "Denmark": "dk",
    "Ecuador": "ec", "Egypt": "eg", "England": "gb-eng", "Equatorial Guinea": "gq", "Estonia": "ee",
    "Finland": "fi", "France": "fr", "Gabon": "ga", "Gambia": "gm", "Georgia": "ge", "Germany": "de",
    "Ghana": "gh", "Greece": "gr", "Guinea": "gn", "Guinea-Bissau": "gw", "Haiti": "ht", "Honduras": "hn",
    "Hungary": "hu", "Iceland": "is", "Iran": "ir", "Israel": "il", "Italy": "it", "Jamaica": "jm",
    "Japan": "jp", "Kenya": "ke", "Korea Republic": "kr", "Kosovo": "xk", "Mali": "ml", "Malta": "mt",
    "Mexico": "mx", "Montenegro": "me", "Morocco": "ma", "Netherlands": "nl", "New Zealand": "nz",
    "Nigeria": "ng", "North Macedonia": "mk", "Northern Ireland": "gb-nir", "Norway": "no", "Panama": "pa",
    "Paraguay": "py", "Peru": "pe", "Poland": "pl", "Portugal": "pt", "Republic of Ireland": "ie",
    "Ireland": "ie", "Romania": "ro", "Russia": "ru", "Scotland": "gb-sct", "Senegal": "sn", "Serbia": "rs",
    "Sierra Leone": "sl", "Slovakia": "sk", "Slovenia": "si", "South Africa": "za", "Spain": "es",
    "Sweden": "se", "Switzerland": "ch", "Togo": "tg", "Trinidad and Tobago": "tt", "Tunisia": "tn",
    "Turkey": "tr", "Ukraine": "ua", "United States": "us", "United States of America": "us",
    "Uruguay": "uy", "Venezuela": "ve", "Wales": "gb-wls", "Zambia": "zm", "Zimbabwe": "zw",
    "Uzbekistan": "uz", "Luxembourg": "lu", "Lithuania": "lt", "Latvia": "lv", "Belarus": "by",
    "Mozambique": "mz", "Madagascar": "mg", "Martinique": "mq", "Guadeloupe": "gp", "French Guiana": "gf",
    "Congo, (Kinshasa)": "cd", "Venezuela\xa0(Bolivarian Republic)": "ve", "Korea\xa0(South)": "kr",
    "Cape Verde": "cv", "Comoros": "km", "Mauritania": "mr", "Libya": "ly", "Syria": "sy", "Iraq": "iq", "Saudi Arabia": "sa",
    "Qatar": "qa", "Bolivia": "bo", "Faroe Islands": "fo", "Liechtenstein": "li", "Moldova": "md",
}

PERIOD_START = {1: 0, 2: 45, 3: 90, 4: 105, 5: 120}

# Gegner-Aktionen, nach denen ein Pass nicht mehr als Pre-Assist zählt.
OPPONENT_CONTROL = {"Ball Recovery", "Interception", "Clearance", "Block", "Goal Keeper"}
# Aktionen des Assistgebers, die einen Ballverlust/Unterbrechung bedeuten.
ATTACKER_BREAK = {"Shot", "Dispossessed", "Miscontrol", "Error", "Foul Won", "Offside"}


def fetch_json(path: str, attempts: int = 5):
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(f"{BASE_URL}/{path}", timeout=120) as resp:
                return json.load(resp)
        except (OSError, http.client.HTTPException, json.JSONDecodeError):
            if attempt == attempts - 1:
                raise
            time.sleep(2 ** attempt)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def clock_to_minutes(clock: str) -> float:
    m, s = clock.split(":")
    return int(m) + int(s) / 60


def played_minutes(lineups, events) -> tuple[dict[int, float], dict[int, dict[str, float]]]:
    """Gespielte Minuten je Spieler inkl. Nachspielzeit, plus Minuten je Position."""
    period_len: dict[int, float] = {}
    for e in events:
        if e["type"]["name"] == "Half End":
            t = e["minute"] + e["second"] / 60 - PERIOD_START[e["period"]]
            period_len[e["period"]] = max(period_len.get(e["period"], 0), t)
    offsets, acc = {}, 0.0
    for p in sorted(period_len):
        offsets[p] = acc
        acc += period_len[p]
    last_period = max(period_len) if period_len else 2

    def to_played(clock: str | None, period: int | None) -> float:
        if clock is None or period is None:
            return acc
        period = min(period, last_period)
        return offsets.get(period, 0) + min(
            clock_to_minutes(clock) - PERIOD_START[period], period_len.get(period, 0)
        )

    minutes: dict[int, float] = {}
    positions: dict[int, dict[str, float]] = {}
    for team in lineups:
        for pl in team["lineup"]:
            intervals = []
            for pos in pl["positions"]:
                start = to_played(pos["from"], pos["from_period"])
                end = to_played(pos["to"], pos["to_period"])
                if end > start:
                    intervals.append((start, end))
                    pos_short = POSITIONS.get(pos["position"], "?")
                    per_pos = positions.setdefault(pl["player_id"], {})
                    per_pos[pos_short] = round(per_pos.get(pos_short, 0) + end - start, 1)
            total, cur_end = 0.0, -1.0
            for s, e in sorted(intervals):
                s = max(s, cur_end)
                if e > s:
                    total += e - s
                    cur_end = e
            if total > 0:
                minutes[pl["player_id"]] = round(total, 1)
    return minutes, positions


def find_pre_assist(events: list[dict], pos: int) -> dict | None:
    """Läuft vom Assist-Pass (events[pos]) rückwärts und sucht den Pass, der zum Assistgeber kam."""
    assist = events[pos]
    team_id = assist["team"]["id"]
    assister_id = assist["player"]["id"]
    for e in reversed(events[:pos]):
        if e.get("possession") != assist["possession"]:
            return None
        etype = e["type"]["name"]
        if e.get("team", {}).get("id") != team_id:
            if etype in OPPONENT_CONTROL:
                return None
            continue
        player_id = e.get("player", {}).get("id")
        if etype == "Pass":
            p = e["pass"]
            if p.get("outcome") is None and p.get("recipient", {}).get("id") == assister_id \
                    and player_id != assister_id:
                return e
            return None
        if player_id is None:
            continue
        if player_id != assister_id or etype in ATTACKER_BREAK:
            return None
    return None


def loc(values):
    return [round(v, 1) for v in values[:2]] if values else None


def pass_info(e: dict) -> dict:
    p = e["pass"]
    return {
        "player": e["player"]["id"],
        "start": loc(e["location"]),
        "end": loc(p["end_location"]),
        "height": p.get("height", {}).get("name"),
        "type": p.get("type", {}).get("name"),
        "technique": p.get("technique", {}).get("name"),
        "cross": bool(p.get("cross")),
        "through": bool(p.get("through_ball")) or p.get("technique", {}).get("name") == "Through Ball",
        "cutback": bool(p.get("cut_back")),
        "minute": e["minute"],
        "second": e["second"],
    }


def process_match(match: dict) -> dict:
    mid = match["match_id"]
    cache_file = CACHE_DIR / f"{mid}.json"
    if cache_file.exists():
        cached = json.loads(cache_file.read_text())
        if cached.get("v") == CACHE_VERSION:
            return cached

    events = fetch_json(f"events/{mid}.json")
    lineups = fetch_json(f"lineups/{mid}.json")
    events.sort(key=lambda e: e["index"])
    by_id = {e["id"]: e for e in events}
    position = {e["id"]: i for i, e in enumerate(events)}

    players = {}
    for team in lineups:
        for pl in team["lineup"]:
            players[pl["player_id"]] = {
                "name": pl.get("player_nickname") or pl["player_name"],
                "full_name": pl["player_name"],
                "team": team["team_id"],
                "country": (pl.get("country") or {}).get("name"),
            }

    goals = []
    for e in events:
        if e["type"]["name"] != "Shot" or e["shot"]["outcome"]["name"] != "Goal":
            continue
        shot = e["shot"]
        assist = by_id.get(shot.get("key_pass_id"))
        pre = find_pre_assist(events, position[assist["id"]]) if assist else None
        goals.append({
            "id": e["id"],
            "team": e["team"]["id"],
            "period": e["period"],
            "minute": e["minute"],
            "second": e["second"],
            "scorer": e["player"]["id"],
            "xg": round(shot.get("statsbomb_xg", 0), 3),
            "shot": {
                "start": loc(e["location"]),
                "end": loc(shot.get("end_location")),
                "body": shot.get("body_part", {}).get("name"),
                "type": shot.get("type", {}).get("name"),
            },
            "pattern": e["play_pattern"]["name"],
            "assist": pass_info(assist) if assist else None,
            "pre": pass_info(pre) if pre else None,
        })

    minutes, positions = played_minutes(lineups, events)
    result = {
        "v": CACHE_VERSION,
        "match": {
            "id": mid,
            "date": match["match_date"],
            "week": match.get("match_week"),
            "home": match["home_team"]["home_team_id"],
            "away": match["away_team"]["away_team_id"],
            "home_score": match["home_score"],
            "away_score": match["away_score"],
        },
        "teams": {str(match["home_team"]["home_team_id"]): match["home_team"]["home_team_name"],
                  str(match["away_team"]["away_team_id"]): match["away_team"]["away_team_name"]},
        "players": players,
        "minutes": minutes,
        "positions": positions,
        "goals": goals,
    }
    cache_file.write_text(json.dumps(result))
    return result


def build_season(cfg: dict) -> dict:
    matches = fetch_json(f"matches/{cfg['competition_id']}/{cfg['season_id']}.json")
    print(f"{cfg['slug']}: {len(matches)} Spiele", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(process_match, matches))
    results.sort(key=lambda r: (r["match"]["date"], r["match"]["id"]))

    teams: dict[str, str] = {}
    player_meta: dict[int, dict] = {}
    team_counts: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    stats: dict[int, dict] = defaultdict(lambda: {
        "goals": 0, "assists": 0, "preAssists": 0, "preAssistXg": 0.0,
        "assistXg": 0.0, "minutes": 0.0, "matches": 0,
        "positions": defaultdict(float),
    })
    goals_out = []

    for r in results:
        teams.update(r["teams"])
        for pid_str, meta in r["players"].items():
            pid = int(pid_str)
            player_meta[pid] = meta
        for pid_str, mins in r["minutes"].items():
            pid = int(pid_str)
            stats[pid]["minutes"] += mins
            stats[pid]["matches"] += 1
            team_counts[pid][r["players"][pid_str]["team"]] += 1
            for pos, pm in r["positions"].get(pid_str, {}).items():
                stats[pid]["positions"][pos] += pm
        m = r["match"]
        for g in r["goals"]:
            stats[g["scorer"]]["goals"] += 1
            if g["assist"]:
                stats[g["assist"]["player"]]["assists"] += 1
                stats[g["assist"]["player"]]["assistXg"] += g["xg"]
            if g["pre"]:
                stats[g["pre"]["player"]]["preAssists"] += 1
                stats[g["pre"]["player"]]["preAssistXg"] += g["xg"]
            goals_out.append({**g, "match": m["id"]})

    def player_team(pid: int) -> int:
        counts = team_counts.get(pid)
        if counts:
            return max(counts.items(), key=lambda kv: kv[1])[0]
        return player_meta[pid]["team"]

    players_out = []
    for pid, s in stats.items():
        if pid not in player_meta:
            continue
        if cfg["coverage"] == "team" and teams.get(str(player_team(pid))) != cfg["coverage_team"]:
            continue  # bei Teil-Abdeckung nur Spieler des abgedeckten Teams listen
        if not (s["goals"] or s["assists"] or s["preAssists"]):
            continue
        meta = player_meta[pid]
        players_out.append({
            "id": pid,
            "slug": f"{pid}-{slugify(meta['name'])}",
            "name": meta["name"],
            "fullName": meta["full_name"],
            "team": player_team(pid),
            "goals": s["goals"],
            "assists": s["assists"],
            "preAssists": s["preAssists"],
            "involvements": s["goals"] + s["assists"] + s["preAssists"],
            "preAssistXg": round(s["preAssistXg"], 2),
            "assistXg": round(s["assistXg"], 2),
            "minutes": round(s["minutes"]),
            "matches": s["matches"],
            "position": max(s["positions"].items(), key=lambda kv: kv[1])[0] if s["positions"] else None,
            "country": COUNTRY_CODES.get(meta.get("country") or "", None),
            "countryName": meta.get("country"),
        })
    players_out.sort(key=lambda p: (-p["preAssists"], -p["involvements"], p["name"]))

    referenced = {p["id"] for p in players_out}
    for g in goals_out:
        referenced.add(g["scorer"])
        if g["assist"]:
            referenced.add(g["assist"]["player"])
        if g["pre"]:
            referenced.add(g["pre"]["player"])
    names = {str(pid): player_meta[pid]["name"] for pid in referenced if pid in player_meta}

    matches_out = {str(r["match"]["id"]): r["match"] for r in results}
    meta = {
        "slug": cfg["slug"], "name": cfg["name"], "country": cfg["country"],
        "season": cfg["season"], "coverage": cfg["coverage"],
        "coverageTeam": cfg.get("coverage_team"),
        "matches": len(results), "goals": len(goals_out),
        "assists": sum(1 for g in goals_out if g["assist"]),
        "preAssists": sum(1 for g in goals_out if g["pre"]),
    }
    return {
        "meta": meta, "teams": teams, "names": names, "players": players_out,
        "matches": matches_out, "goals": goals_out,
    }


def main():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "seasons").mkdir(parents=True, exist_ok=True)
    index = []
    for cfg in SEASONS:
        season = build_season(cfg)
        (OUT_DIR / "seasons" / f"{cfg['slug']}.json").write_text(
            json.dumps(season, ensure_ascii=False, separators=(",", ":"))
        )
        index.append(season["meta"])
        m = season["meta"]
        print(f"  Tore {m['goals']}, Assists {m['assists']}, Pre-Assists {m['preAssists']}",
              file=sys.stderr)
    (OUT_DIR / "competitions.json").write_text(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
