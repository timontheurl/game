import type { Metadata } from "next";
import Link from "next/link";
import { getRecords } from "@/lib/records";

export const metadata: Metadata = {
  title: "Rekorde",
  description: "Die Bestwerte bei Pre-Assists: meiste in einer Saison, beste Quote, längster Pass, eingespieltestes Trio.",
};

export default function RekordePage() {
  const records = getRecords();
  return (
    <>
      <section className="page-intro">
        <h1>Rekorde</h1>
        <p>Die Bestwerte aus allen vollständig ausgewerteten Saisons. Wer bereitet am meisten vor – und wer am weitesten?</p>
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
            </article>
          );
        })}
      </section>
    </>
  );
}
