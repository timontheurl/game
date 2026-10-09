import Link from "next/link";
import { pick, t, type Lang } from "@/lib/i18n";
import { getRecords } from "@/lib/records";

export default function RecordsView({ lang }: { lang: Lang }) {
  const records = getRecords(lang);
  return (
    <>
      <section className="page-intro">
        <h1>{t(lang, "nav.records")}</h1>
        <p>
          {pick(
            lang,
            "Die Bestwerte aus allen vollständig ausgewerteten Saisons. Wer bereitet am meisten vor – und wer am weitesten?",
            "The best values from all fully covered seasons. Who creates the most – and from the furthest away?",
          )}
        </p>
      </section>
      <section className="section record-grid">
        {records.map((r) => {
          const [first, ...rest] = r.entries;
          if (!first) return null;
          return (
            <article key={r.key} className="record">
              <header>
                <h2>{r.title}</h2>
                <p>{r.note}</p>
              </header>
              <div className="record-top">
                <span className="record-value">
                  {first.value}
                  <small>{r.unit}</small>
                </span>
                <span className="record-who">
                  {first.href ? <Link href={first.href}>{first.name}</Link> : first.name}
                  <small>{first.context}</small>
                </span>
              </div>
              <ol className="record-rest" start={2}>
                {rest.map((e, i) => (
                  <li key={`${e.name}-${i}`}>
                    <span className="rr-name">
                      {e.href ? <Link href={e.href}>{e.name}</Link> : e.name}
                      <small>{e.context}</small>
                    </span>
                    <b>{e.value}</b>
                  </li>
                ))}
              </ol>
              {r.more && (
                <Link href={r.more.href} className="text-link record-more">
                  {r.more.label} ›
                </Link>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
