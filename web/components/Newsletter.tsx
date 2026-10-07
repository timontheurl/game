import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { SITE, filled } from "@/lib/site";

/**
 * Anmeldung zum Newsletter. Das Formular schickt die Adresse direkt an den Anbieter
 * (Double-Opt-in läuft dort). Ohne eingetragenen Anbieter wird nichts angezeigt.
 */
export default function Newsletter({ lang = "de" }: { lang?: Lang }) {
  const n = SITE.newsletter;
  if (!filled(n.action)) return null;
  return (
    <section className="newsletter">
      <div>
        <span className="league-kicker">{t(lang, "nl.kicker")}</span>
        <h2>{t(lang, "nl.title")}</h2>
        <p className="muted">{t(lang, "nl.text")}</p>
      </div>
      <form action={n.action} method="post" target="_blank" className="newsletter-form">
        <input type="email" name={n.emailField} required placeholder={t(lang, "nl.placeholder")} aria-label="E-Mail" />
        <button type="submit" className="btn">
          {t(lang, "nl.button")}
        </button>
        <small className="muted">
          {t(lang, "nl.consent")} <Link href="/datenschutz/">{t(lang, "footer.privacy")}</Link>
        </small>
      </form>
    </section>
  );
}
