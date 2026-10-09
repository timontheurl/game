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
import os
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import OUT_DIR, ROOT, SEASONS, fetch_json, find_pre_assist  # noqa: E402

CACHE_DIR = Path(__file__).resolve().parent / ".cache" / "szenen"
SCENE_DIR = ROOT / "web" / "public" / "daten" / "szenen"
CACHE_VERSION = 5

NAMES_EN = {
    "WM": "World Cup",
    "EM": "Euro",
    "Frauen-WM": "Women's World Cup",
    "Frauen-Bundesliga": "Frauen-Bundesliga",
}

RESTART = {"Corner": "corner", "Throw-in": "throw-in", "Free Kick": "free-kick"}
PARTICLES = {
    "van", "von", "de", "den", "da", "dos", "das", "del", "der", "di", "du", "le", "la", "lo", "ter", "ten",
    "mac", "al", "el", "bin", "ben", "abu", "aït", "san", "santa", "della", "dalla", "dal", "degli", "st", "st.",
}
SUFFIXES = {"jr", "jr.", "júnior", "junior", "filho", "neto", "ii", "iii"}
# Koreanische Namen stehen bei StatsBomb oft Familienname zuerst („Son Heung-Min“)
KOREAN = set("Son Ki Lee Kim Park Jung Hwang Cho Ji Choe Choi Jang Na Ju Yun Hong Kwon Paik Jeong Yoon Moon Ko Koo Oh Seo Shin Song Han Lim Kang Ryu Shim Woo Bae Yang Jo".split())
# Spanischsprachige Namen: der erste Nachname ist der Rufname („Marco Asensio Willemsen“)
SPANISH = {
    "Spain", "Argentina", "Mexico", "Colombia", "Chile", "Uruguay", "Paraguay", "Peru", "Ecuador", "Venezuela",
    "Bolivia", "Costa Rica", "Honduras", "Panama", "Guatemala", "El Salvador", "Cuba", "Dominican Republic",
    "Nicaragua", "Equatorial Guinea",
}
# Bekannte Rufnamen, die sich aus dem vollen Namen nicht ableiten lassen
OVERRIDES = {
    "João Miranda de Souza Filho": "Miranda", "Anderson Hernanes de Carvalho Andrade": "Hernanes",
    "Marco Asensio Willemsen": "Asensio", "Mauricio Ricardo Pinilla Ferreira": "Pinilla",
    "Dieumerci Mbokani Bezua": "Mbokani", "Jacques Zoua Daogari": "Zoua",
    "Théo Bongonda Mbul'Ofeko Batombo": "Bongonda", "Wanderson Maciel Sousa Campos": "Wanderson",
    "Javier Hernández Balcázar": "Chicharito", "Yahia Attiyat allah": "Attiyat Allah",
    "Andrei Burcă Andonie": "Burcă", "Jon Ansotegi Gorostola": "Ansotegi", "Jussiê Ferreira Vieira": "Jussiê",
    "Beatriz Zaneratto João": "Bia Zaneratto", "Kerolin Nicoli Israel Ferraz": "Kerolin",
    "Luana Bertolucci Paixão": "Luana", "Antonia Ronnycleide da Costa Silva": "Antônia",
    "Lauren Eduarda Leal Costa": "Lauren", "Adriana Leal da Silva": "Adriana",
    "Tamires Cássia Dias de Britto": "Tamires", "Leicy Maria Santos Herrera": "Leicy Santos",
    "Ana María Guzmán Zapata": "Ana Guzmán", "Lorena Bedoya Durango": "Bedoya", "Randal Kolo": "Kolo Muani",
    "Arthur Augusto de Matos Soares": "Arthur", "Vinícius José Paixão de Oliveira Júnior": "Vinícius",
}

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


