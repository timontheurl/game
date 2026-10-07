import ClubTile from "@/components/ClubTile";
import { getSeasons, seasonClubs, seasonLabel } from "@/lib/data";
import { pick, t, type Lang } from "@/lib/i18n";

export default function ClubsView({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="page-intro">
        <h1>{t(lang, "nav.clubs")}</h1>
        <p>
          {pick(
            lang,
            "Welche Mannschaft spielt ihre Tore am häufigsten über zwei Stationen heraus? Sortiert nach Pre-Assists.",
            "Which team creates its goals most often through two passes? Sorted by pre-assists.",
          )}
        </p>
      </section>
      {getSeasons(lang).map((season) => (
        <section key={season.meta.slug} className="section">
          <h2 className="section-title">{seasonLabel(season.meta)}</h2>
          <div className="club-grid">
            {seasonClubs(season, lang).map((c, i) => (
              <ClubTile key={c.club.slug} {...c} rank={i + 1} lang={lang} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
