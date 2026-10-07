import ChainExplorer from "@/components/ChainExplorer";
import { getSeasons, seasonLabel } from "@/lib/data";
import { pick, t, type Lang } from "@/lib/i18n";

export default function ChainsView({ lang }: { lang: Lang }) {
  // Volle Saisons zuerst, sie haben die meisten Tore
  const seasons = [...getSeasons(lang)]
    .sort((a, b) => Number(b.meta.coverage === "full") - Number(a.meta.coverage === "full"))
    .map((s) => ({ slug: s.meta.slug, label: seasonLabel(s.meta) }));

  return (
    <>
      <section className="page-intro">
        <h1>{t(lang, "nav.chains")}</h1>
        <p>
          {pick(
            lang,
            "Jedes Tor als Spielzug: vom Pre-Assist über die Vorlage bis zum Abschluss. Filtere nach Team, Spieler oder Pass-Art und sieh dir den Angriff als Animation an.",
            "Every goal as a move: from the pre-assist through the assist to the finish. Filter by team, player or pass type and watch the attack as an animation.",
          )}
        </p>
      </section>
      <section className="section">
        <ChainExplorer seasons={seasons} lang={lang} />
      </section>
    </>
  );
}
