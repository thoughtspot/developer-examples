# jwt-filter-rules

This repository provides an example of how to generate and use JWT authentication tokens with filter rules and parameter values for ThoughtSpot APIs. This API allows administrators to generate a token with a specific set of rules and column filtering conditions that are applied when a user session is created.

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
