# Brevo setup

1. Create a Brevo account. Enable transactional email sending and add a verified sender; authenticate stackorcs.com with the DNS records Brevo provides.
2. Create an API key under SMTP & API → API keys. Use an API key, not an SMTP key.
3. Create a list named Field Notes and copy its numeric list ID.
4. In the StackOrcs Vercel project, configure BREVO_API_KEY, BREVO_FROM_EMAIL (for example info@stackorcs.com), and BREVO_NEWSLETTER_LIST_ID for Production. Optionally set BREVO_REPLY_TO and CONTACT_RECIPIENT to monitored inboxes. Redeploy after saving.
5. Import existing subscribed contacts from the former provider into the Brevo list if needed; preserve unsubscribed contacts' preferences.

Contact notifications use transactional emails; newsletter signups are saved before notifications; admin publishing creates a draft unless Send immediately is selected. Brevo manages campaign unsubscribe links. Existing ADMIN_PUBLISH_KEY protection remains required.

Run node --test tests/email.test.mjs and node node_modules/next/dist/bin/next build. Tests mock the API and send no real email. Live delivery cannot be verified until the account, key, list and sender are configured.

The free plan has no trial expiry and currently allows 300 emails/day. Free accounts can be deleted after prolonged inactivity; automated transactional sending counts as activity. Provider outages, account restrictions, DNS and quotas still apply.

[API documentation](https://developers.brevo.com/) · [Plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) · [Inactive accounts](https://help.brevo.com/hc/en-us/articles/4410311028626-About-the-deletion-of-inactive-Free-plan-accounts)
