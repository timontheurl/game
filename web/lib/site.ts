// Angaben für Impressum und Datenschutz. Bitte vor dem Veröffentlichen ausfüllen.
// Solange ein Feld leer ist, zeigt die Seite einen deutlichen Platzhalter.
export const SITE = {
  name: "PreAssists",
  domain: "preassists.at",
  owner: {
    name: "Timon Theurl",
    street: "Paletzgasse 8",
    city: "1160 Wien",
    country: "Österreich",
    email: "timontheurl@gmail.com",
  },
  // Newsletter: Formular-Adresse des Anbieters eintragen (z. B. Brevo oder Buttondown).
  // Solange sie leer ist, wird kein Anmeldeformular angezeigt.
  newsletter: {
    provider: "", // Name des Anbieters für die Datenschutzerklärung, z. B. "Brevo (Sendinblue SAS, Paris)"
    action: "", // Formular-URL des Anbieters
    emailField: "email", // Name des E-Mail-Felds, den der Anbieter erwartet
    privacyUrl: "", // Datenschutzerklärung des Anbieters
  },
};

// Erfassung: Hier speichert /erfassen die händisch erfassten Saisons (direkt ins Repository).
export const DATA_REPO = {
  owner: "timontheurl",
  repo: "game",
  branch: "main",
  dir: "web/data/manual",
};

export function filled(value: string) {
  return value.trim().length > 0;
}
