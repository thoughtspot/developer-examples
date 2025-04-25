# KPI Monitor

[KPI Monitor](https://docs.thoughtspot.com/cloud/10.8.1.cl/monitor) is a ThoughtSpot feature which lets you define different types of alerts on KPI charts. Apart from regular emails, KPI Monitor also supports [sending alerts through webhooks](https://developers.thoughtspot.com/docs/webhooks). This is useful for custom integrations with other systems, sending alerts to chat systems like Slack, or triggering other workflows. This directory contains sample projects which consume the webhook payloads sent by KPI Monitor.

## Examples

- [Slack webhook (Typescript)](slack-webhook-typescript/): A simple typescript project which consumes the webhook payloads sent by KPI Monitor and sends them to a Slack channel.

## Instructions

These are some common steps to run the examples in this directory.

1. Ensure you have Developer permissions in your ThoughtSpot Cloud instance.
2. Deploy the example project, configure it in such a way that the endpoint is accessible by your ThoughtSpot instance. Simplest way to do this is to deploy it on a public cloud where you can expose the endpoint to the internet.
3. Create a webhook that points to your deployed endpoint. Read more about creating webhooks in the [documentation](https://developers.thoughtspot.com/docs/webhooks#_register_a_webhook).
4. Create an alert and [select your webhook as a custom channel](https://developers.thoughtspot.com/docs/webhooks#_assign_webhook_to_a_kpi_monitor_alert).
5. Wait for alert execution to see the result.
