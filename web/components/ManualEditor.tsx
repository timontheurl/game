"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { arrowHead } from "@/lib/geom";
import {
  PASS_TYPES,
  type GoalKind,
  type ManualGoal,
  type ManualMatch,
  type ManualSeasonFile,
  type PassType,
  type Pt,
} from "@/lib/manualTypes";

const POSITIONS = ["", "TW", "IV", "RV", "LV", "ZDM", "ZM", "ZOM", "RM", "LM", "RF", "LF", "ST", "HS"];

const uid = () => Math.random().toString(36).slice(2, 10);

/** Kader aus eingefügtem Text: ein Spieler pro Zeile, optional „Name, Position, Nation“. */
function parseSquad(text: string) {
  return text
    .split("\n")
    .map((line) => line.split(/[,;\t]/).map((x) => x.trim()))
    .filter(([name]) => name)
    .map(([name, position, country]) => ({
      // Rückennummern am Anfang weglassen, z. B. „7 Max Muster“
      name: name.replace(/^\d+\.?\s+/, ""),
      position: position && POSITIONS.includes(position.toUpperCase()) ? position.toUpperCase() : undefined,
      country: country && /^[a-z-]{2,6}$/i.test(country) ? country.toLowerCase() : undefined,
    }));
}

interface Draft {
  /** ID des Tors, das gerade bearbeitet wird (sonst neues Tor) */
  editing: string | null;
  minute: string;
  team: string;
  kind: GoalKind;
  scorer: string;
  assist: string;
  assistType: PassType | "";
  pre: string;
  preType: PassType | "";
  points: { pre?: Pt; assist?: Pt; shot?: Pt };
}

const emptyDraft = (team: string): Draft => ({
  editing: null,
  minute: "",
  team,
  kind: "Spiel",
  scorer: "",
  assist: "",
  assistType: "",
  pre: "",
  preType: "",
  points: {},
});

