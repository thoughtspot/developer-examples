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

      <CreateUserCard />
      <StyleCard />
      <SearchUsersCard />
      <LiveboardCard />
    </div>
  );
}

function CreateUserCard() {
  const [form, setForm] = useState({ name: "", displayName: "", email: "", password: "" });
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setResult(null);
    try {
      const created = await api.createUser(form);
      setResult(created);
    } catch (err) {
      setResult({ error: err.message });
    }
  };

  return (
    <section style={card}>
      <h2>1. Create user</h2>
      <form onSubmit={submit}>
        <input style={input} placeholder="username" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input style={input} placeholder="display name" value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
        <input style={input} placeholder="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input style={input} placeholder="password" type="password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button style={button} type="submit">Create user</button>
      </form>
      {result && <pre style={pre}>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}

function StyleCard() {
  const [baseColor, setBaseColor] = useState("#2359B6");
  const [footerText, setFooterText] = useState("Powered by ThoughtSpot");
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setResult(null);
    try {
      const res = await api.updateStyle({ baseColor, footerText });
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    }
  };

  return (
    <section style={card}>
      <h2>2. Style customization</h2>
      <form onSubmit={submit}>
        <label>Nav panel color</label>
        <input style={input} type="color" value={baseColor} onChange={(e) => setBaseColor(e.target.value)} />
        <label>Footer text</label>
        <input style={input} value={footerText} onChange={(e) => setFooterText(e.target.value)} />
        <button style={button} type="submit">Apply style</button>
      </form>
      {result && <pre style={pre}>{JSON.stringify(result, null, 2)}</pre>}
    </section>
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
      <h2>3. Search users</h2>
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
  const [exportingId, setExportingId] = useState(null);

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

  const exportPdf = async (lb) => {
    setError(null);
    setExportingId(lb.id);
    try {
      await api.exportLiveboard(lb.id, lb.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingId(null);
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
      <h2>4–6. Search / export / TML a liveboard</h2>
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
            <button style={button} onClick={() => exportPdf(lb)} disabled={exportingId === lb.id}>
              {exportingId === lb.id ? "Exporting…" : "Export PDF"}
            </button>{" "}
            <button style={button} onClick={() => loadTml(lb.id)}>Export TML</button>
          </li>
        ))}
      </ul>

      {tml && <pre style={pre}>{JSON.stringify(tml, null, 2)}</pre>}
    </section>
  );
}
