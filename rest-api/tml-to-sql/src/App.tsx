import { useEffect, useMemo, useState } from "react";
import { ApiError, DataSource, distinctValues, listDataSources, loadSchema, post, Schema } from "./api";
import { Filter, FilterOp, Selection, toAnswerTml, toRuntimeOverrides, toSearchQuery } from "./tml";
import tmlSource from "./tml.ts?raw";

const OPS: FilterOp[] = ["EQ", "NE", "IN", "GT", "GE", "LT", "LE", "CONTAINS", "BEGINS_WITH", "ENDS_WITH"];
const EMPTY_SCHEMA: Schema = { columns: [], parameters: [] };

type Mode = "tml" | "model" | "searchdata";
type Param = { name: string; value: string };
type Formula = { name: string; expr: string };
type Keyed<T> = T & { key: number };

let nextKey = 0;

interface Result {
  path: string;
  body?: unknown;
  sql?: string;
  table?: { columns: string[]; rows: unknown[][] };
  error?: string;
  note?: string;
  loading?: boolean;
}

function request(mode: Mode, sel: Selection): [string, unknown] {
  if (mode === "tml") return ["/metadata/sql/tml", { answer_tml: JSON.stringify(toAnswerTml(sel)) }];
  const body = {
    query_string: toSearchQuery(sel.columns),
    logical_table_identifier: sel.dataSource.id,
    ...toRuntimeOverrides(sel),
  };
  if (mode === "model") return ["/metadata/sql/model", body];
  return ["/searchdata", { ...body, include_sql: true, record_size: 20 }];
}

const errorText = (err: unknown) =>
  err instanceof ApiError ? `${err.message}\n${JSON.stringify(err.body, null, 2)}` : String(err);

export function App() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>();
  const [schema, setSchema] = useState(EMPTY_SCHEMA);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Keyed<Filter>[]>([]);
  const [parameters, setParameters] = useState<Keyed<Param>[]>([]);
  const [formulas, setFormulas] = useState<Keyed<Formula>[]>([]);
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    listDataSources()
      .then(setDataSources)
      .catch((err) => setResult({ path: "/metadata/search", error: errorText(err) }));
  }, []);

  useEffect(() => {
    setColumns([]);
    setFilters([]);
    setParameters([]);
    setFormulas([]);
    setSchema(EMPTY_SCHEMA);
    if (!dataSource) return;
    let stale = false;
    setSchemaLoading(true);
    loadSchema(dataSource.id)
      .then((s) => !stale && setSchema(s))
      .catch((err) => !stale && setResult({ path: "/metadata/tml/export", error: errorText(err) }))
      .finally(() => !stale && setSchemaLoading(false));
    return () => {
      stale = true;
    };
  }, [dataSource]);

  const selection = useMemo<Selection | undefined>(
    () =>
      dataSource && {
        dataSource: { id: dataSource.id, name: dataSource.name },
        columns,
        filters: filters.filter((f) => f.column && f.values.some(Boolean)),
        parameters: parameters.filter((p) => p.name),
        formulas: formulas.filter((f) => f.name && f.expr),
      },
    [dataSource, columns, filters, parameters, formulas],
  );

  const tml = selection ? JSON.stringify(toAnswerTml(selection), null, 2) : "";

  async function run(mode: Mode) {
    if (!selection || !(selection.columns.length + selection.formulas.length)) {
      setResult({ path: "", error: "Pick a data source and at least one column." });
      return;
    }
    const [path, body] = request(mode, selection);
    const note =
      mode !== "tml" && selection.formulas.length
        ? "Ad-hoc formulas are ignored here: query_string cannot define them. Use Get SQL from TML."
        : undefined;
    setResult({ path, body, note, loading: true });
    try {
      const res = await post<any>(path, body);
      if (mode === "searchdata") {
        const c = res.contents?.[0] ?? {};
        setResult({
          path,
          body,
          note,
          sql: c.sql_query,
          table: { columns: c.column_names ?? [], rows: c.data_rows ?? [] },
        });
      } else {
        setResult({
          path,
          body,
          note,
          sql: (res.sql_queries ?? []).map((q: any) => q.sql_query).join("\n\n"),
        });
      }
    } catch (err) {
      setResult({ path, body, note, error: errorText(err) });
    }
  }

  return (
    <>
      <header className="appbar">
        <h1>TML to SQL</h1>
        <span>Dropdowns → Answer TML → SQL, with ThoughtSpot REST APIs</span>
      </header>
      <div className="t2s">
        <div className="card">
          <section>
            <h4>1. Data source</h4>
            <select
              value={dataSource?.id ?? ""}
              onChange={(e) => setDataSource(dataSources.find((d) => d.id === e.target.value))}
            >
              <option value="">Select a data source</option>
              {dataSources.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.type})
                </option>
              ))}
            </select>
          </section>

          <section>
            <h4>2. Columns</h4>
            {schemaLoading ? (
              <span className="muted">Loading…</span>
            ) : (
              <ColumnPicker schema={schema} selected={columns} onChange={setColumns} />
            )}
          </section>

          <section>
            <h4>3. Filters → runtime filters</h4>
            {filters.map((f, i) => (
              <FilterRow
                key={f.key}
                filter={f}
                schema={schema}
                dataSourceId={dataSource?.id}
                onChange={(next) =>
                  setFilters(filters.map((x, j) => (j === i ? { ...next, key: x.key } : x)))
                }
                onRemove={() => setFilters(filters.filter((_, j) => j !== i))}
              />
            ))}
            <button
              className="btn-text"
              onClick={() => setFilters([...filters, { key: nextKey++, column: "", op: "EQ", values: [] }])}
            >
              + Add filter
            </button>
          </section>

          {schema.parameters.length > 0 && (
            <section>
              <h4>4. Parameters → runtime parameters</h4>
              {parameters.map((p, i) => (
                <ParamRow
                  key={p.key}
                  param={p}
                  schema={schema}
                  columns={columns}
                  formulas={formulas}
                  onChange={(next) =>
                    setParameters(parameters.map((x, j) => (j === i ? { ...next, key: x.key } : x)))
                  }
                  onRemove={() => setParameters(parameters.filter((_, j) => j !== i))}
                />
              ))}
              <button
                className="btn-text"
                onClick={() => setParameters([...parameters, { key: nextKey++, name: "", value: "" }])}
              >
                + Add parameter
              </button>
            </section>
          )}

          <section>
            <h4>5. Ad-hoc formulas (TML only)</h4>
            {formulas.map((f, i) => (
              <FormulaRow
                key={f.key}
                formula={f}
                schema={schema}
                onChange={(next) =>
                  setFormulas(formulas.map((x, j) => (j === i ? { ...next, key: x.key } : x)))
                }
                onRemove={() => setFormulas(formulas.filter((_, j) => j !== i))}
              />
            ))}
            <button
              className="btn-text"
              onClick={() =>
                setFormulas([
                  ...formulas,
                  { key: nextKey++, name: `Formula ${formulas.length + 1}`, expr: "" },
                ])
              }
            >
              + Add formula
            </button>
          </section>
        </div>

        <div>
          <div className="card">
            <div className="result-head">
              <h4>Answer TML (sent to /metadata/sql/tml)</h4>
              <button className="btn-text" onClick={() => navigator.clipboard.writeText(tml)}>
                Copy
              </button>
            </div>
            <pre className="tml">{tml}</pre>
            <details>
              <summary>All the TML code: tml.ts, {tmlSource.trim().split("\n").length} lines</summary>
              <pre className="source">{tmlSource}</pre>
            </details>
          </div>

          <div className="actions">
            <button className="btn-filled" onClick={() => run("tml")}>
              Get SQL from TML
            </button>
            <button onClick={() => run("model")}>Get SQL from model + runtime overrides</button>
            <button onClick={() => run("searchdata")}>Run searchdata + include_sql</button>
          </div>

          {result && <ResultCard result={result} />}
        </div>
      </div>
    </>
  );
}

