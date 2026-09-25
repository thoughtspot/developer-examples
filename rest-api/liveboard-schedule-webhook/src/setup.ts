// One-time ThoughtSpot setup with @thoughtspot/rest-api-sdk. Reads .env.
//
//   npm run setup -- storage-config    S3 only: ThoughtSpot's identity + trust-policy template
//   npm run setup -- create-webhook    create the LIVEBOARD_SCHEDULE webhook (S3 when S3_BUCKET is set)
//   npm run setup -- route-schedules   send Liveboard schedules to the webhook channel
//   npm run setup -- validate          send a test delivery to the receiver (needs WEBHOOK_ID)

import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from '@thoughtspot/rest-api-sdk';

const env = process.env;
const client = new ThoughtSpotRestApi(createBearerAuthenticationConfig(env.TS_HOST!, async () => env.TS_TOKEN!));

const commands: Record<string, () => Promise<unknown>> = {
  'storage-config': () => client.getWebhookStorageConfig(),

  'create-webhook': () =>
    client.createWebhookConfiguration({
      name: 'liveboard-schedule-webhook',
      url: env.WEBHOOK_URL!,
      events: ['LIVEBOARD_SCHEDULE'],
      authentication: { BEARER_TOKEN: env.RECEIVER_TOKEN }, // the receiver checks this token
      ...(env.S3_BUCKET && {
        storage_destination: {
          storage_type: 'AWS_S3',
          storage_config: {
            aws_s3_config: {
              bucket_name: env.S3_BUCKET,
              region: env.S3_REGION!,
              role_arn: env.S3_ROLE_ARN!,
              external_id: env.S3_EXTERNAL_ID, // AWS-hosted clusters only
              path_prefix: env.S3_PATH_PREFIX,
            },
          },
        },
      }),
    } as any),

  // Org-level when ORG_IDENTIFIER is set (overrides cluster level); cluster-wide needs ADMINISTRATION.
  'route-schedules': () => {
    const preferences = [{ event_type: 'LIVEBOARD_SCHEDULE', channels: ['WEBHOOK'] }];
    return client.configureCommunicationChannelPreferences(
      (env.ORG_IDENTIFIER
        ? { org_preferences: [{ org_identifier: env.ORG_IDENTIFIER, operation: 'REPLACE', preferences }] }
        : { cluster_preferences: preferences }) as any,
    );
  },

  validate: () =>
    client.validateCommunicationChannel({
      channel_type: 'WEBHOOK',
      channel_identifier: env.WEBHOOK_ID!,
      event_type: 'LIVEBOARD_SCHEDULE',
    }),
};

const command = commands[process.argv[2]];
if (!command) {
  console.error(`usage: npm run setup -- <${Object.keys(commands).join(' | ')}>`);
  process.exit(2);
}
command().then(
  (result) => console.log(JSON.stringify(result ?? { status: 'done' }, null, 2)),
  (err) => {
    console.error(err.message ?? err);
    process.exit(1);
  },
);
