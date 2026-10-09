"use client";

import { useEffect, useState } from "react";
import { cleanName, loadName, saveName, shareLink } from "@/lib/challenge";
import { renderChallengeImage, shareOrDownload, type ChallengeShareInput } from "@/lib/shareImage";
import { pick, type Lang } from "@/lib/i18n";

/**
 * „Freund herausfordern“: optionaler Name, Duell-Link und Ergebnisbild.
 * Der Link enthält dieselben Aufgaben und das eigene Ergebnis – der Freund sieht am Ende den Vergleich.
 */
export default function ChallengeShare({
  lang,
  link,
  image,
  text,
  filename,
}: {
  lang: Lang;
  /** Duell-Link mit dem Namen des Herausforderers */
  link: (name: string) => string;
  image: (name: string) => ChallengeShareInput;
  text: (name: string) => string;
  filename: string;
}) {
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "copied" | "shared" | "failed">("idle");
  const [manual, setManual] = useState<string | null>(null);
  useEffect(() => setName(loadName()), []);

  const clean = cleanName(name);
  const remember = () => saveName(clean);
  const title = pick(lang, "Pre-Assist-Duell", "Pre-assist duel");

  const sendLink = async () => {
    remember();
    const url = link(clean);
    const r = await shareLink(url, title, text(clean));
    setState(r === "copied" ? "copied" : "idle");
    // Weder Teilen noch Zwischenablage erlaubt: Link zum Markieren anzeigen
    setManual(r === "failed" ? url : null);
    if (r === "copied") setTimeout(() => setState("idle"), 2500);
  };

  const sendImage = async () => {
    remember();
    setState("busy");
    try {
      const blob = await renderChallengeImage(image(clean));
      await shareOrDownload(blob, filename, title, link(clean));
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="challenge-share">
      <p className="challenge-title">{pick(lang, "Fordere deine Freunde heraus", "Challenge your friends")}</p>
      <p className="challenge-hint">
        {pick(
          lang,
          "Sie spielen genau dieselben Aufgaben und sehen am Ende, wer gewonnen hat.",
          "They play exactly the same questions and see who won at the end.",
        )}
      </p>
      <label className="challenge-name">
        <span>{pick(lang, "Dein Name (optional)", "Your name (optional)")}</span>
        <input type="text" value={name} maxLength={24} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="player-actions">
        <button type="button" className="btn" onClick={sendLink}>
          {state === "copied" ? pick(lang, "Link kopiert!", "Link copied!") : pick(lang, "Freund herausfordern", "Challenge a friend")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={sendImage} disabled={state === "busy"}>
          {state === "busy" ? pick(lang, "Bild entsteht …", "Creating image …") : pick(lang, "Ergebnisbild teilen", "Share result image")}
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? pick(lang, "Link kopiert", "Link copied") : ""}
      </p>
      {manual && (
        <label className="challenge-manual">
          <span>{pick(lang, "Kopiere diesen Link und schick ihn deinem Freund:", "Copy this link and send it to your friend:")}</span>
          <input type="text" readOnly value={manual} onFocus={(e) => e.currentTarget.select()} autoFocus />
        </label>
      )}
      {state === "failed" && (
        <p className="challenge-error" role="alert">
          {pick(lang, "Das hat leider nicht geklappt. Bitte nochmal versuchen.", "That didn't work. Please try again.")}
        </p>
      )}
    </div>
  );
}
