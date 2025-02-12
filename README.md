<p align="center">
    <img src="https://raw.githubusercontent.com/thoughtspot/visual-embed-sdk/main/static/doc-images/images/TS-Logo-black-no-bg.svg" width=120 align="center" alt="ThoughtSpot" />
    <h3 align="center">ThoughtSpot Developer Examples</h3>
</p>

Enjoy our curated collection of examples and solutions. Use these patterns to integrate robust and scalable analytics into your own applications with ThoughtSpot.
We're going to be shipping new examples weekly. Stay tuned!

- [Visual Embed](/visual-embed) – Drop in ThoughtSpot Analytics components (Plain JS/React) for your web apps. [Learn more.](https://developers.thoughtspot.com/docs/getting-started)
- [REST APIs](/rest-api) – Headless AI for BI, the power of ThoughtSpot's platform via APIs. [Learn more.](https://developers.thoughtspot.com/docs/rest-apis)
- [Solutions](/solutions) – Demos, Architectures, and Best Practices
- [Starter](/starter) – Fully functional applications that encompass an idea as a robust starting point.

<br/>
<br/>

### Contributing

Relevant mostly for ThoughtSpot employees and partners.

#### Adding a new example

To quickly start contributing with a new example, run the following commands:

```bash
npm i
npm run new-example
```

All examples must comply with the following format:

- It must have a `.gitignore` similar to [plop-templates/example/.gitignore](./plop-templates/example/.gitignore)
- It must have a `package.json` similar to [plop-templates/example/package.json](./plop-templates/example/package.json). The license should be `MIT`
- It must have a `README.md` similar to [plop-templates/example/README.md](./plop-templates/example/README.md). The example has to be able to include the following:
    - A codesandbox demo URL (all examples are viewable as a codesandbox at `https://githubbox.com/thoughtspot/developer-examples/tree/main/<path>/<to>/<example>`).
    - Link to the relevant documentation for the features the examples is trying to showcase.
    - If it requires environment variables, it must have a `.env` file and instructions on how to set them up.
