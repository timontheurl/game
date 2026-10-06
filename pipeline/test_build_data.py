"""Tests für die Pre-Assist-Erkennung.

Aufruf:  python3 -m unittest discover -s pipeline
"""

import unittest

from build_data import find_pre_assist, played_minutes

HOME, AWAY = 1, 2
A, B, C, X = 10, 11, 12, 99  # A/B/C spielen für HOME, X für AWAY


def ev(etype, team, player=None, possession=5, **extra):
    e = {"type": {"name": etype}, "team": {"id": team}, "possession": possession}
    if player is not None:
        e["player"] = {"id": player}
    e.update(extra)
    return e


def pas(team, player, recipient, outcome=None, possession=5):
    p = {"recipient": {"id": recipient}}
    if outcome:
        p["outcome"] = {"name": outcome}
    return ev("Pass", team, player, possession, **{"pass": p})


class FindPreAssistTest(unittest.TestCase):
    def detect(self, events):
        return find_pre_assist(events, len(events) - 1)

    def test_simple_chain(self):
        events = [
            pas(HOME, A, B),
            ev("Ball Receipt*", HOME, B),
            ev("Carry", HOME, B),
            pas(HOME, B, C),  # Assist
        ]
        self.assertIs(self.detect(events), events[0])

    def test_opponent_pressure_does_not_break_chain(self):
        events = [pas(HOME, A, B), ev("Pressure", AWAY, X), ev("Carry", HOME, B), pas(HOME, B, C)]
        self.assertIs(self.detect(events), events[0])

    def test_interception_breaks_chain(self):
        events = [pas(HOME, A, B), ev("Interception", AWAY, X), ev("Carry", HOME, B), pas(HOME, B, C)]
        self.assertIsNone(self.detect(events))

    def test_other_teammate_touch_breaks_chain(self):
        events = [pas(HOME, A, C), ev("Carry", HOME, C), ev("Ball Recovery", HOME, B), pas(HOME, B, C)]
        self.assertIsNone(self.detect(events))

    def test_previous_pass_to_someone_else(self):
        # Der letzte Pass vor dem Assist ging nicht an den Assistgeber (z. B. Abpraller)
        events = [pas(HOME, A, C), ev("Ball Receipt*", HOME, B), pas(HOME, B, C)]
        self.assertIsNone(self.detect(events))

    def test_incomplete_pass_is_no_pre_assist(self):
        events = [pas(HOME, A, B, outcome="Incomplete"), ev("Carry", HOME, B), pas(HOME, B, C)]
        self.assertIsNone(self.detect(events))

    def test_new_possession_breaks_chain(self):
        events = [pas(HOME, A, B, possession=4), ev("Carry", HOME, B), pas(HOME, B, C)]
        self.assertIsNone(self.detect(events))

    def test_dispossessed_breaks_chain(self):
        events = [pas(HOME, A, B), ev("Dispossessed", HOME, B), ev("Carry", HOME, B), pas(HOME, B, C)]
        self.assertIsNone(self.detect(events))

    def test_assist_without_any_previous_pass(self):
        events = [ev("Ball Recovery", HOME, B), ev("Carry", HOME, B), pas(HOME, B, C)]
        self.assertIsNone(self.detect(events))


class PlayedMinutesTest(unittest.TestCase):
    def test_full_match_and_substitution(self):
        events = [
            {"type": {"name": "Half End"}, "period": 1, "minute": 47, "second": 0},
            {"type": {"name": "Half End"}, "period": 2, "minute": 93, "second": 0},
        ]
        lineups = [
            {
                "lineup": [
                    {
                        "player_id": A,
                        "positions": [
                            {"position": "Center Forward", "from": "00:00", "to": None,
                             "from_period": 1, "to_period": None},
                        ],
                    },
                    {
                        "player_id": B,
                        "positions": [
                            {"position": "Right Wing", "from": "60:00", "to": None,
                             "from_period": 2, "to_period": None},
                        ],
                    },
                ]
            }
        ]
        minutes, positions = played_minutes(lineups, events)
        self.assertAlmostEqual(minutes[A], 95.0)  # 47 + 48 Minuten inkl. Nachspielzeit
        self.assertAlmostEqual(minutes[B], 33.0)  # ab 60. Minute bis 93.
        self.assertEqual(set(positions[A]), {"ST"})
        self.assertEqual(set(positions[B]), {"RF"})


if __name__ == "__main__":
    unittest.main()
