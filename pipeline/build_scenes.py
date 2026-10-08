"""Spielszenen für „Finde den Pre-Assist“ aus echten Toren.

Aufruf:  python3 pipeline/build_scenes.py        (nach build_data.py)
Ausgabe: web/public/daten/szenen/<slug>.json und web/public/daten/szenen/index.json

Jedes Tor mit Pre-Assist wird zu einer Szene: Du bist der echte Vorbereiter, die richtige
Antwort ist der echte Pass. Die übrigen Spieler stehen dort, wo sie StatsBomb im Moment
des Torschusses erfasst hat (Freeze Frame) – mit Namen und Rückennummern.
Die anderen Optionen sind „Was wäre wenn“ nach den Regeln der Methodik:
  - direkt auf den Torschützen  -> wäre schon der Assist gewesen
  - über einen anderen Mitspieler -> wäre zu früh gewesen
  - in eine Passbahn mit Gegner   -> Fehlpass
"""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import OUT_DIR, ROOT, SEASONS, fetch_json, find_pre_assist  # noqa: E402

CACHE_DIR = Path(__file__).resolve().parent / ".cache" / "szenen"
SCENE_DIR = ROOT / "web" / "public" / "daten" / "szenen"
CACHE_VERSION = 4

NAMES_EN = {
    "WM": "World Cup",
    "EM": "Euro",
    "Frauen-WM": "Women's World Cup",
    "Frauen-Bundesliga": "Frauen-Bundesliga",
}

RESTART = {"Corner": "corner", "Throw-in": "throw-in", "Free Kick": "free-kick"}
PARTICLES = {"van", "von", "de", "da", "dos", "das", "del", "der", "di", "du", "le", "la", "ter", "ten", "mac", "al", "el", "bin"}

Pt = list  # [x, y]


# ---------- Hilfen ----------

def r1(v: float) -> float:
    return round(v + 0.0, 1)


def pt(p) -> Pt:
    return [r1(p[0]), r1(p[1])]


def dist(a, b) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def lane_dist(p, a, b, lo=0.12, hi=0.88) -> tuple[float, float]:
    """Abstand von p zur Strecke a–b (nur Inneres) und Anteil t der Projektion."""
    vx, vy = b[0] - a[0], b[1] - a[1]
    l2 = vx * vx + vy * vy or 1.0
    t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2
    if t < lo or t > hi:
        return math.inf, t
    return math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1]), t


