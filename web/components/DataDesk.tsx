"use client";

import { useCallback, useEffect, useState } from "react";
import ManualEditor from "./ManualEditor";
import { checkLogin, GitHubError, readSeason, writeSeason } from "@/lib/github";
import { CURRENT_SLUG, emptySeason, type ManualSeasonFile } from "@/lib/manualTypes";
import { DATA_REPO } from "@/lib/site";

// Anmeldung und Speichern für /erfassen. Die Daten liegen als JSON-Datei im Repository;
// „Veröffentlichen“ schreibt sie dorthin, danach baut Vercel die Seite automatisch neu.

const TOKEN_KEY = "preassists-zugang";
const DRAFT_KEY = "preassists-erfassung";

interface Draft {
  data: ManualSeasonFile;
  /** Version der Online-Datei, auf der dieser Stand aufbaut */
  sha: string | null;
  dirty: boolean;
}

const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string, persist = true) {
    try {
      (persist ? localStorage : sessionStorage).setItem(key, value);
    } catch {
      /* ohne Speicher geht es trotzdem, nur ohne Erinnern */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* egal */
    }
  },
};

function loadDraft(): Draft | null {
  const raw = storage.get(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Ältere Fassung des Tools speicherte nur die Saison selbst
    if (parsed.version === 1) return { data: parsed, sha: null, dirty: parsed.goals?.length > 0 };
    return parsed as Draft;
  } catch {
    return null;
  }
}

function Login({ onLogin }: { onLogin: (token: string, user: string, persist: boolean) => void }) {
  const [token, setToken] = useState("");
  const [persist, setPersist] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await checkLogin(token.trim());
      onLogin(token.trim(), user, persist);
    } catch (err) {
      setError(err instanceof GitHubError ? err.message : "Keine Verbindung zu GitHub.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="desk-login">
      <form onSubmit={submit} className="editor-panel">
        <h2 className="sub-title">Anmelden</h2>
        <label className="desk-field">
          Zugangsschlüssel
          <input
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            required
          />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
          Auf diesem Gerät angemeldet bleiben
        </label>
        {error && <p className="notice is-error">{error}</p>}
        <button type="submit" className="btn" disabled={busy || !token.trim()}>
          {busy ? "Prüfe …" : "Anmelden"}
        </button>
      </form>

      <div className="desk-help">
        <h2 className="sub-title">Zugangsschlüssel anlegen (einmalig)</h2>
        <ol className="howto">
          <li>
            Auf GitHub angemeldet{" "}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              neuen Fine-grained Token anlegen
            </a>
            .
          </li>
          <li>
            Name z. B. <b>PreAssists Erfassung</b>, Ablaufdatum nach Wunsch (z. B. 1 Jahr).
          </li>
          <li>
            Bei <b>Repository access</b> „Only select repositories“ wählen und{" "}
            <b>
              {DATA_REPO.owner}/{DATA_REPO.repo}
            </b>{" "}
            auswählen.
          </li>
          <li>
            Bei <b>Permissions → Repository permissions</b> den Punkt <b>Contents</b> auf „Read and write“ stellen.
          </li>
          <li>„Generate token“ klicken, den Schlüssel kopieren und hier einfügen.</li>
        </ol>
        <p className="muted small">
          Der Schlüssel bleibt nur auf diesem Gerät und wird ausschließlich an GitHub geschickt. Er darf nur dieses eine
          Repository bearbeiten und lässt sich auf GitHub jederzeit löschen.
        </p>
      </div>
    </div>
  );
}