/** Spielfeld zum Anklicken der Punkte (Angriff nach rechts). */
function ClickPitch({ draft, onPoint }: { draft: Draft; onPoint: (p: Pt) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const { pre, assist, shot } = draft.points;
  const click = (e: React.MouseEvent) => {
    const svg = ref.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    onPoint([Math.round(Math.min(120, Math.max(0, p.x)) * 10) / 10, Math.round(Math.min(80, Math.max(0, p.y)) * 10) / 10]);
  };
  const line = (a: Pt, b: Pt, cls: string) => (
    <g className={`pitch-arrow ${cls}`}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="pitch-line" />
      <polygon points={arrowHead(a, b, 3, 2.6)} className="pitch-head" />
    </g>
  );
  return (
    <svg ref={ref} viewBox="-2 -2 124 84" className="pitch click-pitch" onClick={click} role="img" aria-label="Spielfeld zum Anklicken">
      <g className="pitch-markings">
        <rect x={0} y={0} width={120} height={80} />
        <line x1={60} y1={0} x2={60} y2={80} />
        <circle cx={60} cy={40} r={10} />
        <rect x={102} y={18} width={18} height={44} />
        <rect x={114} y={30} width={6} height={20} />
        <rect x={0} y={18} width={18} height={44} />
      </g>
      <text x={60} y={77} textAnchor="middle" className="click-hint">
        Angriff →
      </text>
      {pre && assist && line(pre, assist, "pre")}
      {assist && shot && line(assist, shot, "assist")}
      {shot && line(shot, [120, 40], "shot")}
      {pre && <circle cx={pre[0]} cy={pre[1]} r={1.8} className="click-dot pre" />}
      {assist && <circle cx={assist[0]} cy={assist[1]} r={1.8} className="click-dot assist" />}
      {shot && <circle cx={shot[0]} cy={shot[1]} r={1.8} className="click-dot shot" />}
    </svg>
  );
}

export default function ManualEditor({
  data,
  onChange,
}: {
  data: ManualSeasonFile;
  onChange: (fn: (d: ManualSeasonFile) => ManualSeasonFile) => void;
}) {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(""));
  const [newMatch, setNewMatch] = useState({ round: "1", date: "", home: "", away: "", hs: "0", as: "0" });
  const [msg, setMsg] = useState("");
  const [squadChoice, setSquadTeam] = useState("");
  // Teams kommen evtl. erst nach dem Laden des Spielplans dazu
  const squadTeam = data.teams.includes(squadChoice) ? squadChoice : (data.teams[0] ?? "");
  const [squadText, setSquadText] = useState("");

  const match = data.matches.find((m) => m.id === matchId) ?? null;
  useEffect(() => {
    if (match) setDraft(emptyDraft(match.home));
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const playersOf = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [name, p] of Object.entries(data.players)) map.set(p.team, [...(map.get(p.team) ?? []), name].sort());
    return map;
  }, [data]);

  const update = (fn: (d: ManualSeasonFile) => ManualSeasonFile) => onChange((d) => fn(structuredClone(d)));
  const setData = (d: ManualSeasonFile) => onChange(() => d);

  const addSquad = () => {
    const list = parseSquad(squadText);
    if (!squadTeam || list.length === 0) {
      setMsg("Bitte ein Team wählen und mindestens einen Namen einfügen.");
      return;
    }
    update((d) => {
      for (const p of list) {
        const prev = d.players[p.name];
        d.players[p.name] = {
          team: squadTeam,
          position: p.position ?? prev?.position,
          country: p.country ?? prev?.country,
        };
      }
      return d;
    });
    setSquadText("");
    setMsg(`${list.length} Spieler zu ${squadTeam} hinzugefügt.`);
  };

  // Welcher Punkt als Nächstes angeklickt wird
  const needed: ("pre" | "assist" | "shot")[] = [];
  if (draft.pre.trim() && draft.assist.trim()) needed.push("pre");
  if (draft.assist.trim()) needed.push("assist");
  needed.push("shot");
  const nextPoint = needed.find((k) => !draft.points[k]);
  const pointLabel = { pre: "Start des Pre-Assists", assist: "Start der Vorlage (Assist)", shot: "Ort des Abschlusses" };

  const addMatch = () => {
    const { round, date, home, away, hs, as } = newMatch;
    if (!date || !home || !away || home === away) {
      setMsg("Bitte Datum sowie zwei verschiedene Teams wählen.");
      return;
    }
    const m: ManualMatch = {
      id: uid(),
      round: Number(round) || 1,
      date,
      home,
      away,
      homeScore: Number(hs) || 0,
      awayScore: Number(as) || 0,
    };
    update((d) => ({ ...d, matches: [...d.matches, m] }));
    setMatchId(m.id);
    setMsg("");
  };

  const saveGoal = () => {
    if (!match) return;
    const scorer = draft.scorer.trim();
    const assist = draft.assist.trim() || null;
    const pre = assist ? draft.pre.trim() || null : null;
    if (!scorer || !draft.minute) {
      setMsg("Minute und Torschütze fehlen.");
      return;
    }
    if (draft.kind !== "Eigentor" && nextPoint) {
      setMsg(`Bitte noch auf dem Spielfeld klicken: ${pointLabel[nextPoint]}.`);
      return;
    }
    const goal: ManualGoal = {
      id: draft.editing ?? uid(),
      match: match.id,
      minute: Number(draft.minute),
      team: draft.team,
      kind: draft.kind,
      scorer,
      assist,
      pre,
      assistType: assist ? (draft.assistType || null) : null,
      preType: pre ? (draft.preType || null) : null,
      points: draft.points,
    };
    update((d) => {
      // Spieler automatisch anlegen
      for (const n of [scorer, assist, pre]) {
        if (n && !d.players[n] && draft.kind !== "Eigentor") d.players[n] = { team: draft.team };
      }
      const i = d.goals.findIndex((x) => x.id === goal.id);
      if (i >= 0) d.goals[i] = goal;
      else d.goals.push(goal);
      return d;
    });
    setDraft(emptyDraft(draft.team));
    setMsg(draft.editing ? "Tor aktualisiert." : "Tor gespeichert.");
  };

  const editGoal = (g: ManualGoal) => {
    setDraft({
      editing: g.id,
      minute: String(g.minute),
      team: g.team,
      kind: g.kind,
      scorer: g.scorer,
      assist: g.assist ?? "",
      assistType: g.assistType ?? "",
      pre: g.pre ?? "",
      preType: g.preType ?? "",
      points: g.points,
    });
    setMsg("");
    document.querySelector(".editor-goal-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.slug}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as ManualSeasonFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.goals)) throw new Error("Format");
      setData(parsed);
      setMatchId(null);
      setMsg(`Importiert: ${parsed.matches.length} Spiele, ${parsed.goals.length} Tore.`);
    } catch {
      setMsg("Die Datei konnte nicht gelesen werden.");
    }
  };

  const matchGoals = data.goals.filter((g) => g.match === matchId).sort((a, b) => a.minute - b.minute);
  const rounds = [...new Set(data.matches.map((m) => m.round))].sort((a, b) => b - a);
  const teamPlayers = playersOf.get(draft.team) ?? [];

  return (
    <div className="editor">
      <div className="editor-bar">
        <div>
          <b>{data.name}</b> {data.season} · {data.matches.length} Spiele · {data.goals.length} Tore
        </div>
        <div className="editor-actions">
          <button type="button" className="btn btn-ghost btn-small" onClick={exportFile} title="Sicherungskopie als Datei">
            Exportieren
          </button>
          <label className="btn btn-ghost btn-small">
            Importieren
            <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              if (confirm("Alle Spiele, Tore und Spieler dieser Saison löschen? (Erst mit „Veröffentlichen“ auch online.)")) {
                setData({ ...data, matches: [], goals: [], players: {} });
                setMatchId(null);
              }
            }}
          >
            Neu beginnen
          </button>
        </div>
      </div>
      {msg && <p className="notice">{msg}</p>}

      <div className="editor-grid">
        <section className="editor-panel">
          <h2 className="sub-title">Spiel anlegen</h2>
          <div className="form-grid">
            <label>
              Runde
              <input type="number" min={1} value={newMatch.round} onChange={(e) => setNewMatch({ ...newMatch, round: e.target.value })} />
            </label>
            <label>
              Datum
              <input type="date" value={newMatch.date} onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })} />
            </label>
            <label>
              Heim
              <select value={newMatch.home} onChange={(e) => setNewMatch({ ...newMatch, home: e.target.value })}>
                <option value="">–</option>
                {data.teams.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Gast
              <select value={newMatch.away} onChange={(e) => setNewMatch({ ...newMatch, away: e.target.value })}>
                <option value="">–</option>
                {data.teams.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Tore Heim
              <input type="number" min={0} value={newMatch.hs} onChange={(e) => setNewMatch({ ...newMatch, hs: e.target.value })} />
            </label>
            <label>
              Tore Gast
              <input type="number" min={0} value={newMatch.as} onChange={(e) => setNewMatch({ ...newMatch, as: e.target.value })} />
            </label>
          </div>
          <button type="button" className="btn btn-small" onClick={addMatch}>
            Spiel anlegen
          </button>

          <h2 className="sub-title">Spiele</h2>
          {rounds.length === 0 && <p className="muted">Noch keine Spiele erfasst.</p>}
          {rounds.map((r) => (
            <div key={r} className="editor-round">
              <span className="muted small">Runde {r}</span>
              {data.matches
                .filter((m) => m.round === r)
                .map((m) => {
                  const mg = data.goals.filter((g) => g.match === m.id);
                  const open = mg.filter((g) => g.open).length;
                  const n = mg.length - open;
                  const total = m.homeScore + m.awayScore;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`chain-item ${m.id === matchId ? "is-active" : ""}`}
                      onClick={() => setMatchId(m.id)}
                    >
                      <span>
                        {m.home} {m.homeScore}:{m.awayScore} {m.away}
                      </span>
                      <span className={`ci-meta ${n < total ? "is-open" : ""}`}>
                        {n}/{total} Tore erfasst{open > 0 && ` · ${open} offen`}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </section>

        <section className="editor-panel">
          {!match ? (
            <p className="muted">Wähle links ein Spiel oder lege ein neues an.</p>
          ) : (
            <>
              <h2 className="sub-title editor-goal-form">
                {draft.editing ? "Tor bearbeiten" : "Tor erfassen"} · {match.home} {match.homeScore}:{match.awayScore} {match.away}
              </h2>
              <div className="form-grid">
                <label>
                  Minute
                  <input type="number" min={1} max={130} value={draft.minute} onChange={(e) => setDraft({ ...draft, minute: e.target.value })} />
                </label>
                <label>
                  Team
                  <select value={draft.team} onChange={(e) => setDraft({ ...draft, team: e.target.value })}>
                    <option>{match.home}</option>
                    <option>{match.away}</option>
                  </select>
                </label>
                <label>
                  Art
                  <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as GoalKind })}>
                    {(["Spiel", "Standard", "Elfmeter", "Eigentor"] as GoalKind[]).map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Torschütze
                  <input list="team-players" value={draft.scorer} onChange={(e) => setDraft({ ...draft, scorer: e.target.value })} />
                </label>
                <label className="span-2">
                  Assist (Vorlage)
                  <input list="team-players" value={draft.assist} onChange={(e) => setDraft({ ...draft, assist: e.target.value })} />
                </label>
                <label>
                  Art der Vorlage
                  <select value={draft.assistType} onChange={(e) => setDraft({ ...draft, assistType: e.target.value as PassType })}>
                    <option value="">–</option>
                    {PASS_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Pre-Assist
                  <input
                    list="team-players"
                    value={draft.pre}
                    disabled={!draft.assist.trim()}
                    onChange={(e) => setDraft({ ...draft, pre: e.target.value })}
                  />
                </label>
                <label>
                  Art des Pre-Assists
                  <select value={draft.preType} onChange={(e) => setDraft({ ...draft, preType: e.target.value as PassType })}>
                    <option value="">–</option>
                    {PASS_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <datalist id="team-players">
                {teamPlayers.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>

              {draft.kind !== "Eigentor" && (
                <>
                  <p className="click-step">
                    {nextPoint ? (
                      <>
                        Klicke auf dem Spielfeld: <b>{pointLabel[nextPoint]}</b>
                      </>
                    ) : (
                      "Alle Punkte gesetzt."
                    )}
                    {Object.keys(draft.points).length > 0 && (
                      <button type="button" className="link-btn" onClick={() => setDraft({ ...draft, points: {} })}>
                        Punkte zurücksetzen
                      </button>
                    )}
                  </p>
                  <ClickPitch
                    draft={draft}
                    onPoint={(p) => nextPoint && setDraft({ ...draft, points: { ...draft.points, [nextPoint]: p } })}
                  />
                </>
              )}
              <div className="player-actions">
                <button type="button" className="btn" onClick={saveGoal}>
                  Tor speichern
                </button>
                {draft.editing && (
                  <button type="button" className="btn btn-ghost" onClick={() => setDraft(emptyDraft(draft.team))}>
                    Abbrechen
                  </button>
                )}
              </div>

              <h2 className="sub-title">Erfasste Tore</h2>
              {matchGoals.length === 0 && <p className="muted">Noch keine Tore.</p>}
              <ul className="editor-goals">
                {matchGoals.map((g) => (
                  <li key={g.id} className={`${g.open ? "is-open" : ""} ${draft.editing === g.id ? "is-editing" : ""}`}>
                    <span className="muted">{g.minute}&apos;</span>
                    <span className="chain-names">
                      {g.pre && (
                        <>
                          <span className="c-pre">{g.pre}</span>
                          <span className="c-sep">›</span>
                        </>
                      )}
                      {g.assist && (
                        <>
                          <span className="c-ast">{g.assist}</span>
                          <span className="c-sep">›</span>
                        </>
                      )}
                      <span className="c-goal">{g.scorer}</span>
                      {g.kind !== "Spiel" && <span className="muted"> ({g.kind})</span>}
                      {g.open && <span className="goal-open">offen</span>}
                    </span>
                    <button type="button" className="link-btn" onClick={() => editGoal(g)}>
                      {g.open ? "Ergänzen" : "Bearbeiten"}
                    </button>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => update((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== g.id) }))}
                    >
                      Löschen
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="link-btn danger"
                onClick={() => {
                  if (confirm("Spiel samt Toren löschen?")) {
                    update((d) => ({
                      ...d,
                      matches: d.matches.filter((m) => m.id !== match.id),
                      goals: d.goals.filter((g) => g.match !== match.id),
                    }));
                    setMatchId(null);
                  }
                }}
              >
                Dieses Spiel löschen
              </button>
            </>
          )}
        </section>
      </div>

      <section className="editor-panel">
        <h2 className="sub-title">Kader eintragen</h2>
        <p className="muted small">
          Ein Spieler pro Zeile, optional mit Position und Nation: <code>Marco Grüll, LF, at</code>. Am einfachsten die
          Kaderliste von der Vereins- oder Bundesliga-Seite kopieren und einfügen; Rückennummern am Zeilenanfang werden
          entfernt. Danach schlagen die Eingabefelder für Torschütze, Assist und Pre-Assist die Spieler vor.
        </p>
        <div className="squad-form">
          <select value={squadTeam} onChange={(e) => setSquadTeam(e.target.value)} aria-label="Team">
            {data.teams.map((t) => (
              <option key={t} value={t}>
                {t} ({playersOf.get(t)?.length ?? 0})
              </option>
            ))}
          </select>
          <textarea
            rows={6}
            value={squadText}
            placeholder={"Alexander Schlager, TW, at\nNikolai Baden Frederiksen, ST, dk\n…"}
            onChange={(e) => setSquadText(e.target.value)}
          />
          <button type="button" className="btn btn-small" onClick={addSquad}>
            Zum Kader hinzufügen
          </button>
        </div>
      </section>

      <section className="editor-panel">
        <h2 className="sub-title">Spieler ({Object.keys(data.players).length})</h2>
        <p className="muted small">Position und Nation erscheinen auf den Spielerkarten. Nation als Kürzel, z. B. at, de, hr.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>Position</th>
                <th>Nation</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.players)
                .sort((a, b) => a[1].team.localeCompare(b[1].team) || a[0].localeCompare(b[0]))
                .map(([name, p]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>
                      <select
                        value={p.team}
                        onChange={(e) => update((d) => ((d.players[name].team = e.target.value), d))}
                      >
                        {data.teams.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={p.position ?? ""}
                        onChange={(e) => update((d) => ((d.players[name].position = e.target.value || undefined), d))}
                      >
                        {POSITIONS.map((x) => (
                          <option key={x} value={x}>
                            {x || "–"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="code-input"
                        maxLength={6}
                        value={p.country ?? ""}
                        onChange={(e) =>
                          update((d) => ((d.players[name].country = e.target.value.toLowerCase() || undefined), d))
                        }
                      />
                    </td>
                    <td>
                      {!data.goals.some((g) => [g.scorer, g.assist, g.pre].includes(name)) && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => update((d) => (delete d.players[name], d))}
                        >
                          Entfernen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
