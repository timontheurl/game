import type { Goal } from "./data";

/** Doppelpass-Tor: wer den Pre-Assist spielt, bekommt die Vorlage zurück und trifft selbst */
export const isOneTwo = (g: Pick<Goal, "pre" | "assist" | "scorer">) => !!g.pre && !!g.assist && g.pre.player === g.scorer;
