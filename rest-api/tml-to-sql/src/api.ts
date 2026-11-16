import { toSearchQuery } from "./tml";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`HTTP ${status}`);
  }
}

let token: Promise<string> | undefined;

// /token is served by the dev server (vite.config.ts); in production, use your own backend.
const getAuthToken = async (): Promise<string> => {
  const res = await fetch("/token");
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()).token;
};

const bearer = () =>
  (token ??= getAuthToken().catch((err) => {
    token = undefined;
    throw err;
  }));

export async function post<T>(path: string, body: unknown, retry = true): Promise<T> {
  const res = await fetch(`/api/rest/2.0${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await bearer()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  // Tokens live 300 s; fetch a new one once before giving up.
  if (res.status === 401 && retry) {
    token = undefined;
    return post(path, body, false);
  }
  const text = await res.text();
  let json: unknown = text;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) throw new ApiError(res.status, json);
  return json as T;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
}

export async function listDataSources(): Promise<DataSource[]> {
  const rows = await post<any[]>("/metadata/search", {
    metadata: [{ type: "LOGICAL_TABLE" }],
    record_size: 500,
    sort_options: { field_name: "NAME", order: "ASC" },
  });
  return rows.map((r) => ({
    id: r.metadata_id,
    name: r.metadata_name,
    type: typeLabel(r.metadata_header ?? {}),
  }));
}

const TYPE_LABELS: Record<string, string> = {
  ONE_TO_ONE_LOGICAL: "Table",
  AGGR_WORKSHEET: "View",
  SQL_VIEW: "SQL view",
  USER_DEFINED: "Uploaded table",
};

// Models and legacy Worksheets share the WORKSHEET type; only Models have worksheetVersion V2.
const typeLabel = ({ type = "", worksheetVersion }: { type?: string; worksheetVersion?: string }) =>
  type === "WORKSHEET" ? (worksheetVersion === "V2" ? "Model" : "Worksheet") : (TYPE_LABELS[type] ?? type);

export interface Column {
  name: string;
  measure: boolean;
  usesParameters: string[];
}

export interface Parameter {
  name: string;
  defaultValue: string;
  choices: string[];
}

export interface Schema {
  columns: Column[];
  parameters: Parameter[];
}

const COLUMN_KEYS = ["columns", "worksheet_columns", "view_columns", "sql_view_columns"];

// Columns and parameters come straight from the data source TML.
export async function loadSchema(id: string): Promise<Schema> {
  const [{ edoc }] = await post<{ edoc: string }[]>("/metadata/tml/export", {
    metadata: [{ identifier: id }],
    edoc_format: "JSON",
  });
  const tml = JSON.parse(edoc);
  const root = Object.values(tml).find((v) => v && typeof v === "object") as any;
  const key = COLUMN_KEYS.find((k) => Array.isArray(root?.[k]));
  const parameters: Parameter[] = (root?.parameters ?? []).map((p: any) => ({
    name: p.name,
    defaultValue: String(p.default_value ?? ""),
    choices: (p.list_config?.list_choice ?? []).map((c: any) => String(c.value)),
  }));
  const formulas: { id: string; expr: string }[] = root?.formulas ?? [];
  const columns: Column[] = (key ? root[key] : []).map((c: any) => {
    const expr = formulas.find((f) => f.id === c.formula_id)?.expr ?? "";
    return {
      name: c.name,
      measure: c.properties?.column_type === "MEASURE",
      usesParameters: parameters.filter((p) => expr.includes(`[${p.name}]`)).map((p) => p.name),
    };
  });
  return { columns, parameters };
}

export async function distinctValues(dataSourceId: string, column: string): Promise<string[]> {
  const res = await post<any>("/searchdata", {
    query_string: toSearchQuery([column]),
    logical_table_identifier: dataSourceId,
    record_size: 200,
  });
  return (res.contents?.[0]?.data_rows ?? []).map((r: unknown[]) => String(r[0]));
}
