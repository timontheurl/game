// Zweisprachigkeit: Deutsch (Standard, ohne Präfix) und Englisch (unter /en/…).
// Reine Hilfsfunktionen ohne Dateizugriff – dürfen auch im Browser laufen.

export type Lang = "de" | "en";

export const LOCALE: Record<Lang, string> = { de: "de-AT", en: "en-GB" };

// Seiten mit ihren Pfaden je Sprache. Impressum, Datenschutz und Erfassen gibt es nur auf Deutsch.
export const ROUTES = {
  home: { de: "/", en: "/en/" },
  ligen: { de: "/ligen/", en: "/en/leagues/" },
  liga: { de: "/liga/", en: "/en/league/" },
  wettbewerb: { de: "/wettbewerb/", en: "/en/competition/" },
  vereine: { de: "/vereine/", en: "/en/clubs/" },
  verein: { de: "/verein/", en: "/en/club/" },
  spieler: { de: "/spieler/", en: "/en/player/" },
  torketten: { de: "/torketten/", en: "/en/goal-chains/" },
  vergleich: { de: "/vergleich/", en: "/en/compare/" },
  rekorde: { de: "/rekorde/", en: "/en/records/" },
  spiel: { de: "/spiel/", en: "/en/game/" },
  spiele: { de: "/spiele/", en: "/en/games/" },
  passspiel: { de: "/spiele/pre-assist/", en: "/en/games/pre-assist/" },
  methodik: { de: "/methodik/", en: "/en/methodology/" },
  impressum: { de: "/impressum/", en: "/impressum/" },
  datenschutz: { de: "/datenschutz/", en: "/datenschutz/" },
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Pfad einer Seite in der gewünschten Sprache, optional mit Slug (z. B. Spieler). */
export function url(lang: Lang, key: RouteKey, slug?: string): string {
  const base = ROUTES[key][lang];
  return slug ? `${base}${slug}/` : base;
}

export function langFromPath(pathname: string | null | undefined): Lang {
  return pathname === "/en" || pathname?.startsWith("/en/") ? "en" : "de";
}

/** Dieselbe Seite in der anderen Sprache (für den Sprachumschalter). */
export function switchPath(pathname: string, to: Lang): string {
  const from = langFromPath(pathname);
  if (from === to) return pathname;
  // längste passende Basis zuerst, damit "/" nicht alles schluckt
  const entries = (Object.keys(ROUTES) as RouteKey[])
    .map((k) => [k, ROUTES[k][from]] as const)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [key, base] of entries) {
    if (pathname === base || pathname === base.replace(/\/$/, "")) return ROUTES[key][to];
    if (base !== "/" && base !== "/en/" && pathname.startsWith(base)) return ROUTES[key][to] + pathname.slice(base.length);
  }
  return ROUTES.home[to];
}

