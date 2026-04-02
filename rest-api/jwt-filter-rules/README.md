<!-- search-meta
tags: [JWT, trusted-auth, filter-rules, REST-API, TypeScript, NodeJS, row-level-security]
apis: [getAuthToken, filterRules, parameterValues, REST-API-v2, auth-token-custom]
questions:
  - How do I generate a JWT token with filter rules for ThoughtSpot?
  - How do I apply row-level security through JWT auth in ThoughtSpot?
  - How do I pass parameter values in a ThoughtSpot JWT token?
  - How do I restrict data access per user using JWT filter rules in ThoughtSpot?
  - How do I implement column-level security with ThoughtSpot trusted auth?
-->

# jwt-filter-rules

This repository provides an example of how to generate and use JWT authentication tokens with filter rules and parameter values for ThoughtSpot APIs. This API allows administrators to generate a token with a specific set of rules and column filtering conditions that are applied when a user session is created.

## Key Usage

```typescript
// POST /api/rest/2.0/auth/token/custom
const response = await fetch(`${THOUGHTSPOT_HOST}/api/rest/2.0/auth/token/custom`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "your-username",
    validity_time_in_sec: 300,
    password: "your-password",
    auto_create: true,
    // Apply row-level security: restrict to rows where Color = 'sky'
    filter_rules: [
      {
        column_name: "Color",
        operator: "IN",
        values: ["sky"],
      },
    ],
    // Pass parameter values for ThoughtSpot parameters
    parameter_values: [
      {
        name: "Secured",
        values: ["Default"],
      },
    ],
  }),
});
const { token } = await response.json();
```

## File Structure
rest-api/jwt-filter-rules/
│── src/
│   ├── constants.ts      # Configuration constants like ThoughtSpot host and credentials
│   ├── index.ts          # Express server handling API requests
│   ├── index.html        # Frontend UI for displaying generated tokens
│── package.json          # Dependencies and scripts
│── README.md             # Documentation

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/rest-api/jwt-filter-rules)

## Documentation

- [Rest API Reference] (https://developers.thoughtspot.com/docs/api-authv2#_get_tokens_with_custom_rules_and_filter_conditions)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd rest-api/jwt-filter-rules
```
```
$ npm i
```
```
$ npm run start
```

### Technology labels

- Typescript
- NodeJS
- Express