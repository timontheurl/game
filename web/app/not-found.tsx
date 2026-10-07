import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found">
      <span className="nf-flag" aria-hidden="true" />
      <h1>
        Abseits<span>!</span>
      </h1>
      <p>Diese Seite gibt es nicht – oder sie stand beim Pass einen Schritt zu weit vorne.</p>
      <p className="muted" lang="en">
        Offside! This page doesn&apos;t exist – or it was a step too far forward when the pass was played.
      </p>
      <div className="nf-links">
        <Link href="/" className="btn">
          Zur Startseite
        </Link>
        <Link href="/ligen/" className="btn btn-ghost">
          Alle Ligen
        </Link>
        <Link href="/en/" className="btn btn-ghost" hrefLang="en">
          English
        </Link>
      </div>
    </section>
  );
}
