import { useState } from "react";
import { api } from "./api.js";

const card = { border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 };
const input = { display: "block", width: "100%", margin: "6px 0", padding: 6 };
const button = { padding: "6px 14px", marginTop: 8, cursor: "pointer" };
const pre = { background: "#f6f6f6", padding: 10, borderRadius: 6, maxHeight: 200, overflow: "auto", fontSize: 12 };

export default function App() {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>ThoughtSpot C# SDK — Full-Stack Demo</h1>

      <SearchUsersCard />
      <LiveboardCard />
    </div>
  );
}

function SearchUsersCard() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setUsers(await api.searchUsers(query));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section style={card}>
      <h2>1. Search users</h2>
      <form onSubmit={search}>
        <input style={input} placeholder="name filter (optional)" value={query}
          onChange={(e) => setQuery(e.target.value)} />
        <button style={button} type="submit">Search</button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.name} — {u.displayName}</li>
        ))}
      </ul>
    </section>
  );
}

function LiveboardCard() {
  const [query, setQuery] = useState("");
  const [liveboards, setLiveboards] = useState([]);
  const [tml, setTml] = useState(null);
  const [error, setError] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const results = await api.searchLiveboards(query);
      setLiveboards(results);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadTml = async (id) => {
    setError(null);
    setTml(null);
    try {
      setTml(await api.exportTml(id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section style={card}>
      <h2>2–3. Search / TML-export a liveboard</h2>
      <form onSubmit={search}>
        <input style={input} placeholder="liveboard name filter (optional)" value={query}
          onChange={(e) => setQuery(e.target.value)} />
        <button style={button} type="submit">Search liveboards</button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <ul>
        {liveboards.map((lb) => (
          <li key={lb.id} style={{ marginBottom: 6 }}>
            {lb.name}{" "}
            <button style={button} onClick={() => loadTml(lb.id)}>Export TML</button>
          </li>
        ))}
      </ul>

      {tml && <pre style={pre}>{JSON.stringify(tml, null, 2)}</pre>}
    </section>
  );
}
