import os

from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slack_sdk import WebClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup FastAPI
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Slack client
slack_token = os.getenv("SLACK_TOKEN")
slack_channel = os.getenv("SLACK_CHANNEL")

if not slack_token:
    raise ValueError("SLACK_TOKEN environment variable is not set.")
if not slack_channel:
    raise ValueError("SLACK_CHANNEL environment variable is not set.")

slack_client = WebClient(token=slack_token)

# Set of notification types that represent actual alert updates
updation_notification_types = {
    "SCHEDULE_METRIC_UPDATE",
    "THRESHOLD_METRIC_UPDATE",
    "AUTOMATIC_SELF_SUBSCRIPTION",
    "THRESHOLD_BY_ATTRIBUTE",
    "SCHEDULED_BY_ATTRIBUTE",
    "ANOMALY_METRIC_UPDATE",
}


class WebhookPayload(BaseModel):
    data: Dict[str, Any]


@app.post("/send-to-slack")
async def send_to_slack(payload: WebhookPayload):
    data = payload.data
    notification_type = data.get("notificationType")

    # Only forward the message if the notification type is in the set
    if notification_type not in updation_notification_types:
        return {
            "message": "Not forwarding to Slack as this is not an updation notification"
        }

    current_user = data.get("currentUser")
    rule_execution_details = data.get(
        "scheduledMetricUpdateWebhookNotification", {}
    ).get("ruleExecutionDetails")
    modify_url = data.get("scheduledMetricUpdateWebhookNotification", {}).get(
        "modifyUrl"
    )
    unsubscribe_url = data.get("scheduledMetricUpdateWebhookNotification", {}).get(
        "unsubscribeUrl"
    )
    monitor_rule = data.get("scheduledMetricUpdateWebhookNotification", {}).get(
        "monitorRuleForWebhook"
    )

    if not all(
        [
            current_user,
            rule_execution_details,
            modify_url,
            unsubscribe_url,
            monitor_rule,
        ]
    ):
        raise HTTPException(status_code=400, detail="Invalid payload structure")

    # Build the Slack message
    slack_message = {
        "channel": slack_channel,
        "text": f"Alert: {monitor_rule['ruleName']} - {rule_execution_details['percentageChange']} change detected",
        "blocks": [
            # Title
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"📊 {monitor_rule['ruleName']}",
                    "emoji": True,
                },
            },
            # Individual metric details
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Metric:*\n<{monitor_rule['metricUrl']}|{monitor_rule['metricName']}>",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Change:*\n{rule_execution_details['percentageChange']}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*New Value:*\n{rule_execution_details['currentMetricValue']}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Period:*\n{rule_execution_details['executionTimestamp']}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Schedule:*\n{monitor_rule['scheduleString']}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Triggered By:*\n{current_user['displayName']} ({current_user['email']})",
                    },
                ],
            },
            # Actions
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View Metric",
                            "emoji": True,
                        },
                        "url": monitor_rule["metricUrl"],
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Modify Alert",
                            "emoji": True,
                        },
                        "url": modify_url,
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Unsubscribe",
                            "emoji": True,
                        },
                        "url": unsubscribe_url,
                        "style": "danger",
                    },
                ],
            },
        ],
    }

    try:
        # Send the message to Slack
        slack_client.chat_postMessage(**slack_message)
        return {"message": f"Message forwarded to Slack channel: {slack_channel}"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to forward message to Slack: {str(e)}"
        ) from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=3000)
