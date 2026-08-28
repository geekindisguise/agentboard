import { adminConfigured, isAdmin } from "@/lib/auth";
import { pendingIncidents } from "@/lib/db";
import { hostnameOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const configured = adminConfigured();
  const authed = await isAdmin();

  return (
    <div className="wrap">
      <header className="site">
        <h1>Agentboard</h1>
        <p className="subhead">Admin</p>
      </header>

      {!configured ? (
        <p className="empty">Admin is not configured.</p>
      ) : !authed ? (
        <section className="submit">
          <form action="/api/admin/login" method="post">
            <label className="field">
              Password
              <input type="password" name="password" required autoComplete="current-password" />
            </label>
            <div className="actions" style={{ marginTop: "0.7rem" }}>
              <button type="submit">Enter</button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <div className="admin-bar">
            <p className="subhead" style={{ margin: 0 }}>
              Pending
            </p>
            <form action="/api/admin/logout" method="post">
              <button type="submit">Leave</button>
            </form>
          </div>

          {pendingIncidents().length === 0 ? (
            <p className="empty">Nothing waiting.</p>
          ) : (
            <ul className="admin-list">
              {pendingIncidents().map((item) => (
                <li className="admin-item" key={item.id}>
                  <div className="meta">
                    <span>{hostnameOf(item.sourceUrl)}</span>
                    <span>{item.title || "untitled"}</span>
                  </div>
                  <a className="source" href={item.sourceUrl} rel="noopener noreferrer">
                    {item.sourceUrl}
                  </a>
                  <form action="/api/admin/action" method="post">
                    <input type="hidden" name="id" value={item.id} />
                    <label className="field">
                      One-liner
                      <textarea name="summary" required defaultValue={item.summary} maxLength={400} />
                    </label>
                    <label className="field">
                      Who
                      <input type="text" name="who" required defaultValue={item.who} maxLength={80} />
                    </label>
                    <label className="field">
                      Public date
                      <input type="date" name="publicDate" required defaultValue={item.publicDate} />
                    </label>
                    <label className="field">
                      Status
                      <select name="status" defaultValue={item.status}>
                        <option value="reported">reported</option>
                        <option value="denied">denied</option>
                        <option value="official writeup">official writeup</option>
                      </select>
                    </label>
                    <div className="actions">
                      <button type="submit" name="action" value="publish">
                        Publish
                      </button>
                      <button type="submit" name="action" value="edit">
                        Save
                      </button>
                      <button type="submit" name="action" value="reject">
                        Reject
                      </button>
                    </div>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
