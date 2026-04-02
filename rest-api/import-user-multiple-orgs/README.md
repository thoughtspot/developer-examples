<!-- search-meta
tags: [REST-API, user-management, multi-org, TypeScript, NodeJS]
apis: [importUsers, org_identifiers, REST-API-v2]
questions:
  - How do I import users into multiple ThoughtSpot organizations via REST API?
  - How do I provision users to specific orgs in ThoughtSpot?
  - How do I manage users across ThoughtSpot orgs using the REST API?
  - How do I bulk import users in ThoughtSpot with org assignment?
-->

# import-user-multiple-orgs

This repository provides an example of how to import a user into any org (not necessarily the current logged-in org) via tenant admin by using ThoughtSpot APIs. This API allows tenant admin to import users into one or multiple orgs.

## Key Usage

```typescript
// Import a user and assign them to multiple ThoughtSpot orgs
// POST /api/rest/2.0/users/import
const response = await fetch(`${THOUGHTSPOT_HOST}/api/rest/2.0/users/import`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: bearerToken,
  },
  body: JSON.stringify({
    users: [
      {
        user_identifier: "new-user@example.com",
        display_name: "New User",
        password: "Cloud123!",
        account_type: "LOCAL_USER",
        account_status: "ACTIVE",
        email: "new-user@example.com",
        org_identifiers: ["org-id-1", "org-id-2"], // assign to multiple orgs
      },
    ],
    dry_run: false,
    delete_unspecified_users: false,
  }),
});
```

## File Structure
rest-api/create-user-cross-org/
│── src/
│   ├── constants.ts      # Configuration constants like ThoughtSpot host and credentials
│   ├── index.ts          # Express server handling API requests
│   ├── index.html        # Frontend UI for displaying details of created user
│── package.json          # Dependencies and scripts
│── README.md             # Documentation

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/rest-api/create-user-cross-org)

## Documentation

- [Rest API Reference] (https://developers.thoughtspot.com/docs/rest-apiv2-reference#users#import_users)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd rest-api/create-user-cross-org
```
```
$ npm i
```
```
$ npm run dev
```

### Technology labels

- Typescript
- NodeJS
- Express