def angle(a, b) -> float:
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def angle_gap(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def short_name(name: str) -> str:
    """„Mesut Özil“ -> „Özil“, „Virgil van Dijk“ -> „van Dijk“; Spitznamen bleiben."""
    parts = name.split()
    if len(parts) <= 1:
        return name
    out = [parts[-1]]
    i = len(parts) - 2
    while i > 0 and parts[i].lower() in PARTICLES:
        out.insert(0, parts[i])
        i -= 1
    s = " ".join(out)
    return s if len(s) <= 16 else parts[-1]


def clock(period: int, minute: int) -> str:
    """Spielminute wie auf der Website: 38', 45+2'."""
    limit = {1: 45, 2: 90, 3: 105, 4: 120}.get(period)
    if limit is not None and minute >= limit:
        return f"{limit}+{minute - limit + 1}'"
    return f"{minute + 1}'"


def in_goal(p) -> Pt:
    """Torschuss-Ziel sicher ins Tor legen (Daten enden manchmal knapp davor)."""
    return [120.0, r1(min(43.6, max(36.4, p[1])))]


def clamp_pitch(p) -> Pt:
    return [r1(min(120, max(0.5, p[0]))), r1(min(79.5, max(0.5, p[1])))]


# ---------- Rohdaten eines Spiels ----------

def match_scenes(mid: int, goal_ids: set[str]) -> dict:
    """Lädt Events und Aufstellungen und liefert je Tor-ID die Rohdaten für die Szene."""
    cache_file = CACHE_DIR / f"{mid}.json"
    if cache_file.exists():
        cached = json.loads(cache_file.read_text())
        if cached.get("v") == CACHE_VERSION and set(cached["goals"]) >= goal_ids:
            return cached

    events = fetch_json(f"events/{mid}.json")
    lineups = fetch_json(f"lineups/{mid}.json")
    events.sort(key=lambda e: e["index"])
    by_id = {e["id"]: e for e in events}
    position = {e["id"]: i for i, e in enumerate(events)}

    players = {}
    for team in lineups:
        for pl in team["lineup"]:
            players[str(pl["player_id"])] = {
                "name": pl.get("player_nickname") or pl["player_name"],
                "number": pl.get("jersey_number"),
                "team": team["team_id"],
            }

    goals = {}
    score: dict[int, int] = defaultdict(int)
    for e in events:
        etype = e["type"]["name"]
        is_goal = etype == "Shot" and e["shot"]["outcome"]["name"] == "Goal"
        if is_goal and e["id"] in goal_ids:
            shot = e["shot"]
            assist = by_id.get(shot.get("key_pass_id"))
            pre = find_pre_assist(events, position[assist["id"]]) if assist else None
            if assist and pre:
                lo, hi = position[pre["id"]], position[e["id"]]
                carries = [
                    {"player": c["player"]["id"], "start": c["location"][:2], "end": c["carry"]["end_location"][:2]}
                    for c in events[lo:hi]
                    if c["type"]["name"] == "Carry" and c["team"]["id"] == e["team"]["id"]
                ]
                # Wo Mitspieler zuletzt am Ball waren (gleiche Ballbesitzphase) – echte Positionen
                # für alle, die der Freeze Frame des Schusses nicht zeigt
                touches: dict[int, list] = {}
                for t in events[:hi]:
                    if t.get("possession") == e["possession"] and t["team"]["id"] == e["team"]["id"] \
                            and t.get("player") and t.get("location"):
                        touches[t["player"]["id"]] = t["location"][:2]
                goals[e["id"]] = {
                    "team": e["team"]["id"],
                    "touches": [{"player": pid, "at": at} for pid, at in touches.items()],
                    "period": e["period"],
                    "minute": e["minute"],
                    "score": dict(score),
                    "scorer": e["player"]["id"],
                    "shot": {"start": e["location"][:2], "end": (shot.get("end_location") or [120, 40])[:2]},
                    "assist": {
                        "player": assist["player"]["id"],
                        "start": assist["location"][:2],
                        "end": assist["pass"]["end_location"][:2],
                        "high": assist["pass"].get("height", {}).get("name") == "High Pass",
                    },
                    "pre": {
                        "player": pre["player"]["id"],
                        "start": pre["location"][:2],
                        "end": pre["pass"]["end_location"][:2],
                        "high": pre["pass"].get("height", {}).get("name") == "High Pass",
                        "type": (pre["pass"].get("type") or {}).get("name"),
                    },
                    "carries": carries,
                    "frame": [
                        {
                            "player": f["player"]["id"],
                            "keeper": (f.get("position") or {}).get("name") == "Goalkeeper",
                            "mate": bool(f.get("teammate")),
                            "at": f["location"][:2],
                        }
                        for f in (shot.get("freeze_frame") or [])
                        if f.get("player")
                    ],
                }
        # Spielstand mitzählen (auch Eigentore)
        if is_goal:
            score[e["team"]["id"]] += 1
        elif etype == "Own Goal For":
            score[e["team"]["id"]] += 1

    result = {"v": CACHE_VERSION, "players": players, "goals": goals}
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(result))
    return result


# ---------- Szene bauen ----------

