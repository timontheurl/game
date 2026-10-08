// Alle Szenen für „Finde den Pre-Assist“. Neue Dateien hier eintragen;
// geprüft werden sie mit: node --experimental-strip-types scripts/check-scenes.mts
import type { Scene } from "../passGame";
import beispiel from "./beispiel.json";

export const SCENES = [...beispiel] as unknown as Scene[];