function ColumnPicker({
  schema,
  selected,
  onChange,
}: {
  schema: Schema;
  selected: string[];
  onChange: (columns: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = schema.columns.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <input
        type="search"
        placeholder="Find column"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="col-list">
        {visible.map((c) => (
          <label key={c.name}>
            <input
              type="checkbox"
              checked={selected.includes(c.name)}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, c.name] : selected.filter((n) => n !== c.name))
              }
            />
            {c.name}
            {c.usesParameters.map((p) => (
              <span key={p} className="chip param">
                uses {p}
              </span>
            ))}
            <span className="chip">{c.measure ? "measure" : "attribute"}</span>
          </label>
        ))}
      </div>
    </>
  );
}

const valueCache = new Map<string, Promise<string[]>>();

function useDistinctValues(dataSourceId: string | undefined, column: string, enabled: boolean) {
  const [values, setValues] = useState<string[]>([]);
  useEffect(() => {
    setValues([]);
    if (!dataSourceId || !column || !enabled) return;
    const key = `${dataSourceId}::${column}`;
    if (!valueCache.has(key))
      valueCache.set(
        key,
        distinctValues(dataSourceId, column).catch(() => []),
      );
    let stale = false;
    valueCache.get(key)!.then((v) => !stale && setValues(v));
    return () => {
      stale = true;
    };
  }, [dataSourceId, column, enabled]);
  return values;
}

