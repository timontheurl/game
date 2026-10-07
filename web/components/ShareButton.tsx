"use client";

import { useState } from "react";
import {
  renderGoalImage,
  renderPlayerImage,
  shareOrDownload,
  type GoalShareInput,
  type PlayerShareInput,
} from "@/lib/shareImage";

type Props =
  | { kind: "goal"; data: GoalShareInput; filename: string; title: string; small?: boolean }
  | { kind: "player"; data: PlayerShareInput; filename: string; title: string; small?: boolean };

/** Erzeugt ein teilbares Bild und öffnet das Teilen-Menü (oder lädt das Bild herunter). */
export default function ShareButton(props: Props) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  const onClick = async () => {
    setState("busy");
    try {
      const blob = props.kind === "goal" ? await renderGoalImage(props.data) : await renderPlayerImage(props.data);
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
      {state === "busy" ? "Bild wird erstellt …" : state === "done" ? "Fertig" : "Als Bild teilen"}
    </button>
  );
}
