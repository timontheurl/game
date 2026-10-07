"use client";

import { useState } from "react";
import {
  renderGoalImage,
  renderPlayerImage,
  shareOrDownload,
  type GoalShareInput,
  type PlayerShareInput,
} from "@/lib/shareImage";
import { t, type Lang } from "@/lib/i18n";

type Props =
  | { kind: "goal"; data: GoalShareInput; filename: string; title: string; small?: boolean; lang?: Lang }
  | { kind: "player"; data: PlayerShareInput; filename: string; title: string; small?: boolean; lang?: Lang };

/** Erzeugt ein teilbares Bild und öffnet das Teilen-Menü (oder lädt das Bild herunter). */
export default function ShareButton(props: Props) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const lang = props.lang ?? "de";

  const onClick = async () => {
    setState("busy");
    try {
      const blob = props.kind === "goal" ? await renderGoalImage(props.data, lang) : await renderPlayerImage(props.data, lang);
      await shareOrDownload(blob, props.filename, props.title, window.location.href);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-ghost ${props.small ? "btn-small" : ""} share-btn`}
      onClick={onClick}
      disabled={state === "busy"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5M5 14v5h14v-5" />
      </svg>
      {t(lang, state === "busy" ? "share.busy" : state === "done" ? "share.done" : "share.button")}
    </button>
  );
}