export default function DataDesk() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState<"start" | "login" | "loading" | "ready">("start");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Gespeicherten Schlüssel prüfen
  useEffect(() => {
    const saved = storage.get(TOKEN_KEY);
    if (!saved) {
      setState("login");
      return;
    }
    checkLogin(saved)
      .then((u) => {
        setToken(saved);
        setUser(u);
      })
      .catch(() => {
        storage.remove(TOKEN_KEY);
        setState("login");
      });
  }, []);

  // Entwurf auf dem Gerät mitschreiben, damit nichts verloren geht
  useEffect(() => {
    if (draft) storage.set(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  // Warnen, bevor ungespeicherte Änderungen beim Schließen verloren gehen
  useEffect(() => {
    if (!draft?.dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft?.dirty]);

  const loadRemote = useCallback(
    async (tok: string, askLocal: boolean) => {
      setState("loading");
      setMsg(null);
      try {
        const remote = await readSeason(tok, CURRENT_SLUG);
        const remoteSha = remote?.sha ?? null;
        const local = loadDraft();
        if (askLocal && local?.dirty && local.data.slug === CURRENT_SLUG) {
          const same = local.sha === remoteSha;
          if (
            same ||
            !confirm(
              "Auf diesem Gerät gibt es nicht veröffentlichte Änderungen, online aber einen neueren Stand.\n\nOK = Online-Stand laden (lokale Änderungen verwerfen)\nAbbrechen = lokale Änderungen behalten",
            )
          ) {
            setDraft({ ...local, sha: remoteSha });
            setMsg({ text: "Nicht veröffentlichte Änderungen von diesem Gerät geladen." });
            setState("ready");
            return;
          }
        }
        setDraft({ data: remote ? JSON.parse(remote.text) : emptySeason(), sha: remoteSha, dirty: false });
        setState("ready");
      } catch (err) {
        setMsg({ text: err instanceof GitHubError ? err.message : "Keine Verbindung zu GitHub.", error: true });
        setState("ready");
        setDraft((d) => d ?? loadDraft() ?? { data: emptySeason(), sha: null, dirty: false });
      }
    },
    [],
  );

  useEffect(() => {
    if (token) loadRemote(token, true);
  }, [token, loadRemote]);

  const login = (tok: string, u: string, persist: boolean) => {
    storage.set(TOKEN_KEY, tok, persist);
    setUser(u);
    setToken(tok);
  };

  const logout = () => {
    if (draft?.dirty && !confirm("Es gibt nicht veröffentlichte Änderungen. Sie bleiben auf diesem Gerät gespeichert. Trotzdem abmelden?"))
      return;
    storage.remove(TOKEN_KEY);
    setToken(null);
    setState("login");
  };

  const publish = async () => {
    if (!token || !draft) return;
    setBusy(true);
    setMsg(null);
    try {
      const { data } = draft;
      const text = `${JSON.stringify(data, null, 2)}\n`;
      const sha = await writeSeason(
        token,
        data.slug,
        text,
        draft.sha,
        `Erfassung ${data.season}: ${data.matches.length} Spiele, ${data.goals.length} Tore`,
      );
      setDraft({ data, sha, dirty: false });
      setMsg({ text: "Veröffentlicht. Die Website ist in etwa 5 Minuten aktualisiert." });
    } catch (err) {
      setMsg({ text: err instanceof GitHubError ? err.message : "Keine Verbindung zu GitHub.", error: true });
    } finally {
      setBusy(false);
    }
  };

  if (state === "start" || (token && state === "loading")) return <p className="empty">Lade …</p>;
  if (!token || state === "login") return <Login onLogin={login} />;
  if (!draft) return <p className="empty">Lade …</p>;

  return (
    <>
      <div className="desk-bar">
        <span className="muted small">
          Angemeldet als <b>{user}</b>
        </span>
        <span className={`desk-state ${draft.dirty ? "is-dirty" : ""}`}>
          {draft.dirty ? "Nicht veröffentlichte Änderungen" : "Alles veröffentlicht"}
        </span>
        <div className="editor-actions">
          <button type="button" className="btn btn-small" onClick={publish} disabled={busy || !draft.dirty}>
            {busy ? "Speichere …" : "Veröffentlichen"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => (!draft.dirty || confirm("Nicht veröffentlichte Änderungen verwerfen?")) && loadRemote(token, false)}
          >
            Online-Stand laden
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
            Abmelden
          </button>
        </div>
      </div>
      {msg && <p className={`notice ${msg.error ? "is-error" : ""}`}>{msg.text}</p>}
      <ManualEditor
        data={draft.data}
        onChange={(fn) => setDraft((d) => (d ? { ...d, data: fn(d.data), dirty: true } : d))}
      />
    </>
  );
}
