// Alle Szenen für „Finde den Pre-Assist“. Neue Dateien hier eintragen;
// geprüft werden sie mit: node --experimental-strip-types scripts/check-scenes.mts
import type { Scene } from "../passGame";
import beispiel from "./beispiel.json";
import fluegel from "./fluegel.json";
import standards from "./standards.json";
import umschalten from "./umschalten.json";
import zentrum from "./zentrum.json";

export const SCENES = [...beispiel, ...fluegel, ...zentrum, ...umschalten, ...standards] as unknown as Scene[];
