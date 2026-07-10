import { useState } from "react";
import { api } from "../api.js";
import { SearchIcon } from "../icons.jsx";

const initials = (name) =>
  (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export default function SearchUsersCard() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setUsers(await api.searchUsers(query));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon">👤</div>
        <div>
          <h2 className="card-title">Search users</h2>
          <p className="card-desc">
            Calls <code>SearchUsers</code> against the configured cluster and lists matching accounts.
          </p>
        </div>
      </div>

      <div className="card-body">
        <form className="field-row" onSubmit={search}>
          <div className="input-wrap">
            <span className="input-icon"><SearchIcon /></span>
            <input
              className="input"
              placeholder="Name filter (optional)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="error-banner">{error}</p>}

        {users.length > 0 && (
          <>
            <p className="section-label">Users ({users.length})</p>
            <ul className="result-list">
              {users.map((u, i) => (
                <li className="result-row" style={{ animationDelay: `${i * 30}ms` }} key={u.id}>
                  <div className="result-main">
                    <div className="avatar">{initials(u.displayName ?? u.name)}</div>
                    <div className="truncate">
                      <div className="result-name truncate">{u.displayName ?? u.name}</div>
                      <div className="result-sub truncate">{u.name}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {searched && !loading && users.length === 0 && !error && (
          <p className="empty-state">No users matched that filter.</p>
        )}
      </div>
    </section>
  );
}