def label(kind: str, frm, to, name: str, restart: str | None, air: bool) -> dict:
    if restart == "corner":
        return {"de": f"Ecke auf {name}", "en": f"Corner to {name}"}
    if restart == "throw-in":
        return {"de": f"Einwurf zu {name}", "en": f"Throw-in to {name}"}
    if restart == "free-kick":
        return {"de": f"Freistoß auf {name}", "en": f"Free kick to {name}"}
    dx = to[0] - frm[0]
    if air and dist(frm, to) > 28:
        return {"de": f"Hoch auf {name}", "en": f"Long ball to {name}"}
    if dx > 8:
        return {"de": f"Steil auf {name}", "en": f"Forward to {name}"}
    if dx < -5:
        return {"de": f"Zurück zu {name}", "en": f"Back to {name}"}
    return {"de": f"Quer zu {name}", "en": f"Across to {name}"}


def build_scene(gid: str, g: dict, players: dict, meta: dict) -> dict | None:
    pre, assist, shot = g["pre"], g["assist"], g["shot"]
    P, A, S = str(pre["player"]), str(assist["player"]), str(g["scorer"])
    if A == P or A == S:
        return None
    pl = lambda pid: players.get(str(pid)) or {}  # noqa: E731
    name = lambda pid: short_name(pl(pid).get("name") or "?")  # noqa: E731

    you = clamp_pitch(pre["start"])
    restart = RESTART.get(pre.get("type") or "")

    # Rückennummern als Schlüssel; ohne Nummer eine freie Zahl ab 90
    used_numbers: set[str] = set()

    def key_for(pid) -> str:
        n = pl(pid).get("number")
        k = str(n) if n is not None else None
        if not k or k in used_numbers:
            k = next(str(i) for i in range(90, 200) if str(i) not in used_numbers)
        used_numbers.add(k)
        return k

    mates: dict[str, Pt] = {}
    names: dict[str, str] = {"you": name(P)}
    key_of: dict[str, str] = {P: "you"}

    kA = key_for(A)
    key_of[A] = kA
    mates[kA] = clamp_pitch(pre["end"])
    names[kA] = name(A)
    if S != P:
        kS = key_for(S)
        key_of[S] = kS
        mates[kS] = clamp_pitch(assist["end"])
        names[kS] = name(S)
    else:
        kS = "you"

    opps: list[Pt] = []
    keeper: Pt | None = None
    others: list[str] = []
    for f in g["frame"]:
        pid = str(f["player"])
        at = clamp_pitch(f["at"])
        if f["mate"]:
            if pid in key_of:
                continue
            k = key_for(pid)
            key_of[pid] = k
            mates[k] = at
            names[k] = name(pid)
            others.append(k)
        elif f["keeper"]:
            keeper = at
        else:
            opps.append(at)
    for t in g.get("touches", []):
        pid = str(t["player"])
        if pid in key_of:
            continue
        k = key_for(pid)
        key_of[pid] = k
        mates[k] = clamp_pitch(t["at"])
        names[k] = name(pid)
        others.append(k)
    if keeper is None:
        keeper = [118.5, r1(min(44, max(36, shot["end"][1])))]
    opps = [keeper] + opps

    # Überlappungen sanft auflösen (Schlüsselspieler bleiben stehen)
    fixed = {"you", kA, kS}
    movable = [("m", k) for k in mates if k not in fixed] + [("o", i) for i in range(1, len(opps))]

    def get(ref):
        return mates[ref[1]] if ref[0] == "m" else opps[ref[1]]

    def put(ref, p):
        if ref[0] == "m":
            mates[ref[1]] = p
        else:
            opps[ref[1]] = p

    for _ in range(12):
        for n, ref in enumerate(movable):
            p = get(ref)
            others_now = [you] + [mates[k] for k in fixed if k != "you"] + [opps[0]] + [get(r) for r in movable if r != ref]
            for q in others_now:
                d = dist(p, q)
                if d >= 3.0:
                    continue
                if d < 0.01:
                    # genau übereinander: in eine feste, je Spieler andere Richtung schieben
                    a = math.radians(n * 137.5)
                    ux, uy = math.cos(a), math.sin(a)
                else:
                    ux, uy = (p[0] - q[0]) / d, (p[1] - q[1]) / d
                p = [p[0] + ux * (3.0 - d), p[1] + uy * (3.0 - d)]
                # am Rand nicht hinausschieben, sondern entlang der Linie ausweichen
                if not (0.5 <= p[0] <= 120 and 0.5 <= p[1] <= 79.5):
                    p = clamp_pitch(p)
                    p = [p[0] - uy * 1.5, p[1] + ux * 1.5]
                p = clamp_pitch(p)
            put(ref, p)

    pos = {"you": you, **mates}
    for i, o in enumerate(opps):
        pos[f"o{i}"] = o

    # Gemeinsamer Rest ab dem Assistgeber: Dribbling, Vorlage, Dribbling, Tor
    a_start = clamp_pitch(assist["start"])
    a_end = clamp_pitch(assist["end"])
    s_start = clamp_pitch(shot["start"])
    goal_at = in_goal(shot["end"])

    def finish_from_assist() -> list[dict]:
        steps = []
        if dist(pos[kA], a_start) > 1.5:
            steps.append({"k": "carry", "who": kA, "to": a_start})
        step = {"k": "pass", "from": kA, "to": kS}
        if dist(pos[kS], a_end) > 0.5:
            step["at"] = a_end
        if assist["high"]:
            step["air"] = True
        steps.append(step)
        if dist(a_end, s_start) > 1.5:
            steps.append({"k": "carry", "who": kS, "to": s_start})
        steps.append({"k": "shot", "who": kS, "to": goal_at, "result": "goal"})
        return steps

    def lane_blocked(a, b) -> bool:
        return any(lane_dist(o, a, b)[0] < 2.2 for o in opps[1:])

    P_, A_, S_ = names["you"], names[kA], names[kS]
    when = clock(g["period"], g["minute"])
    if S != P:
        real_de = f"Pre-Assist! So war's: {P_} spielt {A_} an, {A_} legt auf (Assist), {S_} trifft ({when})."
        real_en = f"Pre-assist! That's how it went: {P_} finds {A_}, {A_} sets it up (assist), {S_} scores ({when})."
    else:
        real_de = f"Pre-Assist! So war's: {P_} spielt {A_} an, {A_} spielt zurück (Assist), {P_} trifft selbst ({when})."
        real_en = f"Pre-assist! That's how it went: {P_} finds {A_}, {A_} plays it back (assist), {P_} scores ({when})."

    real_steps = [{"k": "pass", "from": "you", "to": kA, **({"air": True} if pre["high"] else {})}] + finish_from_assist()
    real_option = {
        "label": label("real", you, pos[kA], A_, restart, pre["high"]),
        "expect": "pre",
        "real": True,
        "steps": real_steps,
        "explain": {"de": real_de, "en": real_en},
    }

    def make_options(min_d: float, min_ang: float, lost_lane: float, near_goal: float) -> list[dict]:
        options = [real_option]
        targets = [pos[kA]]

        def separated(p) -> bool:
            if dist(you, p) < 4:
                return False
            return all(dist(p, q) >= min_d and angle_gap(angle(you, p), angle(you, q)) >= min_ang for q in targets)

        def pass_to(k):
            air = lane_blocked(you, pos[k]) or dist(you, pos[k]) > 32
            return {"k": "pass", "from": "you", "to": k, **({"air": True} if air else {})}, air

        used: set[str] = set()

        # Direkt auf den Torschützen -> wäre schon der Assist gewesen
        if S != P and separated(pos[kS]):
            step, air = pass_to(kS)
            options.append({
                "label": label("assist", you, pos[kS], S_, restart, air),
                "expect": "assist",
                "steps": [step, {"k": "shot", "who": kS, "to": goal_at, "result": "goal"}],
                "explain": {
                    "de": f"Das wäre schon der Assist gewesen: Ein direkter Pass auf {S_} ist selbst die Vorlage. Wirklich lief es über {A_}.",
                    "en": f"That would already have been the assist: a direct pass to {S_} is the assist itself. In reality it went via {A_}.",
                },
            })
            targets.append(pos[kS])
        else:
            # Sonst: ein anderer Mitspieler nah am Tor schießt selbst -> Assist
            near = sorted(
                (k for k in others if dist(pos[k], [120, 40]) < near_goal and separated(pos[k])),
                key=lambda k: dist(pos[k], [120, 40]),
            )
            if near:
                k = near[0]
                used.add(k)
                step, air = pass_to(k)
                how_de = f"Wirklich spielte {P_} den Doppelpass mit {A_}." if S == P else f"Wirklich lief es über {A_} zu {S_}."
                how_en = f"In reality {P_} played a one-two with {A_}." if S == P else f"In reality it went via {A_} to {S_}."
                options.append({
                    "label": label("assist", you, pos[k], names[k], restart, air),
                    "expect": "assist",
                    "steps": [step, {"k": "shot", "who": k, "to": goal_at, "result": "goal"}],
                    "explain": {
                        "de": f"Das wäre schon der Assist gewesen, wenn {names[k]} direkt trifft. {how_de}",
                        "en": f"That would already have been the assist if {names[k]} scores first time. {how_en}",
                    },
                })
                targets.append(pos[k])

        # Über einen anderen Mitspieler -> zu früh
        def early_ok(k) -> bool:
            p = pos[k]
            return k not in used and min_d <= dist(you, p) <= 60 and separated(p) and dist(p, pos[kA]) >= min_d - 1

        cands = sorted(
            (k for k in others if early_ok(k)),
            key=lambda k: (lane_blocked(pos[k], pos[kA]), abs(dist(you, pos[k]) - 18)),
        )
        if cands:
            k = cands[0]
            used.add(k)
            step, air = pass_to(k)
            on_air = lane_blocked(pos[k], pos[kA]) or dist(pos[k], pos[kA]) > 32
            options.append({
                "label": label("early", you, pos[k], names[k], restart, air),
                "expect": "early",
                "steps": [step, {"k": "pass", "from": k, "to": kA, **({"air": True} if on_air else {})}] + finish_from_assist(),
                "explain": {
                    "de": f"Zu früh: Dann wäre der Pass von {names[k]} auf {A_} der Pre-Assist gewesen. Wirklich spielte {P_} direkt auf {A_}.",
                    "en": f"Too early: then {names[k]}'s pass to {A_} would have been the pre-assist. In reality {P_} found {A_} directly.",
                },
            })
            targets.append(pos[k])

        # In eine Passbahn mit Gegner -> Fehlpass
        best = None
        for k in others:
            if k in used or not separated(pos[k]):
                continue
            for i, o in enumerate(opps[1:], start=1):
                d, t = lane_dist(o, you, pos[k], 0.2, 0.85)
                if d < lost_lane and dist(o, you) > 3:
                    score_ = d + abs(t - 0.5)
                    if best is None or score_ < best[0]:
                        vx, vy = pos[k][0] - you[0], pos[k][1] - you[1]
                        best = (score_, k, i, [r1(you[0] + vx * t), r1(you[1] + vy * t)])
        if best and len(options) < 4:
            _, k, i, at = best
            options.append({
                "label": label("lost", you, pos[k], names[k], restart, False),
                "expect": "lost",
                "steps": [{"k": "pass", "from": "you", "to": f"o{i}", "aim": k, "at": at}],
                "explain": {
                    "de": f"Fehlpass: Ein Gegenspieler steht in der Passbahn zu {names[k]}. Wirklich spielte {P_} auf {A_}.",
                    "en": f"Misplaced pass: an opponent is standing in the lane to {names[k]}. In reality {P_} played it to {A_}.",
                },
            })
        return options

    options: list[dict] = []
    for tier in [(6, 9, 2.5, 24), (5, 7, 3.0, 30), (4, 5, 3.5, 40), (3, 3, 4.0, 60)]:
        options = make_options(*tier)
        if len(options) >= 3:
            break
    if len(options) < 3:
        return None

    home, away = meta["home"], meta["away"]
    h, a = g["score"].get(meta["home_id"], 0), g["score"].get(meta["away_id"], 0)
    comp_de = f"{meta['competition']} {meta['season']}"
    comp_en = f"{NAMES_EN.get(meta['competition'], meta['competition'])} {meta['season']}"
    setup_de = f"{comp_de}, {when}, Stand {h}:{a}. {P_} hat den Ball."
    setup_en = f"{comp_en}, {when}, score {h}–{a}. {P_} has the ball."
    if restart == "corner":
        setup_de, setup_en = setup_de.replace("hat den Ball", "tritt die Ecke"), setup_en.replace("has the ball", "takes the corner")
    elif restart == "throw-in":
        setup_de, setup_en = setup_de.replace("hat den Ball", "wirft ein"), setup_en.replace("has the ball", "takes the throw-in")
    elif restart == "free-kick":
        setup_de, setup_en = setup_de.replace("hat den Ball", "führt den Freistoß aus"), setup_en.replace("has the ball", "takes the free kick")

    scene = {
        "id": f"{meta['slug']}-{gid[:8]}",
        "title": {"de": f"{home} – {away}", "en": f"{home} – {away}"},
        "setup": {"de": setup_de, "en": setup_en},
        **({"restart": restart} if restart else {}),
        "you": you,
        "mates": mates,
        "opps": opps,
        "names": names,
        "meta": {
            "competition": {"de": comp_de, "en": comp_en},
            "date": meta["date"],
            "minute": when,
            "team": meta["teams"].get(str(g["team"]), ""),
            "score": [h, a],
            "final": [meta["home_score"], meta["away_score"]],
        },
        "options": options,
    }
    return scene


