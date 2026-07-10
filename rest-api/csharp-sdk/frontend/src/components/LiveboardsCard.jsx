import { useState } from "react";
import { api } from "../api.js";
import { SearchIcon, CopyIcon } from "../icons.jsx";

export default function LiveboardsCard() {
  const [query, setQuery] = useState("");
  const [liveboards, setLiveboards] = useState([]);
  const [tml, setTml] = useState(null);
  const [tmlForId, setTmlForId] = useState(null);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setError(null);
    setSearching(true);
    // A previous export shouldn't linger under a fresh set of results —
    // it read as if the first result had already been opened for you.
    setTml(null);
    setTmlForId(null);
    try {
      setLiveboards(await api.searchLiveboards(query));
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const loadTml = async (lb) => {
    setError(null);
    setTml(null);
    setCopied(false);
    setTmlForId(lb.id);
    setExportingId(lb.id);
    try {
      setTml(await api.exportTml(lb.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingId(null);
    }
  };

  const copyTml = async () => {
    await navigator.clipboard.writeText(JSON.stringify(tml, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon">📊</div>
        <div>
          <h2 className="card-title">Search &amp; export liveboards</h2>
          <p className="card-desc">
            Search liveboards, then export any result's TML via <code>ExportMetadataTML</code>.
          </p>
        </div>
      </div>

      <div className="card-body">
        <form className="field-row" onSubmit={search}>
          <div className="input-wrap">
            <span className="input-icon"><SearchIcon /></span>
            <input
              className="input"
              placeholder="Liveboard name filter (optional)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="error-banner">{error}</p>}

        {liveboards.length > 0 && (
          <>
            <p className="section-label">Liveboards ({liveboards.length})</p>
            <ul className="result-list">
            {liveboards.map((lb, i) => (
              <li className="result-row" style={{ animationDelay: `${i * 30}ms` }} key={lb.id}>
                <span className="result-name truncate">{lb.name}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadTml(lb)}
                  disabled={exportingId === lb.id}
                >
                  {exportingId === lb.id ? "Exporting…" : "Export TML"}
                </button>
              </li>
            ))}
            </ul>
          </>
        )}

        {searched && !searching && liveboards.length === 0 && !error && (
          <p className="empty-state">No liveboards matched that filter.</p>
        )}

        {tml && (
          <div className="code-block-wrap">
            <button className="btn btn-secondary btn-sm code-block-copy" onClick={copyTml}>
              {copied ? "Copied!" : <CopyIcon />}
            </button>
            <pre className="code-block">
              {liveboards.find((lb) => lb.id === tmlForId)?.name ? (
                <span style={{ color: "var(--text-muted)" }}>
                  // {liveboards.find((lb) => lb.id === tmlForId).name}
                  {"\n"}
                </span>
              ) : null}
              {JSON.stringify(tml, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
