# ThoughtSpot AnswerService Example

This example demonstrates how to use the AnswerService from the ThoughtSpot Visual Embed SDK to programmatically fetch data and interact with ThoughtSpot answers.

## Features

- Embeds a ThoughtSpot Search component
- Demonstrates how to get an AnswerService instance from a SearchEmbed
- Shows multiple AnswerService features:
  - Fetching data with pagination
  - Getting SQL queries
  - Retrieving TML (ThoughtSpot Modeling Language)
  - Downloading CSV and PNG exports
  - Viewing session information
- Processes and displays the fetched data in a table format
- Handles errors and loading states

## Code Structure

- `App.tsx`: Main component that contains the SearchEmbed and AnswerService implementation
- `App.css`: Styling for the application
- `.env`: Environment variables for configuration

## How to Use

1. Configure your ThoughtSpot settings if needed
2. Create a search query in the embedded search
3. Use the AnswerService features in the sidebar:
   - **Get TML**: Gets the ThoughtSpot Modeling Language representation
   - **Get Session Info**: Displays the session information
4. The data will be displayed in a table below the embed

## Documentation
- [AnswerService Documentation](https://developers.thoughtspot.com/docs/Class_AnswerService)
- [SearchEmbed Documentation](https://developers.thoughtspot.com/docs/?pageid=search-embed)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/answer-service
```
```
$ npm i
```
```
$ npm run dev
```

## Configuration

Before running the example, you can set up the environment variables in the `.env` file:

```
# ThoughtSpot instance URL
VITE_THOUGHTSPOT_HOST=https://try-everywhere.thoughtspot.cloud

# Worksheet/Datasource ID for Search embed
VITE_DATASOURCE_ID=cd252e5c-b552-49a8-821d-3eadaa049cca
```

Update these values with your own:

1. `VITE_THOUGHTSPOT_HOST`: Your ThoughtSpot instance URL (defaults to try-everywhere.thoughtspot.cloud)
2. `VITE_DATASOURCE_ID`: Your worksheet/datasource ID for Search embed

## AnswerService API Methods

The AnswerService provides several methods to interact with ThoughtSpot answers:

- `getTML()`: Gets the TML representation of the answer
- `getSession()`: Gets the session information

This example demonstrates most of these methods, but you can extend it to use others as needed.

## Technology labels

- React
- TypeScript
- Web
- ThoughtSpot Visual Embed SDK
