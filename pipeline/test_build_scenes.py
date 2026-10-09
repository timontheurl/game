"""Tests für die Spielszenen aus echten Toren.

Aufruf:  python3 -m unittest discover -s pipeline
"""

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import build_scenes
from build_scenes import build_scene, clock, in_goal, match_scenes, short_name

PLAYERS = {
    "1": {"name": "Mesut Özil", "number": 11, "team": 1},
    "2": {"name": "Aaron Ramsey", "number": 16, "team": 1},
    "3": {"name": "Olivier Giroud", "number": 12, "team": 1},
    "4": {"name": "Alexis Sánchez", "number": 17, "team": 1},
    "5": {"name": "Santi Cazorla", "number": 19, "team": 1},
    "9": {"name": "Wes Morgan", "number": 5, "team": 2},
    "10": {"name": "Kasper Schmeichel", "number": 1, "team": 2},
}

META = {
    "slug": "test", "competition": "Premier League", "season": "2015/16",
    "home": "Arsenal", "away": "Leicester City", "home_id": 1, "away_id": 2,
    "home_score": 2, "away_score": 1, "date": "2016-02-14", "teams": {"1": "Arsenal", "2": "Leicester City"}, "codes": {},
}


def goal(**over):
    g = {
        "team": 1, "period": 2, "minute": 94, "score": {"1": 1, "2": 1}, "scorer": 3,
        "shot": {"start": [113, 38], "end": [120, 40]},
        "assist": {"player": 2, "start": [100, 20], "end": [112, 38], "high": True},
        "pre": {"player": 1, "start": [80, 30], "end": [98, 18], "high": False, "type": None},
        "frame": [
            {"player": 4, "keeper": False, "mate": True, "at": [104, 60]},
            {"player": 5, "keeper": False, "mate": True, "at": [78, 50]},
            {"player": 9, "keeper": False, "mate": False, "at": [90, 26]},
            {"player": 10, "keeper": True, "mate": False, "at": [118, 40]},
        ],
        "touches": [],
    }
    g.update(over)
    return g


class HelpersTest(unittest.TestCase):
    def test_short_name(self):
        self.assertEqual(short_name("Mesut Özil"), "Özil")
        self.assertEqual(short_name("Virgil van Dijk"), "van Dijk")
        self.assertEqual(short_name("Neymar"), "Neymar")
        self.assertEqual(short_name("Hatem Ben Arfa"), "Ben Arfa")
        self.assertEqual(short_name("Vinícius Júnior"), "Vinícius")
        self.assertEqual(short_name("Son Heung-Min"), "Son")
        self.assertEqual(short_name("Marco Asensio Willemsen", country="Spain"), "Asensio")
        self.assertEqual(short_name("Sergio Ramos García", country="Spain"), "Ramos")
        self.assertEqual(short_name("Kevin De Bruyne"), "De Bruyne")

    def test_clock(self):
        self.assertEqual(clock(1, 37), "38'")
        self.assertEqual(clock(2, 93), "90+4'")
        self.assertEqual(clock(1, 46), "45+2'")

    def test_in_goal(self):
        self.assertEqual(in_goal([118.2, 50]), [120.0, 43.6])
        self.assertEqual(in_goal([120, 38]), [120.0, 38.0])


