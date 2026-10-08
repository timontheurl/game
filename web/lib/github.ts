// Speichern der Erfassung direkt im GitHub-Repository – läuft nur im Browser.
// Angemeldet wird mit einem persönlichen Zugangsschlüssel (Fine-grained Token), der nur dieses Repository bearbeiten darf.

import { DATA_REPO } from "./site";

const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  return res;
}

const repoPath = `/repos/${DATA_REPO.owner}/${DATA_REPO.repo}`;

/** Prüft den Schlüssel: Gibt den Benutzernamen zurück, wenn er Schreibrechte auf das Repository hat. */
export async function checkLogin(token: string): Promise<string> {
  const res = await call(token, repoPath);
  if (res.status === 401) throw new GitHubError("Der Schlüssel ist ungültig oder abgelaufen.", 401);
  if (res.status === 404 || res.status === 403)
    throw new GitHubError("Der Schlüssel hat keinen Zugriff auf das Repository.", res.status);
  if (!res.ok) throw new GitHubError(`GitHub antwortet mit Fehler ${res.status}.`, res.status);
  const repo = await res.json();
  if (repo.permissions && !repo.permissions.push)
    throw new GitHubError("Der Schlüssel darf das Repository nur lesen. Bitte „Contents: Read and write“ erlauben.", 403);
  const user = await call(token, "/user");
  return user.ok ? ((await user.json()).login as string) : DATA_REPO.owner;
}

// Base64 für UTF-8-Texte (Umlaute!) in kleinen Stücken, damit auch große Dateien gehen
function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64: string) {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const filePath = (slug: string) => `${DATA_REPO.dir}/${slug}.json`;

/** Liest eine Saison-Datei; null, wenn es sie noch nicht gibt. */
export async function readSeason(token: string, slug: string): Promise<{ text: string; sha: string } | null> {
  const path = `${repoPath}/contents/${filePath(slug)}?ref=${DATA_REPO.branch}`;
  const res = await call(token, path);
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(`Laden fehlgeschlagen (Fehler ${res.status}).`, res.status);
  const meta = await res.json();
  if (meta.encoding === "base64" && meta.content) return { text: fromBase64(meta.content), sha: meta.sha };
  // Dateien über 1 MB liefert GitHub nur als Rohtext
  const raw = await call(token, path, { headers: { Accept: "application/vnd.github.raw+json" } });
  if (!raw.ok) throw new GitHubError(`Laden fehlgeschlagen (Fehler ${raw.status}).`, raw.status);
  return { text: await raw.text(), sha: meta.sha };
}

/** Schreibt die Saison-Datei; gibt die neue Versionskennung zurück. */
export async function writeSeason(token: string, slug: string, text: string, sha: string | null, message: string) {
  const res = await call(token, `${repoPath}/contents/${filePath(slug)}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: toBase64(text), branch: DATA_REPO.branch, ...(sha ? { sha } : {}) }),
  });
  if (res.status === 409 || res.status === 422)
    throw new GitHubError("Online gibt es inzwischen einen neueren Stand. Bitte zuerst neu laden.", res.status);
  if (!res.ok) throw new GitHubError(`Speichern fehlgeschlagen (Fehler ${res.status}).`, res.status);
  const body = await res.json();
  return body.content.sha as string;
}
