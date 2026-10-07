import PlayerGame from "@/components/PlayerGame";
import { pick, type Lang } from "@/lib/i18n";

export default function GameView({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="page-intro">
        <h1>{pick(lang, "Das Pre-Assist-Spiel", "The pre-assist game")}</h1>
        <p>
          {pick(
            lang,
            "Wie gut kennst du die Vorbereiter? Schätze, wer mehr Pre-Assists hatte – oder errate den Spieler aus seinen Werten.",
            "How well do you know the playmakers? Guess who had more pre-assists – or work out the player from their numbers.",
          )}
        </p>
      </section>
      <section className="section">
        <PlayerGame lang={lang} />
      </section>
    </>
  );
}
