import express, { Request, Response, json } from "express";
import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
dotenv.config();

// Setup express
const app = express();
const port = 3000;
app.use(json());

// Initialize Slack client
const slackToken = process.env.SLACK_TOKEN;
const slackChannel = process.env.SLACK_CHANNEL;
if (!slackToken) {
  console.error("SLACK_TOKEN environment variable is not set.");
  process.exit(1);
}
if (!slackChannel) {
  console.error("SLACK_CHANNEL environment variable is not set.");
  process.exit(1);
}
const slackClient = new WebClient(slackToken);

// Set of notification types that represent actual alert updates
// and should be forwarded to Slack
const updationNotificationTypes = new Set([
  "SCHEDULE_METRIC_UPDATE",
  "THRESHOLD_METRIC_UPDATE",
  "AUTOMATIC_SELF_SUBSCRIPTION",
  "THRESHOLD_BY_ATTRIBUTE",
  "SCHEDULED_BY_ATTRIBUTE",
  "ANOMALY_METRIC_UPDATE",
]);

app.post("/send-to-slack", async (req: Request, res: Response) => {
  const payload = req.body.data;
  const {
    currentUser,
    scheduledMetricUpdateWebhookNotification: { ruleExecutionDetails, modifyUrl, unsubscribeUrl, monitorRuleForWebhook },
  } = payload;

  // Only forward the message if the notification type is in the set
  if (!updationNotificationTypes.has(payload.notificationType)) {
    res.status(200).json({
      message: "Not forwarding to Slack as this is not an updation notification",
    });
    return;
  }

  // Build the Slack message
  const slackMessage = {
    channel: slackChannel,
    text: `Alert: ${monitorRuleForWebhook.ruleName} - ${ruleExecutionDetails.percentageChange} change detected`,
    blocks: [
      // Title
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 ${monitorRuleForWebhook.ruleName}`,
          emoji: true,
        },
      },

      // Individual metric details
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Metric:*\n<${monitorRuleForWebhook.metricUrl}|${monitorRuleForWebhook.metricName}>`,
          },
          {
            type: "mrkdwn",
            text: `*Change:*\n${ruleExecutionDetails.percentageChange}`,
          },
          {
            type: "mrkdwn",
            text: `*New Value:*\n${ruleExecutionDetails.currentMetricValue}`,
          },
          {
            type: "mrkdwn",
            text: `*Period:*\n${ruleExecutionDetails.executionTimestamp}`,
          },
          {
            type: "mrkdwn",
            text: `*Schedule:*\n${monitorRuleForWebhook.scheduleString}`,
          },
          {
            type: "mrkdwn",
            text: `*Triggered By:*\n${currentUser.displayName} (${currentUser.email})`,
          },
        ],
      },

      // Actions
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Metric",
              emoji: true,
            },
            url: monitorRuleForWebhook.metricUrl,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Modify Alert",
              emoji: true,
            },
            url: modifyUrl,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Unsubscribe",
              emoji: true,
            },
            url: unsubscribeUrl,
            style: "danger",
          },
        ],
      },
    ],
  };

  // Send the message to Slack
  try {
    await slackClient.chat.postMessage(slackMessage);
    // Close the connection
    res.status(200).json({
      message: "Message forwarded to Slack channel: " + slackChannel,
    });
  } catch (error) {
    console.error("Error sending message to Slack:", error);
    res.status(500).json({
      message: "Failed to forward message to Slack. Please try again later.",
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
