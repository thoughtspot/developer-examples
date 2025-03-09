# pre-rendering

This example demonstrates different rendering strategies for ThoughtSpot embeds using React:

The code is structured into three main embed components:

1. Normal Embed - Uses the default ThoughtSpot SDK behavior where the app loads when the component renders
2. Pre-Render Embed - Pre-renders the embed as soon as `<PreRenderedAppEmbed preRenderId="pre-render" />` is rendered
3. Pre-Render On Demand Embed - Only pre-renders after the embed component is rendered at least once

When you open the demo, you'll see:

- A home page with links to each embed type
- Navigation bar at the top to switch between different embed examples
- Live examples showing the loading behavior differences

The app uses React Router for navigation between the different embed examples, allowing you to compare their performance characteristics.

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/pre-rendering)

## Documentation
  - [Pre-Render Config](https://developers.thoughtspot.com/docs/Interface_AppViewConfig#_prerenderid)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/pre-rendering
```

```
$ npm i
```

```
$ npm run dev
```

### Technology labels

- React
- Typescript
- Web
