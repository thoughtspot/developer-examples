// Everything needed to turn the dropdown selection into Answer TML (for /metadata/sql/tml)
// or into runtime overrides (for /metadata/sql/model and /searchdata).

export type FilterOp =
  | "EQ"
  | "NE"
  | "IN"
  | "GT"
  | "GE"
  | "LT"
  | "LE"
  | "CONTAINS"
  | "BEGINS_WITH"
  | "ENDS_WITH";

export interface Filter {
  column: string;
  op: FilterOp;
  values: string[];
  measure?: boolean;
}

export interface Selection {
  dataSource: { id: string; name: string };
  columns: string[];
  filters: Filter[];
  parameters: { name: string; value: string }[];
  formulas: { name: string; expr: string }[];
}

const SEARCH_OP: Record<Exclude<FilterOp, "IN">, string> = {
  EQ: "=",
  NE: "!=",
  GT: ">",
  GE: ">=",
  LT: "<",
  LE: "<=",
  CONTAINS: "contains",
  BEGINS_WITH: "begins with",
  ENDS_WITH: "ends with",
};

const col = (name: string) => `[${name.replace(/[[\]]/g, "\\$&")}]`;

const literal = (value: string, bare: boolean) =>
  bare && /^-?\d+(\.\d+)?$/.test(value) ? value : `'${value.replace(/'/g, "\\'")}'`;

const filterToSearch = ({ column, op, values, measure = false }: Filter) =>
  op === "IN"
    ? `${col(column)} = ${values.map((v) => `${col(column)}.${literal(v, false)}`).join(" ")}`
    : `${col(column)} ${SEARCH_OP[op]} ${literal(values[0] ?? "", measure)}`;

export const toSearchQuery = (columns: string[], filters: Filter[] = []) =>
  [...columns.map(col), ...filters.map(filterToSearch)].join(" ");

// Ad-hoc formulas exist only in Answer TML; a query_string cannot define them.
export function toAnswerTml({ dataSource, columns, filters, parameters, formulas }: Selection) {
  return {
    answer: {
      name: "TML to SQL demo",
      tables: [{ id: dataSource.name, name: dataSource.name, fqn: dataSource.id }],
      formulas: formulas.map(({ name, expr }) => ({ id: name, name, expr })),
      search_query: toSearchQuery([...columns, ...formulas.map((f) => f.name)], filters),
      parameter_values: parameters.map(({ name, value }) => ({ key: name, value })),
    },
  };
}

export function toRuntimeOverrides({ filters, parameters }: Selection) {
  const runtime_filter: Record<string, unknown> = {};
  filters.forEach(({ column, op, values }, i) => {
    runtime_filter[`col${i + 1}`] = column;
    runtime_filter[`op${i + 1}`] = op;
    runtime_filter[`val${i + 1}`] = values;
  });
  const runtime_param_override: Record<string, string> = {};
  parameters.forEach(({ name, value }, i) => {
    runtime_param_override[`param${i + 1}`] = name;
    runtime_param_override[`paramVal${i + 1}`] = value;
  });
  return { runtime_filter, runtime_param_override };
}
