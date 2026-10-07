import Link from "next/link";
import { SITE, filled } from "@/lib/site";

/**
 * Anmeldung zum Newsletter. Das Formular schickt die Adresse direkt an den Anbieter
 * (Double-Opt-in läuft dort). Ohne eingetragenen Anbieter wird nichts angezeigt.
 */
export default function Newsletter() {
  const n = SITE.newsletter;
  if (!filled(n.action)) return null;
  return (
    <section className="newsletter">
      <div>
        <span className="league-kicker">Newsletter</span>
        <h2>Die Pre-Assists des Spieltags</h2>
        <p className="muted">
          Einmal pro Woche: die besten Spielzüge, die stillen Architekten und neue Rekorde. Kostenlos, jederzeit
          abbestellbar.
        </p>
      </div>
      <form action={n.action} method="post" target="_blank" className="newsletter-form">
        <input type="email" name={n.emailField} required placeholder="deine@mail.at" aria-label="E-Mail-Adresse" />
        <button type="submit" className="btn">
          Anmelden
        </button>
        <small className="muted">
          Mit der Anmeldung stimmst du der <Link href="/datenschutz/">Datenschutzerklärung</Link> zu. Du bekommst
          zuerst eine Bestätigungsmail.
        </small>
      </form>
    </section>
  );
}