# ---------- Ablauf ----------

def build_season_scenes(cfg: dict) -> list[dict]:
    season = json.loads((OUT_DIR / "seasons" / f"{cfg['slug']}.json").read_text())
    by_match: dict[int, set[str]] = defaultdict(set)
    for g in season["goals"]:
        if g.get("pre"):
            by_match[g["match"]].add(g["id"])
    teams = season["teams"]

    def work(mid):
        try:
            return mid, match_scenes(mid, by_match[mid])
        except Exception as exc:  # noqa: BLE001 – ein kaputtes Spiel soll den Rest nicht stoppen
            print(f"  Spiel {mid}: {exc}", file=sys.stderr)
            return mid, None

    with ThreadPoolExecutor(max_workers=8) as pool:
        raw = dict(pool.map(work, sorted(by_match)))

    scenes = []
    skipped = 0
    for mid in sorted(by_match):
        data = raw.get(mid)
        if not data:
            skipped += len(by_match[mid])
            continue
        m = season["matches"][str(mid)]
        meta = {
            "slug": cfg["slug"], "competition": cfg["name"], "season": cfg["season"],
            "home": teams.get(str(m["home"]), "?"), "away": teams.get(str(m["away"]), "?"),
            "home_id": m["home"], "away_id": m["away"],
            "home_score": m["home_score"], "away_score": m["away_score"],
            "date": m["date"], "teams": teams,
        }
        for gid in sorted(by_match[mid]):
            g = data["goals"].get(gid)
            scene = build_scene(gid, g, data["players"], meta) if g else None
            if scene:
                scenes.append(scene)
            else:
                skipped += 1
    print(f"{cfg['slug']}: {len(scenes)} Szenen, {skipped} übersprungen", file=sys.stderr)
    return scenes


def main():
    SCENE_DIR.mkdir(parents=True, exist_ok=True)
    index = []
    for cfg in SEASONS:
        scenes = build_season_scenes(cfg)
        if not scenes:
            continue
        (SCENE_DIR / f"{cfg['slug']}.json").write_text(json.dumps(scenes, ensure_ascii=False, separators=(",", ":")))
        index.append({
            "slug": cfg["slug"],
            "name": {"de": f"{cfg['name']} {cfg['season']}", "en": f"{NAMES_EN.get(cfg['name'], cfg['name'])} {cfg['season']}"},
            "count": len(scenes),
        })
    (SCENE_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
