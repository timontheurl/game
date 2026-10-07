import PlayerCompare from "@/components/PlayerCompare";
import { pick, type Lang } from "@/lib/i18n";

export default function CompareView({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="page-intro">
        <h1>{pick(lang, "Spielervergleich", "Player comparison")}</h1>
        <p>
          {pick(
            lang,
            "Zwei Spieler, ein Duell. Wähle beliebige Spieler aus allen Ligen und Saisons – oder lass den Zufall entscheiden.",
            "Two players, one duel. Pick any players from all leagues and seasons – or let chance decide.",
          )}
        </p>
      </section>
      <section className="section">
        <PlayerCompare lang={lang} />
      </section>
    </>
  );
}
