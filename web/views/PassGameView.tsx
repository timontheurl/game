import Link from "next/link";
import PassGame from "@/components/PassGame";
import { pick, url, type Lang } from "@/lib/i18n";

export default function PassGameView({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="page-intro">
        <Link href={url(lang, "spiele")} className="pg-back">
          ‹ {pick(lang, "Alle Spiele", "All games")}
        </Link>
        <h1>{pick(lang, "Finde den Pre-Assist", "Find the pre-assist")}</h1>
        <p>
          {pick(
            lang,
            "Du hast den Ball. Such den Pass, aus dem der Pre-Assist wird – also den Pass zu dem Mitspieler, der dann das Tor vorbereitet. Gleich den Assist zu spielen bringt nur einen Punkt.",
            "You have the ball. Find the pass that becomes the pre-assist – the pass to the teammate who then sets up the goal. Going straight for the assist only earns one point.",
          )}
        </p>
      </section>
      <section className="section">
        <PassGame lang={lang} />
      </section>
      <section className="section pg-rules">
        <h2 className="section-title">{pick(lang, "So wird gezählt", "How it's scored")}</h2>
        <ul>
          <li>
            <b>{pick(lang, "Pre-Assist: 3 Punkte.", "Pre-assist: 3 points.")}</b>{" "}
            {pick(
              lang,
              "Dein Pass erreicht den Mitspieler, der danach die Vorlage zum Tor gibt. Er darf vorher dribbeln.",
              "Your pass reaches the teammate who then sets up the goal. They may dribble first.",
            )}
          </li>
          <li>
            <b>{pick(lang, "Assist: 1 Punkt.", "Assist: 1 point.")}</b>{" "}
            {pick(lang, "Tor, aber dein Pass war schon die Vorlage.", "Goal, but your pass was already the assist.")}
          </li>
          <li>
            <b>{pick(lang, "Kein Punkt:", "No points:")}</b>{" "}
            {pick(
              lang,
              "Fehlpass, kein Tor, zu früh (dein Pass kam noch vor dem Pre-Assist) oder ein Tor ohne Assist – nach Abpraller, abgefälschtem Ball oder Elfmeter.",
              "misplaced pass, no goal, too early (your pass came before the pre-assist) or a goal without an assist – after a rebound, a deflection or a penalty.",
            )}
          </li>
        </ul>
        <p className="muted">
          {pick(lang, "Die Regeln sind dieselben wie in unseren Ranglisten –", "The rules are the same as in our rankings –")}{" "}
          <Link href={url(lang, "methodik")} className="text-link">
            {pick(lang, "zur Methodik", "see the methodology")}
          </Link>
          .
        </p>
      </section>
    </>
  );
}
