import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found">
      <span className="nf-flag" aria-hidden="true" />
      <h1>
        Abseits<span>!</span>
      </h1>
      <p>Diese Seite gibt es nicht – oder sie stand beim Pass einen Schritt zu weit vorne.</p>
      <div className="nf-links">
        <Link href="/" className="btn">
          Zur Startseite
        </Link>
        <Link href="/ligen/" className="btn btn-ghost">
          Alle Ligen
        </Link>
      </div>
    </section>
  );
}
