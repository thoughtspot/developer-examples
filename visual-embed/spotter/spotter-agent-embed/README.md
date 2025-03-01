# spotter-agent-embed

This is a small example of how embed spotter into your own agent if you have one. The example creates a simple agent using Gemini-flash model's function calling capability.

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/spotter/spotter-agent-embed)

## Documentation

- [API Reference](https://developers.thoughtspot.com/docs/Class_BodylessConversation) for the Spotter Agent Embed.
- Full [tutorial](https://developers.thoughtspot.com/docs/tutorials/spotter/integrate-into-chatbot) on how to embed in your own chatbot.

## Environment

The `.env` file contains some default values. Change the value of `VITE_THOUGHTSPOT_HOST` and `VITE_TS_DATASOURCE_ID` to use on your own instance.

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/spotter/spotter-agent-embed
```
```
$ npm i
```
```
$ npm start
```

## Structure

- `api/simple-agent.ts` A simple agent node service, using Gemini. This would be your own agent.
- `src/` React code for a chatbot using [Antd Pro chat](https://pro-chat.antdigital.dev/en-US/components/pro-chat#programming-operation-control)


### Technology labels

- React
- Typescript
- Web
