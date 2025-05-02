# KPI Monitor

[KPI Monitor](https://docs.thoughtspot.com/cloud/10.8.1.cl/monitor) is a ThoughtSpot feature which lets you define different types of alerts on KPI charts. Apart from regular emails, KPI Monitor also supports [sending alerts through webhooks](https://developers.thoughtspot.com/docs/webhooks). This is useful for custom integrations with other systems, sending alerts to chat systems like Slack, or triggering other workflows. This directory contains sample projects which consume the webhook payloads sent by KPI Monitor.

## Examples

- [Slack webhook (Typescript)](slack-webhook-typescript/): A simple typescript project which consumes the webhook payloads sent by KPI Monitor and sends them to a Slack channel.