class BuildSceneTest(unittest.TestCase):
    def test_real_option_is_the_pre_assist(self):
        scene = build_scene("abcdef123456", goal(), PLAYERS, META)
        self.assertIsNotNone(scene)
        real = [o for o in scene["options"] if o.get("real")]
        self.assertEqual(len(real), 1)
        self.assertEqual(real[0]["expect"], "pre")
        # Echter Ablauf: Özil -> Ramsey -> Giroud -> Tor
        steps = real[0]["steps"]
        self.assertEqual(steps[0], {"k": "pass", "from": "you", "to": "16"})
        self.assertEqual(steps[-1]["k"], "shot")
        self.assertEqual(steps[-1]["who"], "12")
        self.assertEqual(scene["names"]["you"], "Özil")
        self.assertEqual(scene["names"]["16"], "Ramsey")
        self.assertEqual(scene["opps"][0], [118, 40])  # Torwart zuerst

    def test_hypothetical_options(self):
        scene = build_scene("abcdef123456", goal(), PLAYERS, META)
        kinds = {o["expect"] for o in scene["options"]}
        self.assertIn("assist", kinds)  # direkt auf Giroud
        self.assertIn("early", kinds)  # über Sánchez oder Cazorla
        self.assertGreaterEqual(len(scene["options"]), 3)
        self.assertLessEqual(len(scene["options"]), 4)

    def test_score_and_setup(self):
        scene = build_scene("abcdef123456", goal(), PLAYERS, META)
        self.assertEqual(scene["meta"]["score"], [1, 1])
        self.assertIn("90+5'", scene["setup"]["de"])
        self.assertIn("Özil hat den Ball", scene["setup"]["de"])

    def test_corner_setup(self):
        g = goal(pre={"player": 1, "start": [120, 0.5], "end": [98, 18], "high": True, "type": "Corner"})
        g["frame"].append({"player": 4, "keeper": False, "mate": True, "at": [100, 30]})  # Ecken höchstens 45 m
        g["frame"] = [f for f in g["frame"] if f["at"] != [104, 60]]
        scene = build_scene("abcdef123456", g, PLAYERS, META)
        self.assertEqual(scene["restart"], "corner")
        self.assertIn("tritt die Ecke", scene["setup"]["de"])

    def test_duplicate_names_get_initials(self):
        players = dict(PLAYERS)
        players["4"] = {"name": "Thorgan Hazard", "number": 17, "team": 1}
        players["5"] = {"name": "Eden Hazard", "number": 19, "team": 1}
        scene = build_scene("abcdef123456", goal(), players, META)
        names = set(scene["names"].values())
        self.assertIn("T. Hazard", names)
        self.assertIn("E. Hazard", names)
        self.assertEqual(len(names), len(scene["names"]))

    def test_own_keeper_is_no_option(self):
        g = goal()
        players = dict(PLAYERS, **{"6": {"name": "Bernd Leno", "number": 1, "team": 1}})
        g["frame"].append({"player": 6, "keeper": True, "mate": True, "at": [70, 40]})
        scene = build_scene("abcdef123456", g, players, META)
        self.assertEqual(scene["names"]["1"], "Leno")  # steht auf dem Feld …
        targets = {o["steps"][0].get("to") for o in scene["options"]}
        self.assertNotIn("1", targets)  # … ist aber keine Passoption

    def test_no_scene_without_alternatives(self):
        self.assertIsNone(build_scene("abcdef123456", goal(frame=[]), PLAYERS, META))


def ev(i, etype, team, player, poss=1, **extra):
    e = {"id": f"e{i}", "index": i, "type": {"name": etype}, "team": {"id": team}, "possession": poss,
         "period": 2, "minute": 60}
    if player:
        e["player"] = {"id": player}
    e.update(extra)
    return e


EVENTS = [
    ev(1, "Shot", 2, 9, poss=0, location=[110, 40], shot={"outcome": {"name": "Goal"}}),
    ev(2, "Own Goal For", 1, None, poss=0),
    ev(3, "Pass", 1, 1, location=[80, 30], **{"pass": {"recipient": {"id": 2}, "end_location": [98, 18]}}),
    ev(4, "Pass", 1, 2, location=[100, 20], **{"pass": {"recipient": {"id": 3}, "end_location": [112, 38],
                                                            "height": {"name": "High Pass"}}}),
    ev(5, "Shot", 1, 3, location=[113, 38], shot={
        "outcome": {"name": "Goal"}, "key_pass_id": "e4", "end_location": [120, 40, 1],
        "freeze_frame": [{"player": {"id": 9}, "teammate": False, "location": [90, 26]}],
    }),
]
LINEUPS = [
    {"team_id": 1, "lineup": [{"player_id": i, "player_name": PLAYERS[str(i)]["name"], "jersey_number": i}
                              for i in (1, 2, 3)]},
    {"team_id": 2, "lineup": [{"player_id": 9, "player_name": "Wes Morgan", "jersey_number": 5}]},
]


class MatchScenesTest(unittest.TestCase):
    def test_score_survives_the_cache(self):
        def fake(path):
            return json.loads(json.dumps(EVENTS if path.startswith("events/") else LINEUPS))

        with tempfile.TemporaryDirectory() as tmp, \
                mock.patch.object(build_scenes, "CACHE_DIR", Path(tmp)), \
                mock.patch.object(build_scenes, "fetch_json", side_effect=fake) as fetch:
            fresh = match_scenes(77, {"e5"})
            cached = match_scenes(77, {"e5"})
            self.assertEqual(fetch.call_count, 2)  # zweiter Aufruf kommt aus dem Cache
        self.assertEqual(fresh, cached)
        g = cached["goals"]["e5"]
        # Vor dem Tor: 1:1 (ein Tor für Team 2, ein Eigentor für Team 1)
        self.assertEqual(g["score"], {"1": 1, "2": 1})
        self.assertEqual(g["pre"]["player"], 1)
        self.assertEqual(g["assist"]["player"], 2)
        scene = build_scene("e5000000", g, cached["players"], META)
        if scene:
            self.assertEqual(scene["meta"]["score"], [1, 1])


if __name__ == "__main__":
    unittest.main()