export function num(lang: Lang, n: number, digits = 0): string {
  return n.toLocaleString(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// ---------- Länder, Wettbewerbe ----------

const UK: Record<Lang, Record<string, string>> = {
  de: { "gb-eng": "England", "gb-sct": "Schottland", "gb-wls": "Wales", "gb-nir": "Nordirland", xk: "Kosovo" },
  en: { "gb-eng": "England", "gb-sct": "Scotland", "gb-wls": "Wales", "gb-nir": "Northern Ireland", xk: "Kosovo" },
};
const regionNames: Record<Lang, Intl.DisplayNames> = {
  de: new Intl.DisplayNames(["de"], { type: "region" }),
  en: new Intl.DisplayNames(["en"], { type: "region" }),
};

/** Ländername aus dem Flaggen-Code in der gewünschten Sprache. */
export function countryName(code: string | null, fallback: string | null, lang: Lang = "de"): string | null {
  if (!code) return fallback;
  if (UK[lang][code]) return UK[lang][code];
  try {
    return regionNames[lang].of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

const COMPETITION_EN: Record<string, string> = {
  WM: "World Cup",
  EM: "Euro",
  "Frauen-WM": "Women's World Cup",
  "Österreichische Bundesliga": "Austrian Bundesliga",
};

const COUNTRY_EN: Record<string, string> = {
  Deutschland: "Germany",
  England: "England",
  Spanien: "Spain",
  Italien: "Italy",
  Frankreich: "France",
  Katar: "Qatar",
  Russland: "Russia",
  Europa: "Europe",
  Österreich: "Austria",
  Niederlande: "Netherlands",
  International: "International",
  "Australien und Neuseeland": "Australia & New Zealand",
};

export function competitionName(name: string, lang: Lang) {
  return lang === "en" ? (COMPETITION_EN[name] ?? name) : name;
}

export function countryLabel(country: string, lang: Lang) {
  return lang === "en" ? (COUNTRY_EN[country] ?? country) : country;
}

// ---------- Kurze Texte der Oberfläche ----------

const de = {
  // Navigation
  "nav.leagues": "Bewerbe",
  "nav.clubs": "Vereine",
  "nav.chains": "Torketten",
  "nav.compare": "Vergleich",
  "nav.records": "Rekorde",
  "nav.game": "Spiele",
  "nav.method": "So zählen wir",
  "nav.menuOpen": "Menü öffnen",
  "nav.menuClose": "Menü schließen",
  "nav.home": "PreAssists Startseite",
  "nav.skip": "Zum Inhalt springen",
  "footer.data": "Daten:",
  "footer.own": "Pre-Assists eigene Berechnung.",
  "footer.imprint": "Impressum",
  "footer.privacy": "Datenschutz",
  // Suche
  "search.placeholder": "Spieler suchen …",
  "search.label": "Spieler suchen",
  "search.none": "Kein Spieler gefunden",
  "search.loading": "Lädt …",
  // Allgemein
  "common.preAssists": "Pre-Assists",
  "common.preAssist": "Pre-Assist",
  "common.assist": "Assist",
  "common.assists": "Assists",
  "common.goal": "Tor",
  "common.goals": "Tore",
  "common.matches": "Spiele",
  "common.season": "Saison",
  "common.seasons": "Saisons",
  "common.minutes": "Minuten",
  "common.club": "Verein",
  "common.clubs": "Vereine",
  "common.nationalTeam": "Nationalteam",
  "common.nationalTeams": "Nationalteams",
  "common.allTeams": "Alle Teams",
  "common.top": "Spitze",
  "common.fullRanking": "Ganze Rangliste",
  "common.allPlayers": "Alle Spieler",
  "common.mostChains": "Häufigste Torketten",
  "common.chainHint": "Pre-Assist › Assist › Tor",
  "common.dataSoon": "Daten folgen",
  "common.live": "Live",
  "common.unknown": "Unbekannt",
  "common.ofGoals": "von {n} Toren",
  "common.withPre": "mit Pre-Assist",
  "common.withAssist": "mit Assist",
  "common.share": "Anteil",
  // Karte
  "card.pa": "PA",
  "card.ast": "AST",
  "card.goal": "TOR",
  "card.xpa": "xPA",
  "card.inv": "BET",
  "card.apps": "SP",
  // Tabelle
  "table.search": "Spieler suchen …",
  "table.minutesAll": "Alle Minuten",
  "table.minutesFrom": "ab {n} Min.",
  "table.per90": "pro 90 Minuten",
  "table.player": "Spieler",
  "table.team": "Team",
  "table.involved": "Beteiligt",
  "table.none": "Keine Spieler gefunden.",
  "table.showAll": "Alle {n} Spieler anzeigen",
  "table.pa.title": "Pass, der zum Assist führt",
  "table.xpa.title": "Erwartete Pre-Assists: xG aller Abschlüsse nach eigenen Pre-Assists, auch ohne Tor",
  "table.ast.title": "Letzter Pass vor dem Tor",
  "table.goals.title": "Tore ohne Eigentore",
  "table.inv.title": "Tore + Assists + Pre-Assists",
  "table.paxg.title": "Summe der Expected Goals der Tore nach eigenen Pre-Assists",
  "table.min.title": "Gespielte Minuten",
  "table.paxg": "Pre-Assist xG",
  // Spielzüge
  "chain.label": "Spielzug vom Pre-Assist bis zum Tor",
  "chain.replay": "↺ Nochmal abspielen",
  "chain.slow": "Zeitlupe",
  "chain.normal": "Normal",
  "chain.replayLabel": "Animierte Wiederholung des Spielzugs",
  "share.button": "Als Bild teilen",
  "share.busy": "Bild wird erstellt …",
  "share.done": "Fertig",
  // Pass-Arten
  "pass.Ecke": "Ecke",
  "pass.Freistoß": "Freistoß",
  "pass.Einwurf": "Einwurf",
  "pass.Abstoß": "Abstoß",
  "pass.Rückpass": "Rückpass",
  "pass.Flanke": "Flanke",
  "pass.Steilpass": "Steilpass",
  "pass.Hoher Ball": "Hoher Ball",
  "pass.Halbhoher Pass": "Halbhoher Pass",
  "pass.Langer Pass": "Langer Pass",
  "pass.Flachpass": "Flachpass",
  // Karte der Startpunkte
  "map.own": "eigenes Drittel",
  "map.mid": "Mittelfeld",
  "map.att": "Angriffsdrittel",
  // Netzwerk
  "net.title": "Passnetzwerk: Wer wen in Szene setzt",
  "net.pre": "Pre-Assist zum Vorlagengeber",
  "net.ast": "Vorlage zum Torschützen",
  "net.thick": "Dicke Linie = häufige Verbindung",
  "net.label": "Passnetzwerk der Tore",
  // Explorer
  "ex.searchChain": "Spieler in der Kette suchen …",
  "ex.allPass": "Alle Pass-Arten",
  "ex.sortDate": "Neueste zuerst",
  "ex.sortXg": "Größte Chance (xG)",
  "ex.sortLen": "Längster Pre-Assist",
  "ex.onlyPre": "nur mit Pre-Assist",
  "ex.oneTwo": "nur Doppelpässe",
  "common.oneTwo": "Doppelpass",
  "common.oneTwoNote": "Doppelpass: {name} spielt den Pre-Assist, bekommt den Ball zurück und trifft selbst.",
  "ex.loading": "Lade Torketten …",
  "ex.goal": "Tor",
  "ex.goals": "Tore",
  "ex.more": "Weitere {n} Tore laden",
  "ex.none": "Keine Tore für diese Filter.",
  "ex.sort": "Sortierung",
  "ex.passType": "Art des Pre-Assists",
  // Vergleich
  "cmp.random": "Zufallsduell",
  "cmp.swap": "⇄ Seiten tauschen",
  "cmp.categories": "Kategorien",
  "cmp.loading": "Lade Spieler …",
  "cmp.search": "{label}: Spieler suchen …",
  "cmp.p1": "Spieler 1",
  "cmp.p2": "Spieler 2",
  "cmp.pa90": "Pre-Assists pro 90",
  "cmp.xpa": "xPA (erwartete Pre-Assists)",
  "cmp.inv": "Torbeteiligungen",
  "cmp.inv90": "Beteiligungen pro 90",
  "cmp.apps": "Einsätze",
  // Spielerseite
  "pl.profile": "Spielerprofil",
  "pl.rank": "Platz in der Liga",
  "pl.pa90": "Pre-Assists pro 90 Min.",
  "pl.xpa": "xPA (erwartet)",
  "pl.chances": "Chancen nach Pre-Assist",
  "pl.inv": "Torbeteiligungen",
  "pl.apps": "Einsätze",
  "pl.compare": "Mit anderem Spieler vergleichen",
  "pl.partners": "Pre-Assists landeten bei",
  "pl.all": "Alle Pre-Assists {season}",
  "pl.where": "Wo die Pre-Assists starten",
  "pl.types": "Pass-Arten",
  "pl.curve": "Saisonverlauf",
  "pl.curveLabel": "Pre-Assists im Saisonverlauf",
  "pl.similar": "Ähnliche Spieler",
  "pl.similarNote": "Ähnlich viele Pre-Assists pro 90 Minuten in derselben Saison.",
  // Vereinsseite
  "club.where": "Wo die Angriffe beginnen",
  "club.squad": "Kader",
  "club.leagueRanking": "Liga-Rangliste",
  // Wettbewerb
  "comp.top8": "Top 8",
  "comp.teamOnly": "Für diese Saison gibt es nur die Spiele von {team} als offene Daten. Die Rangliste zeigt deshalb nur Spieler von {team}.",
  "comp.manual": "Diese Saison ist von Hand erfasst. Pre-Assists, Assists und Tore sind vollständig; xG-Werte und Spielminuten gibt es dafür nicht.",
  // Liga
  "league.prep": "In Vorbereitung",
  "league.allLeagues": "Alle Ligen ansehen",
  "league.seasonX": "Saison {s}",
  "league.rankingAll": "Rangliste und alle Spieler",
  "league.teamOnly": "Nur die Spiele von {team} sind ausgewertet.",
  // Startseite
  "home.daily": "Spielzug des Tages",
  "home.allChains": "Alle Torketten",
  "home.tournaments": "Turniere",
  "home.top3": "Top 3",
  "home.method": "So zählen wir Pre-Assists",
  // Newsletter
  "nl.kicker": "Newsletter",
  "nl.title": "Die Pre-Assists des Spieltags",
  "nl.text": "Einmal pro Woche: die besten Spielzüge, die stillen Architekten und neue Rekorde. Kostenlos, jederzeit abbestellbar.",
  "nl.button": "Anmelden",
  "nl.placeholder": "deine@mail.at",
  "nl.consent": "Du bekommst zuerst eine Bestätigungsmail. Mehr dazu:",
  // Teilen-Bilder
  "img.goal": "TOR",
  "img.rank": "PRE-ASSISTS · PLATZ {n}",
  // Erklärgrafik
  "ill.title": "Steckpass als Pre-Assist, Querleger als Assist, dann das Tor",
  "ill.pre": "Steckpass = Pre-Assist",
  "ill.ast": "Querleger = Assist",
  "ill.goal": "Tor",
  "lang.switch": "English",
};

export type TKey = keyof typeof de;

const en: Record<TKey, string> = {
  "nav.leagues": "Competitions",
  "nav.clubs": "Clubs",
  "nav.chains": "Goal chains",
  "nav.compare": "Compare",
  "nav.records": "Records",
  "nav.game": "Games",
  "nav.method": "Methodology",
  "nav.menuOpen": "Open menu",
  "nav.menuClose": "Close menu",
  "nav.home": "PreAssists home",
  "nav.skip": "Skip to content",
  "footer.data": "Data:",
  "footer.own": "Pre-assists calculated by PreAssists.",
  "footer.imprint": "Imprint (German)",
  "footer.privacy": "Privacy (German)",
  "search.placeholder": "Search players …",
  "search.label": "Search players",
  "search.none": "No player found",
  "search.loading": "Loading …",
  "common.preAssists": "Pre-assists",
  "common.preAssist": "Pre-assist",
  "common.assist": "Assist",
  "common.assists": "Assists",
  "common.goal": "Goal",
  "common.goals": "Goals",
  "common.matches": "Matches",
  "common.season": "season",
  "common.seasons": "seasons",
  "common.minutes": "Minutes",
  "common.club": "Club",
  "common.clubs": "Clubs",
  "common.nationalTeam": "National team",
  "common.nationalTeams": "National teams",
  "common.allTeams": "All teams",
  "common.top": "Leader",
  "common.fullRanking": "Full ranking",
  "common.allPlayers": "All players",
  "common.mostChains": "Most frequent goal chains",
  "common.chainHint": "Pre-assist › Assist › Goal",
  "common.dataSoon": "Data coming",
  "common.live": "Live",
  "common.unknown": "Unknown",
  "common.ofGoals": "of {n} goals",
  "common.withPre": "with pre-assist",
  "common.withAssist": "with assist",
  "common.share": "Share of goals",
  "card.pa": "PA",
  "card.ast": "A",
  "card.goal": "G",
  "card.xpa": "xPA",
  "card.inv": "INV",
  "card.apps": "APP",
  "table.search": "Search players …",
  "table.minutesAll": "All minutes",
  "table.minutesFrom": "{n}+ min",
  "table.per90": "per 90 minutes",
  "table.player": "Player",
  "table.team": "Team",
  "table.involved": "Involved",
  "table.none": "No players found.",
  "table.showAll": "Show all {n} players",
  "table.pa.title": "The pass that leads to the assist",
  "table.xpa.title": "Expected pre-assists: xG of all shots after the player's pre-assists, goal or not",
  "table.ast.title": "Last pass before the goal",
  "table.goals.title": "Goals excluding own goals",
  "table.inv.title": "Goals + assists + pre-assists",
  "table.paxg.title": "Sum of expected goals of the goals after the player's pre-assists",
  "table.min.title": "Minutes played",
  "table.paxg": "Pre-assist xG",
  "chain.label": "Move from pre-assist to goal",
  "chain.replay": "↺ Replay",
  "chain.slow": "Slow motion",
  "chain.normal": "Normal",
  "chain.replayLabel": "Animated replay of the move",
  "share.button": "Share as image",
  "share.busy": "Creating image …",
  "share.done": "Done",
  "pass.Ecke": "Corner",
  "pass.Freistoß": "Free kick",
  "pass.Einwurf": "Throw-in",
  "pass.Abstoß": "Goal kick",
  "pass.Rückpass": "Cut-back",
  "pass.Flanke": "Cross",
  "pass.Steilpass": "Through ball",
  "pass.Hoher Ball": "High ball",
  "pass.Halbhoher Pass": "Lofted pass",
  "pass.Langer Pass": "Long pass",
  "pass.Flachpass": "Ground pass",
  "map.own": "own third",
  "map.mid": "middle third",
  "map.att": "final third",
  "net.title": "Passing network: who sets up whom",
  "net.pre": "Pre-assist to the assist provider",
  "net.ast": "Assist to the goalscorer",
  "net.thick": "Thicker line = more frequent link",
  "net.label": "Passing network of the goals",
  "ex.searchChain": "Search a player in the chain …",
  "ex.allPass": "All pass types",
  "ex.sortDate": "Newest first",
  "ex.sortXg": "Biggest chance (xG)",
  "ex.sortLen": "Longest pre-assist",
  "ex.onlyPre": "only with pre-assist",
  "ex.oneTwo": "only one-twos",
  "common.oneTwo": "One-two",
  "common.oneTwoNote": "One-two: {name} plays the pre-assist, gets the ball back and scores.",
  "ex.loading": "Loading goal chains …",
  "ex.goal": "goal",
  "ex.goals": "goals",
  "ex.more": "Load {n} more goals",
  "ex.none": "No goals for these filters.",
  "ex.sort": "Sort",
  "ex.passType": "Pre-assist type",
  "cmp.random": "Random duel",
  "cmp.swap": "⇄ Swap sides",
  "cmp.categories": "categories",
  "cmp.loading": "Loading players …",
  "cmp.search": "{label}: search players …",
  "cmp.p1": "Player 1",
  "cmp.p2": "Player 2",
  "cmp.pa90": "Pre-assists per 90",
  "cmp.xpa": "xPA (expected pre-assists)",
  "cmp.inv": "Goal involvements",
  "cmp.inv90": "Involvements per 90",
  "cmp.apps": "Appearances",
  "pl.profile": "Player profile",
  "pl.rank": "Rank in the league",
  "pl.pa90": "Pre-assists per 90 min",
  "pl.xpa": "xPA (expected)",
  "pl.chances": "Shots after pre-assist",
  "pl.inv": "Goal involvements",
  "pl.apps": "Appearances",
  "pl.compare": "Compare with another player",
  "pl.partners": "Pre-assists ended up with",
  "pl.all": "All pre-assists {season}",
  "pl.where": "Where the pre-assists start",
  "pl.types": "Pass types",
  "pl.curve": "Over the season",
  "pl.curveLabel": "Pre-assists over the season",
  "pl.similar": "Similar players",
  "pl.similarNote": "Similar pre-assists per 90 minutes in the same season.",
  "club.where": "Where the attacks start",
  "club.squad": "Squad",
  "club.leagueRanking": "League ranking",
  "comp.top8": "Top 8",
  "comp.teamOnly": "For this season only {team}'s matches are available as open data, so the ranking only shows {team} players.",
  "comp.manual": "This season was recorded by hand. Pre-assists, assists and goals are complete; xG and minutes are not available.",
  "league.prep": "In preparation",
  "league.allLeagues": "See all leagues",
  "league.seasonX": "Season {s}",
  "league.rankingAll": "Ranking and all players",
  "league.teamOnly": "Only {team}'s matches are covered.",
  "home.daily": "Move of the day",
  "home.allChains": "All goal chains",
  "home.tournaments": "Tournaments",
  "home.top3": "Top 3",
  "home.method": "How we count pre-assists",
  "nl.kicker": "Newsletter",
  "nl.title": "The pre-assists of the matchday",
  "nl.text": "Once a week: the best moves, the hidden architects and new records. Free, unsubscribe any time.",
  "nl.button": "Subscribe",
  "nl.placeholder": "you@mail.com",
  "nl.consent": "You will receive a confirmation email first. Details:",
  "img.goal": "GOAL",
  "img.rank": "PRE-ASSISTS · RANK {n}",
  "ill.title": "Through ball as pre-assist, square pass as assist, then the goal",
  "ill.pre": "Through ball = pre-assist",
  "ill.ast": "Square pass = assist",
  "ill.goal": "Goal",
  "lang.switch": "Deutsch",
};

const DICT: Record<Lang, Record<TKey, string>> = { de, en };

export function t(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = DICT[lang][key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Pass-Art in der gewünschten Sprache (die Daten liefern die deutsche Bezeichnung). */
export function passLabel(lang: Lang, deLabel: string): string {
  const key = `pass.${deLabel}` as TKey;
  return key in de ? t(lang, key) : deLabel;
}

/** Hinweis für Suchmaschinen auf die Fassung in der anderen Sprache (hreflang). */
export function alternates(key: RouteKey, slug?: string) {
  return { languages: { de: url("de", key, slug), en: url("en", key, slug), "x-default": url("de", key, slug) } };
}

/** Längere Texte direkt im Code: deutsche und englische Fassung nebeneinander. */
export function pick<T>(lang: Lang, de: T, en: T): T {
  return lang === "en" ? en : de;
}

// Positionskürzel: Daten liefern deutsche Kürzel, auf Englisch die üblichen englischen
const POSITION_EN: Record<string, string> = {
  TW: "GK",
  IV: "CB",
  LV: "LB",
  RV: "RB",
  ZDM: "CDM",
  ZM: "CM",
  LM: "LM",
  RM: "RM",
  ZOM: "CAM",
  LF: "LW",
  RF: "RW",
  ST: "ST",
};

export function positionLabel(position: string | null, lang: Lang): string | null {
  return position && lang === "en" ? (POSITION_EN[position] ?? position) : position;
}
