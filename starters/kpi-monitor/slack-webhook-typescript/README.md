# Slack webhook

A simple webhook made with TypeScript and Express that forwards a KPI monitor alert through webhooks to a Slack channel. The message would look like this:

![Slack message](./img/slack-message.png)

## About this example

This app exposes a single endpoint `/send-to-slack` that accepts POST requests from KPI Monitor. It then builds a Slack message and sends it to a Slack channel configured in the `.env` file.

## Getting started

1. Clone the repository

```bash
git clone https://github.com/thoughtspot/developer-examples.git
```

2. Change directory to the project

```bash
cd developer-examples/starters/kpi-monitor/slack-webhook-typescript
```

3. Install dependencies

```bash
npm install
```

4. Configure the environment variables. It is recommended to use a [Slack developer sandbox](https://api.slack.com/docs/developer-sandbox) while trying out this example. Refer to [Slack documentation](https://api.slack.com/quickstart) to learn how to create a Slack app and get a token. Following are the variables that need to be set:

| Variable        | Description                                             |
| --------------- | ------------------------------------------------------- |
| `SLACK_TOKEN`   | The Slack token for the channel to send the message to. |
| `SLACK_CHANNEL` | The Slack channel to send the message to                |

5. Start the server

```bash
npm run dev
```

6. Follow the instructions in [parent README](../README.md) to configure the webhook
