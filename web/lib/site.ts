// Angaben für Impressum und Datenschutz. Bitte vor dem Veröffentlichen ausfüllen.
// Solange ein Feld leer ist, zeigt die Seite einen deutlichen Platzhalter.
export const SITE = {
  name: "PreAssists",
  domain: "preassists.at",
  owner: {
    name: "Timon Theurl",
    street: "Paletzgasse", // TODO: Hausnummer ergänzen
    city: "1160 Wien",
    country: "Österreich",
    email: "timontheurl@gmail.com",
  },
};

export function filled(value: string) {
  return value.trim().length > 0;
}
