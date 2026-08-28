import { publishedIncidents, lastAddedAt } from "@/lib/db";
import { formatPublicDate, formatRelative, hostnameOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; err?: string }>;
}) {
  const query = await searchParams;
  const incidents = publishedIncidents();
  const last = lastAddedAt(incidents);

  return (
    <div className="wrap">
      <header className="site">
        <h1>Agentboard</h1>
        <p className="subhead">A public ticker of AI-agent incidents.</p>
      </header>

      {incidents.length === 0 ? (
        <p className="empty">No incidents yet.</p>
      ) : (
        <ol className="board">
          {incidents.map((item) => (
            <li className="card" key={item.id}>
              <div className="meta">
                <time dateTime={item.publicDate}>{formatPublicDate(item.publicDate)}</time>
                <span className="who">{item.who}</span>
                <span className="status" data-status={item.status}>
                  {item.status}
                </span>
              </div>
              <p className="summary">{item.summary}</p>
              <a className="source" href={item.sourceUrl} rel="noopener noreferrer">
                {hostnameOf(item.sourceUrl)}
              </a>
            </li>
          ))}
        </ol>
      )}

      <footer className="site">
        {incidents.length} incident{incidents.length === 1 ? "" : "s"}
        {last ? ` · last added ${formatRelative(last)}` : ""}
      </footer>

      <section className="submit">
        <p>Paste a public source URL. It is reviewed before it appears here.</p>
        <form className="row" action="/api/submit" method="post">
          <input
            type="url"
            name="url"
            required
            placeholder="https://"
            autoComplete="off"
            inputMode="url"
          />
          <button type="submit">Send</button>
        </form>
        {query.submitted === "1" ? (
          <p className="note ok">Received.</p>
        ) : null}
        {query.err === "url" ? (
          <p className="note">Need a public http(s) URL.</p>
        ) : null}
      </section>
    </div>
  );
}
