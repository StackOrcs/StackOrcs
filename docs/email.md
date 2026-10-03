# StackOrcs email operations

StackOrcs uses Resend for project briefs, acknowledgements, newsletter contacts, welcome notes and broadcasts.

## Production configuration

In the StackOrcs Vercel project, set these server-only environment variables for Production (and Preview if preview mail is needed):

- RESEND_API_KEY: an active Resend key with Full access. Contacts, segments and broadcasts require more than sending-only access. Never use a NEXT_PUBLIC_ variable.
- RESEND_FROM_EMAIL: StackOrcs <updates@stackorcs.com>, or a sender on another domain verified in the same Resend account.
- RESEND_REPLY_TO and CONTACT_RECIPIENT: real monitored inboxes. Defaults remain vivekni1224@gmail.com.
- RESEND_NEWSLETTER_SEGMENT_ID: optional existing Field Notes segment ID. Configuring it avoids automatic segment lookup and creation.
- ADMIN_PUBLISH_KEY: a long random value for the publishing endpoint.

Verify stackorcs.com in Resend and retain the SPF/DKIM DNS records it requests. The resend.dev sender only sends to the Resend account owner and is rejected by this app. Changing Vercel environment variables requires a new deployment.

## Diagnose a delivery failure

Check Vercel runtime logs for Contact delivery failed, Newsletter subscription failed, or Broadcast publishing failed. Resend's error name and status are preserved in logs:

- invalid_api_key / restricted_api_key: confirm the key is active and has the required permissions; replace a revoked key in Vercel and redeploy.
- validation_error: check the sender domain and DNS verification.
- daily_quota_exceeded / monthly_quota_exceeded: check plan usage and capacity. Retries cannot remove account limits.
- rate_limit_exceeded or temporary server/network errors: the app retries up to three attempts with bounded backoff. Email retries reuse an idempotency key to avoid duplicate delivery. Each API request has an eight-second timeout.

Project acknowledgements are attempted only after the owner email has been accepted. Newsletter success requires saving the contact in the mailing-list segment; welcome/owner notification failures do not erase that subscription. Provider acceptance does not prove inbox delivery: check the Resend email event history for delivered, bounced, suppressed or failed status.

A durable queue and a separately configured second provider would be needed to retain project inquiries during an extended provider outage. This patch does not provide that infrastructure. No service can guarantee unlimited delivery or perpetual uptime; account access, DNS and quota capacity still need maintenance.

## Local checks

Run node --test tests/email.test.mjs and node node_modules/next/dist/bin/next build. Tests use a fake API key and mocked provider responses; they never send real mail. Live delivery remains unverified until the production account is accessible.

References: https://resend.com/docs/knowledge-base/403-error-resend-dev-domain and https://resend.com/docs/api-reference/errors.
