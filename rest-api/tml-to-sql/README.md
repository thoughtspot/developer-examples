<!-- search-meta
tags: [TML, SQL, REST-API, React, TypeScript, runtime-filters, runtime-parameters, answer-tml]
apis: [fetchSqlQueryFromTML, fetchSqlQueryFromModel, searchData, exportMetadataTML, searchMetadata, REST-API-v2]
questions:
  - How do I get the SQL that ThoughtSpot generates for a search?
  - How do I get SQL from Answer TML without saving the Answer?
  - How do I build Answer TML from dropdowns in my own UI?
  - How do I apply runtime filters and runtime parameters and get the SQL?
  - How do I get the SQL and the data from one searchdata call?
-->

# tml-to-sql

This example shows how a custom UI gets the SQL that ThoughtSpot generates, without saving an Answer. The UI has four dropdowns:

1. Data source
2. Columns
3. Filters
4. Parameters

The example converts the selection to Answer TML and sends it to `POST /api/rest/2.0/metadata/sql/tml`. The full conversion is in [src/tml.ts](./src/tml.ts), about 80 lines. The page also shows this file.

You can compare the result with two other endpoints:

- `POST /metadata/sql/model`: the same search, with the filters as `runtime_filter` and the parameters as `runtime_param_override`. It returns the SQL only.
- `POST /searchdata` with `include_sql: true`: it runs the search and returns the rows and the SQL.

All three endpoints return the same SQL for the same selection. `searchdata` adds `LIMIT` and `OFFSET` for the page of rows.

Requires ThoughtSpot 27.1.0.cl or later.

## Key usage

```typescript
const answerTml = {
  answer: {
    name: "TML to SQL demo",
    tables: [{ id: "Sales model", name: "Sales model", fqn: "<data source GUID>" }],
    search_query: "[Region] [Revenue] [Region] = 'east'",
    parameter_values: [{ key: "Discount", value: "0.1" }],
  },
};

const response = await fetch(`${THOUGHTSPOT_HOST}/api/rest/2.0/metadata/sql/tml`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ answer_tml: JSON.stringify(answerTml) }),
});
const { sql_queries } = await response.json();
console.log(sql_queries[0].sql_query);
```

How the UI maps to the TML:

| UI | Answer TML |
| --- | --- |
| Data source | `tables[]`, with the GUID in `fqn` |
| Columns | `search_query`, for example `[Region] [Revenue]` |
| Filters | `search_query`, for example `[Region] = 'east'` or `[Region] = [Region].'east' [Region].'west'` |
| Parameters | `parameter_values[]` |
| Ad-hoc formulas | `formulas[]`, and the formula name in `search_query` |

The column, parameter and formula lists come from the data source TML (`POST /metadata/tml/export`).

A parameter changes the SQL only when a selected column or formula uses it. The UI tags model formulas that use a parameter, and shows a hint when a parameter is not used.

Ad-hoc formulas work only with `/metadata/sql/tml`. A `query_string` cannot define a formula.

## How to use the demo

1. Select a data source. The column list and the parameter list load from its TML.
2. Select one or more columns.
3. Optional: add filters, parameters and formulas. The Answer TML panel updates for each change.
4. Click **Get SQL from TML**, **Get SQL from model + runtime overrides** or **Run searchdata + include_sql**.

## File structure

```
rest-api/tml-to-sql/
├── .env               # Cluster URL and service account (used by the dev server only)
├── vite.config.ts     # /token endpoint and /api/rest proxy for local development
└── src/
    ├── tml.ts         # Selection -> Answer TML, search query and runtime overrides
    ├── api.ts         # REST calls: data sources, data source TML, distinct values, SQL
    ├── App.tsx        # Dropdowns, TML preview, results
    └── main.tsx
```

## Authentication

The dev server signs in with the account in `.env`. It returns a short-lived token from `/token` (see `vite.config.ts`). The browser never gets the password.

The dev server also forwards `/api/rest` to the cluster. Thus, you do not need to add `localhost` to the CORS allow-list of the cluster.

In production, replace `/token` with your own backend. For example, use [trusted authentication](https://developers.thoughtspot.com/docs/trusted-auth).

## Environment variables

Set these values in `.env`, or in `.env.local` to keep them out of git:

```
THOUGHTSPOT_HOST=https://your-instance.thoughtspot.cloud
THOUGHTSPOT_USERNAME=your-username
THOUGHTSPOT_PASSWORD=your-password
# Optional. Set to true only for a test cluster with a self-signed certificate.
THOUGHTSPOT_ALLOW_SELF_SIGNED=false
```

The user must have permission to create Answers and access to the data sources.

## Demo

Open in [StackBlitz](https://stackblitz.com/github/thoughtspot/developer-examples/tree/main/rest-api/tml-to-sql)

## Documentation

- [REST API v2 reference](https://developers.thoughtspot.com/docs/rest-apiv2-reference)
- [Answer TML](https://developers.thoughtspot.com/docs/tml#_answer)
- [Runtime filters](https://developers.thoughtspot.com/docs/runtime-filters)
- [Runtime parameters](https://developers.thoughtspot.com/docs/runtime-params)
- [Search query syntax](https://developers.thoughtspot.com/docs/rest-apiv2-search-data#_search_query_string)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd rest-api/tml-to-sql
```
```
$ npm i
```
```
$ npm run dev
```

### Technology labels

- Typescript
- React
- Web
