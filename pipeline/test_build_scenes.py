"""Tests für die Spielszenen aus echten Toren.

Aufruf:  python3 -m unittest discover -s pipeline
"""

import unittest

from build_scenes import build_scene, clock, in_goal, short_name

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
    "home_score": 2, "away_score": 1, "date": "2016-02-14", "teams": {"1": "Arsenal", "2": "Leicester City"},
}


def goal(**over):
    g = {
        "team": 1, "period": 2, "minute": 94, "score": {1: 1, 2: 1}, "scorer": 3,
        "shot": {"start": [113, 38], "end": [120, 40]},
        "assist": {"player": 2, "start": [100, 20], "end": [112, 38], "high": True},
        "pre": {"player": 1, "start": [80, 30], "end": [98, 18], "high": False, "type": None},
        "carries": [],
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
        g["frame"].append({"player": 4, "keeper": False, "mate": True, "at": [95, 45]})
        g["frame"] = [f for f in g["frame"] if f["at"] != [104, 60]]
        scene = build_scene("abcdef123456", g, PLAYERS, META)
        self.assertEqual(scene["restart"], "corner")
        self.assertIn("tritt die Ecke", scene["setup"]["de"])

    def test_no_scene_without_alternatives(self):
        self.assertIsNone(build_scene("abcdef123456", goal(frame=[]), PLAYERS, META))


if __name__ == "__main__":
    unittest.main()
