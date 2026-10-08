import Link from "next/link";
import { pick, url, type Lang } from "@/lib/i18n";

// Übersicht „Spiele“: alle Spiele rund um den Pre-Assist

function MiniPitch() {
  // Kleine Szene: du (orange) mit drei möglichen Pässen
  return (
    <svg viewBox="38 -2 86 84" className="games-art" aria-hidden="true">
      <g className="pitch-markings">
        <rect x={40} y={0} width={80} height={80} />
        <line x1={60} y1={0} x2={60} y2={80} />
        <rect x={102} y={18} width={18} height={44} />
        <rect x={114} y={30} width={6} height={20} />
      </g>
      <g className="games-art-options">
        <line x1={74} y1={30} x2={100} y2={13} />
        <line x1={74} y1={30} x2={104} y2={38} />
        <line x1={74} y1={30} x2={84} y2={56} />
      </g>
      <circle cx={100} cy={13} r={2.6} className="is-mate" />
      <circle cx={104} cy={38} r={2.6} className="is-mate" />
      <circle cx={84} cy={56} r={2.6} className="is-mate" />
      <circle cx={92} cy={28} r={2.6} className="is-opp" />
      <circle cx={109} cy={45} r={2.6} className="is-opp" />
      <circle cx={117} cy={40} r={2.6} className="is-keeper" />
      <circle cx={74} cy={30} r={3} className="is-you" />
    </svg>
  );
}

export default function GamesView({ lang }: { lang: Lang }) {
  const games = [
    {
      href: url(lang, "passspiel"),
      kicker: pick(lang, "Neu", "New"),
      title: pick(lang, "Finde den Pre-Assist", "Find the pre-assist"),
      text: pick(
        lang,
        "Du hast den Ball. Spielst du gleich den Assist, einen Fehlpass – oder den Pass davor? Entscheide, wohin der Ball geht, und schau, was daraus wird.",
        "You have the ball. Do you go straight for the assist, misplace it – or play the pass before? Choose where the ball goes and watch what happens.",
      ),
      cta: pick(lang, "Jetzt spielen", "Play now"),
      art: <MiniPitch />,
    },
    {
      href: url(lang, "spiel"),
      kicker: pick(lang, "Quiz", "Quiz"),
      title: pick(lang, "Mehr oder weniger?", "Higher or lower?"),
      text: pick(
        lang,
        "Zwei Spieler, eine Frage: Wer hatte mehr Pre-Assists? Liegst du richtig, kommt der nächste – wie lang wird deine Serie?",
        "Two players, one question: who had more pre-assists? Get it right and the next one comes in – how long can your streak get?",
      ),
      cta: pick(lang, "Spielen", "Play"),
      art: <span className="games-icon">↑↓</span>,
    },
    {
      href: `${url(lang, "spiel")}?modus=raten`,
      kicker: pick(lang, "Quiz", "Quiz"),
      title: pick(lang, "Wer ist es?", "Who is it?"),
      text: pick(
        lang,
        "Nur Werte, kein Name: Erkennst du den Spieler an seinen Pre-Assists, Assists und Toren?",
        "Numbers only, no name: can you spot the player from their pre-assists, assists and goals?",
      ),
      cta: pick(lang, "Spielen", "Play"),
      art: <span className="games-icon">?</span>,
    },
  ];

  return (
    <>
      <section className="page-intro">
        <h1>{pick(lang, "Spiele", "Games")}</h1>
        <p>
          {pick(
            lang,
            "Teste dein Auge für den Pass vor dem Assist – auf dem Spielfeld oder im Zahlen-Quiz.",
            "Test your eye for the pass before the assist – on the pitch or in the numbers quiz.",
          )}
        </p>
      </section>
      <section className="section games-grid">
        {games.map((g, i) => (
          <Link key={g.href} href={g.href} className={`games-card ${i === 0 ? "is-featured" : ""}`}>
            <div className="games-card-art">{g.art}</div>
            <div className="games-card-body">
              <span className="league-kicker">{g.kicker}</span>
              <h2>{g.title}</h2>
              <p className="muted">{g.text}</p>
              <span className="btn btn-small">{g.cta} ›</span>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