function FilterRow({
  filter,
  schema,
  dataSourceId,
  onChange,
  onRemove,
}: {
  filter: Keyed<Filter>;
  schema: Schema;
  dataSourceId?: string;
  onChange: (f: Filter) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(filter.values.join(", "));
  const suggestions = useDistinctValues(dataSourceId, filter.column, !filter.measure);
  const listId = `filter-values-${filter.key}`;
  const toValues = (t: string, op: FilterOp) => (op === "IN" ? t.split(",").map((v) => v.trim()) : [t]);
  const pick = suggestions.length > 0 && ["EQ", "NE", "IN"].includes(filter.op);
  const setValues = (values: string[]) => {
    setText(values.join(", "));
    onChange({ ...filter, values });
  };

  return (
    <>
      <div className="row">
        <select
          value={filter.column}
          onChange={(e) => {
            setText("");
            onChange({
              ...filter,
              column: e.target.value,
              measure: schema.columns.find((c) => c.name === e.target.value)?.measure,
              values: [],
            });
          }}
        >
          <option value="">Column</option>
          {schema.columns.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          className="op"
          value={filter.op}
          onChange={(e) => {
            const op = e.target.value as FilterOp;
            const values = toValues(text, op).filter(Boolean);
            onChange({ ...filter, op, values: op === "IN" ? values : values.slice(0, 1) });
          }}
        >
          {OPS.map((op) => (
            <option key={op}>{op}</option>
          ))}
        </select>
        {pick ? (
          <select
            value={filter.op === "IN" ? "" : (filter.values[0] ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              if (filter.op !== "IN") setValues([v]);
              else if (v && !filter.values.includes(v)) setValues([...filter.values.filter(Boolean), v]);
            }}
          >
            <option value="">{filter.op === "IN" ? "Add value…" : "Value"}</option>
            {suggestions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ) : (
          <>
            <input
              list={listId}
              placeholder={filter.op === "IN" ? "a, b, c" : "value"}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onChange({ ...filter, values: toValues(e.target.value, filter.op) });
              }}
            />
            <datalist id={listId}>
              {suggestions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </>
        )}
        <button className="icon-btn" title="Remove" onClick={onRemove}>
          ✕
        </button>
      </div>
      {pick && filter.op === "IN" && filter.values.some(Boolean) && (
        <div className="value-chips">
          {filter.values.filter(Boolean).map((v) => (
            <button
              key={v}
              className="chip"
              title="Remove value"
              onClick={() => setValues(filter.values.filter((x) => x !== v))}
            >
              {v} ✕
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ParamRow({
  param,
  schema,
  columns,
  formulas,
  onChange,
  onRemove,
}: {
  param: Param;
  schema: Schema;
  columns: string[];
  formulas: Formula[];
  onChange: (p: Param) => void;
  onRemove: () => void;
}) {
  const def = schema.parameters.find((d) => d.name === param.name);
  const users = schema.columns.filter((c) => c.usesParameters.includes(param.name)).map((c) => c.name);
  const used =
    users.some((u) => columns.includes(u)) || formulas.some((f) => f.expr.includes(`[${param.name}]`));
  return (
    <>
      <div className="row">
        <select
          value={param.name}
          onChange={(e) => {
            const d = schema.parameters.find((x) => x.name === e.target.value);
            const value =
              !d?.choices.length || d.choices.includes(d.defaultValue)
                ? (d?.defaultValue ?? "")
                : d.choices[0];
            onChange({ name: e.target.value, value });
          }}
        >
          <option value="">Parameter</option>
          {schema.parameters.map((p) => (
            <option key={p.name}>{p.name}</option>
          ))}
        </select>
        {def?.choices.length ? (
          <select value={param.value} onChange={(e) => onChange({ ...param, value: e.target.value })}>
            {def.choices.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            placeholder="value"
            value={param.value}
            onChange={(e) => onChange({ ...param, value: e.target.value })}
          />
        )}
        <button className="icon-btn" title="Remove" onClick={onRemove}>
          ✕
        </button>
      </div>
      {param.name && !used && (
        <p className="hint">
          Not in the SQL yet: no selected column uses [{param.name}].{" "}
          {users.length ? `Select ${users.join(", ")}, or add` : "Add"} a formula that uses it.
        </p>
      )}
    </>
  );
}

function FormulaRow({
  formula,
  schema,
  onChange,
  onRemove,
}: {
  formula: Formula;
  schema: Schema;
  onChange: (f: Formula) => void;
  onRemove: () => void;
}) {
  const attr = schema.columns.find((c) => !c.measure)?.name ?? "Column";
  const param = schema.parameters[0]?.name ?? "Param";
  return (
    <div className="formula">
      <div className="row">
        <input
          placeholder="Name"
          value={formula.name}
          onChange={(e) => onChange({ ...formula, name: e.target.value })}
        />
        <button className="icon-btn" title="Remove" onClick={onRemove}>
          ✕
        </button>
      </div>
      <textarea
        rows={2}
        placeholder={`if ( [${attr}] = [${param}] ) then 1 else 0`}
        value={formula.expr}
        onChange={(e) => onChange({ ...formula, expr: e.target.value })}
      />
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  return (
    <div className="card result">
      {result.path && <h4>POST /api/rest/2.0{result.path}</h4>}
      {result.body !== undefined && (
        <details>
          <summary>Request body</summary>
          <pre>{JSON.stringify(result.body, null, 2)}</pre>
        </details>
      )}
      {result.note && <p className="note">{result.note}</p>}
      {result.loading && <span className="muted">Running…</span>}
      {result.error && <pre className="error">{result.error}</pre>}
      {!result.loading && !result.error && (
        <>
          <h4>SQL</h4>
          <pre>{result.sql || "(no SQL returned)"}</pre>
        </>
      )}
      {result.table && (
        <>
          <h4>Rows ({result.table.rows.length})</h4>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  {result.table.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j}>{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
