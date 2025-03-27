# create-user-cross-org

This repository provides an example of how to create user in any org (not necessarily to be current logged in org) via tenant admin by using ThoughtSpot APIs. This API allows tenant admin to create user in any or multiple as well.

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

## Preview 
<img width="803" alt="Screenshot 2025-03-27 at 2 15 47 PM" src="https://github.com/user-attachments/assets/2dd77b0f-10ec-4bba-a27d-36622766a48b" />


### Technology labels

- Typescript
- NodeJS
- Express