def short_name(name: str, full: str | None = None, country: str | None = None) -> str:
    """Rufname für das Spielfeld: „Mesut Özil“ -> „Özil“, „Virgil van Dijk“ -> „van Dijk“,
    „Son Heung-Min“ -> „Son“, „Marco Asensio Willemsen“ -> „Asensio“, „Vinícius Júnior“ -> „Vinícius“."""
    for n in (name, full):
        if n and n in OVERRIDES:
            return OVERRIDES[n]
    parts = name.split()
    if len(parts) <= 1:
        return name
    # Koreanisch: Familienname vorn, Vorname mit Bindestrich
    if len(parts) == 2 and parts[0] in KOREAN and ("-" in parts[1] or parts[1][:1].isupper()) and (
            "-" in parts[1] or (full and full.split()[-1] == parts[0])):
        return parts[0]
    # Zusätze wie Júnior/Filho weglassen
    if parts[-1].lower() in SUFFIXES:
        rest = parts[:-1]
        return rest[0] if len(rest) == 1 else short_name(" ".join(rest), None, country)
    # Spanische Doppelnamen ohne Spitznamen: erster Nachname
    if country in SPANISH and len(parts) >= 3 and parts[1].lower() not in PARTICLES and parts[-2].lower() not in PARTICLES:
        return parts[1]
    out = [parts[-1]]
    i = len(parts) - 2
    while i > 0 and parts[i].lower() in PARTICLES:
        out.insert(0, parts[i])
        i -= 1
    if i == 0 and parts[0].lower() in PARTICLES:
        return name  # „De la Calzada“
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
        try:
            cached = json.loads(cache_file.read_text())
            if cached.get("v") == CACHE_VERSION and set(cached["goals"]) >= goal_ids:
                return cached
        except (json.JSONDecodeError, KeyError, OSError):
            pass  # kaputte Datei: neu laden

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
                "full": pl["player_name"],
                "nick": bool(pl.get("player_nickname")),
                "country": (pl.get("country") or {}).get("name"),
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
                hi = position[e["id"]]
                # Wo Mitspieler zuletzt am Ball waren (gleiche Ballbesitzphase) – echte Positionen
                # für alle, die der Freeze Frame des Schusses nicht zeigt
                touches: dict[int, dict] = {}
                for t in events[:hi]:
                    if t.get("possession") == e["possession"] and t["team"]["id"] == e["team"]["id"] \
                            and t.get("player") and t.get("location"):
                        touches[t["player"]["id"]] = {
                            "at": t["location"][:2],
                            "keeper": (t.get("position") or {}).get("name") == "Goalkeeper",
                        }
                goals[e["id"]] = {
                    "team": e["team"]["id"],
                    "touches": [{"player": pid, **t} for pid, t in touches.items()],
                    "period": e["period"],
                    "minute": e["minute"],
                    "score": {str(k): v for k, v in score.items()},
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
    tmp = cache_file.with_suffix(".tmp")
    tmp.write_text(json.dumps(result))
    os.replace(tmp, cache_file)  # nie eine halb geschriebene Datei hinterlassen
    return result


# ---------- Szene bauen ----------

def label(kind: str, frm, to, name: str, restart: str | None, air: bool) -> dict:
    if restart == "corner":
        return {"de": f"Ecke auf {name}", "en": f"Corner to {name}"}
    if restart == "throw-in":
        return {"de": f"Einwurf zu {name}", "en": f"Throw-in to {name}"}
    if restart == "free-kick":
        return {"de": f"Freistoß auf {name}", "en": f"Free kick to {name}"}
    dx, dy = to[0] - frm[0], to[1] - frm[1]
    # Richtung zuerst: steil nur, wenn der Pass wirklich nach vorn geht
    forward = dx > 8 and dx >= 0.7 * abs(dy)
    back = dx < -5
    # Hohe Bälle: bei ausgedachten Optionen immer, beim echten Pass ab 28 m
    lob = air and (kind != "real" or dist(frm, to) > 28)
    if lob:
        if back:
            return {"de": f"Hoch zurück zu {name}", "en": f"Lofted back to {name}"}
        if not forward and abs(dy) > 25:
            return {"de": f"Diagonal auf {name}", "en": f"Switch to {name}"}
        return {"de": f"Hoch auf {name}", "en": f"Lofted to {name}"}
    if forward:
        return {"de": f"Steil auf {name}", "en": f"Forward to {name}"}
    if back:
        return {"de": f"Zurück zu {name}", "en": f"Back to {name}"}
    return {"de": f"Quer zu {name}", "en": f"Across to {name}"}


def build_scene(gid: str, g: dict, players: dict, meta: dict) -> dict | None:
    pre, assist, shot = g["pre"], g["assist"], g["shot"]
    P, A, S = str(pre["player"]), str(assist["player"]), str(g["scorer"])
    if A == P or A == S:
        return None
    pl = lambda pid: players.get(str(pid)) or {}  # noqa: E731
    def name(pid) -> str:
        p = pl(pid)
        # Spanische Doppelnamen-Regel nur ohne StatsBomb-Spitznamen
        return short_name(p.get("name") or "?", p.get("full"), None if p.get("nick") else p.get("country"))

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
    own_keepers: set[str] = set()  # eigener Torwart steht auf dem Feld, ist aber keine Passoption
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
            if f["keeper"]:
                own_keepers.add(k)
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
        if t.get("keeper"):
            own_keepers.add(k)
    others = [k for k in others if k not in own_keepers]

    # Gleiche Kurznamen in einer Szene unterscheiden: „E. Hazard“ / „T. Hazard“
    pid_of = {k: pid for pid, k in key_of.items()}
    by_name: dict[str, list[str]] = defaultdict(list)
    for k, n in names.items():
        by_name[n].append(k)
    for n, ks in by_name.items():
        if len(ks) > 1:
            firsts = {k: (pl(pid_of[k]).get("full") or pl(pid_of[k]).get("name") or n).split()[0] for k in ks}
            initials = {f[0] for f in firsts.values()}
            for k in ks:
                # Gleiche Initiale („Lucas/Luka …“): ganzer Vorname
                names[k] = f"{firsts[k][0]}. {n}" if len(initials) == len(ks) else f"{firsts[k]} {n}"
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

    # Wer zu nah an jemandem steht, rückt auf den nächsten freien Platz im Umkreis
    placed: list[Pt] = [you] + [mates[k] for k in fixed if k != "you"] + [opps[0]]

    def room(p) -> float:
        return min((dist(p, q) for q in placed), default=99.0)

    for ref in movable:
        p = get(ref)
        if room(p) < 3.0:
            best_p, best_r = p, room(p)
            for radius in (3.2, 4.5, 6.0, 8.0):
                for step in range(16):
                    a = math.radians(step * 22.5)
                    c = [p[0] + math.cos(a) * radius, p[1] + math.sin(a) * radius]
                    if not (0.5 <= c[0] <= 120 and 0.5 <= c[1] <= 79.5):
                        continue
                    r_ = room(c)
                    if r_ > best_r:
                        best_p, best_r = c, r_
                if best_r >= 3.0:
                    break
            p = clamp_pitch(best_p)
            put(ref, p)
        placed.append(p)

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

    # Wie eng steht ein Gegner an der echten Passbahn? Ein Fehlpass muss klar enger sein,
    # sonst rollt der echte Ball sichtbar durch einen Gegner, während eine Option „Fehlpass“ heißt
    real_lane = math.inf if pre["high"] else min(
        (lane_dist(o, you, pos[kA], 0.2, 0.85)[0] for o in opps[1:] if dist(o, you) > 3), default=math.inf)

    P_, A_, S_ = names["you"], names[kA], names[kS]
    when = clock(g["period"], g["minute"])
    first_de = {
        "throw-in": f"{P_} wirft zu {A_}",
        "corner": f"{P_} bringt die Ecke auf {A_}",
        "free-kick": f"{P_} spielt den Freistoß auf {A_}",
    }.get(restart or "", f"{P_} spielt {A_} an")
    first_en = {
        "throw-in": f"{P_} throws it to {A_}",
        "corner": f"{P_} plays the corner to {A_}",
        "free-kick": f"{P_} plays the free kick to {A_}",
    }.get(restart or "", f"{P_} finds {A_}")
    if S != P:
        real_de = f"Pre-Assist! So war's: {first_de}, {A_} legt auf (Assist), {S_} trifft ({when})."
        real_en = f"Pre-assist! That's how it went: {first_en}, {A_} sets it up (assist), {S_} scores ({when})."
    else:
        real_de = f"Pre-Assist! So war's: {first_de}, {A_} spielt zurück (Assist), {P_} trifft selbst ({when})."
        real_en = f"Pre-assist! That's how it went: {first_en}, {A_} plays it back (assist), {P_} scores ({when})."

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

        # Ausgedachte Einwürfe und Ecken müssen machbar sein
        max_len = 30 if restart == "throw-in" else 45 if restart == "corner" else 80

        def separated(p) -> bool:
            if dist(you, p) < 4 or dist(you, p) > max_len:
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
                    "de": f"Das wäre schon der Assist gewesen: Ein direkter Pass auf {S_} ist selbst die Vorlage. Tatsächlich lief es über {A_}.",
                    "en": f"That would already have been the assist: a direct pass to {S_} is the assist itself. In reality it went via {A_}.",
                },
            })
            targets.append(pos[kS])
        else:
            # Sonst: ein anderer Mitspieler nah am Tor schießt selbst -> Assist
            near = sorted(
                (k for k in others if dist(pos[k], [120, 40]) < min(near_goal, 28) and pos[k][0] >= 94 and separated(pos[k])),
                key=lambda k: (lane_blocked(you, pos[k]), dist(pos[k], [120, 40])),
            )
            if near:
                k = near[0]
                used.add(k)
                step, air = pass_to(k)
                how_de = f"Tatsächlich spielte {P_} den Doppelpass mit {A_}." if S == P else f"Tatsächlich lief es über {A_} zu {S_}."
                how_en = f"In reality {P_} played a one-two with {A_}." if S == P else f"In reality it went via {A_} to {S_}."
                options.append({
                    "label": label("assist", you, pos[k], names[k], restart, air),
                    "expect": "assist",
                    "steps": [step, {"k": "shot", "who": k, "to": goal_at, "result": "goal"}],
                    "explain": {
                        "de": f"Das wäre schon der Assist gewesen, wenn {names[k]} direkt getroffen hätte. {how_de}",
                        "en": f"That would already have been the assist if {names[k]} had scored first time. {how_en}",
                    },
                })
                targets.append(pos[k])

        # Über einen anderen Mitspieler -> zu früh
        def early_ok(k) -> bool:
            p = pos[k]
            return k not in used and min_d <= dist(you, p) <= 60 and separated(p) and dist(p, pos[kA]) >= min_d - 1

        cands = sorted(
            (k for k in others if early_ok(k)),
            key=lambda k: (lane_blocked(you, pos[k]) or lane_blocked(pos[k], pos[kA]), abs(dist(you, pos[k]) - 18)),
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
                    "de": f"Zu früh: Dann wäre der Pass von {names[k]} auf {A_} der Pre-Assist gewesen. Tatsächlich spielte {P_} direkt auf {A_}.",
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
                if d < lost_lane and d + 1.0 < real_lane and dist(o, you) > 3:
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
                    "de": f"Fehlpass: Ein Gegenspieler steht in der Passbahn zu {names[k]}. Tatsächlich spielte {P_} auf {A_}.",
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
    # Spielstand vor dem Tor; Schlüssel sind Team-IDs als Text (auch nach dem Zwischenspeichern)
    sc = {str(k): v for k, v in g["score"].items()}
    h, a = sc.get(str(meta["home_id"]), 0), sc.get(str(meta["away_id"]), 0)
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
            "home": home,
            "away": away,
            # Nationalteams: Flaggen-Code, die Website zeigt daraus den Ländernamen in ihrer Sprache
            **({"homeCode": meta["codes"][str(meta["home_id"])]} if str(meta["home_id"]) in meta["codes"] else {}),
            **({"awayCode": meta["codes"][str(meta["away_id"])]} if str(meta["away_id"]) in meta["codes"] else {}),
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

def build_season_scenes(cfg: dict, failed: list[int] | None = None) -> list[dict]:
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
            if failed is not None:
                failed.append(mid)
            continue
        m = season["matches"][str(mid)]
        meta = {
            "slug": cfg["slug"], "competition": cfg["name"], "season": cfg["season"],
            "home": teams.get(str(m["home"]), "?"), "away": teams.get(str(m["away"]), "?"),
            "home_id": m["home"], "away_id": m["away"],
            "home_score": m["home_score"], "away_score": m["away_score"],
            "date": m["date"], "teams": teams,
            "codes": {tid: c["code"] for tid, c in (season.get("teamCodes") or {}).items()},
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
    failed: list[int] = []
    for cfg in SEASONS:
        scenes = build_season_scenes(cfg, failed)
        if not scenes:
            (SCENE_DIR / f"{cfg['slug']}.json").unlink(missing_ok=True)
            continue
        (SCENE_DIR / f"{cfg['slug']}.json").write_text(json.dumps(scenes, ensure_ascii=False, separators=(",", ":")))
        index.append({
            "slug": cfg["slug"],
            "name": {"de": f"{cfg['name']} {cfg['season']}", "en": f"{NAMES_EN.get(cfg['name'], cfg['name'])} {cfg['season']}"},
            "count": len(scenes),
        })
    (SCENE_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))
    if failed:
        # Lieber den Daten-PR anhalten als still Szenen verlieren.
        print(f"{len(failed)} Spiele fehlgeschlagen: {failed[:20]}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
