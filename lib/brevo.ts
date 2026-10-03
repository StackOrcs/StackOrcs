export function getEmailConfig() {
  const from = {
    name: "StackOrcs",
    email: process.env.BREVO_FROM_EMAIL?.trim() || "info@stackorcs.com",
  };
  const replyTo = process.env.BREVO_REPLY_TO?.trim() || "vivekni1224@gmail.com";
  const recipient = process.env.CONTACT_RECIPIENT?.trim() || replyTo;
  return { from, replyTo, recipient };
}

function newsletterListId() {
  const id = Number(process.env.BREVO_NEWSLETTER_LIST_ID);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("Set BREVO_NEWSLETTER_LIST_ID to your Brevo mailing list ID.");
  }
  return id;
}

async function brevo(path: string, body?: unknown) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("BREVO_API_KEY is missing from the server environment.");
  const response = await fetch("https://api.brevo.com/v3" + path, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    throw new Error("Brevo (" + response.status + "): " + (data.message || data.code || response.statusText));
  }
  return data as { id?: number; messageId?: string };
}

export async function sendEmail(email: {
  from: { name: string; email: string };
  to: string[];
  replyTo: string;
  subject: string;
  html: string;
}) {
  const data = await brevo("/smtp/email", {
    sender: email.from,
    to: email.to.map((address) => ({ email: address })),
    replyTo: { email: email.replyTo },
    subject: email.subject,
    htmlContent: email.html,
  });
  if (!data.messageId) throw new Error("Brevo did not confirm email acceptance.");
}

export async function subscribeNewsletter(email: string, firstName: string) {
  await brevo("/contacts", {
    email,
    attributes: firstName ? { FIRSTNAME: firstName } : undefined,
    listIds: [newsletterListId()],
    updateEnabled: true,
    emailBlacklisted: false,
  });
}

export async function publishNewsletter(input: {
  title: string;
  html: string;
  send: boolean;
}) {
  const { from, replyTo } = getEmailConfig();
  const data = await brevo("/emailCampaigns", {
    name: "Field Note — " + input.title,
    subject: input.title,
    sender: from,
    replyTo,
    type: "classic",
    htmlContent: input.html,
    recipients: { listIds: [newsletterListId()] },
  });
  if (!data.id) throw new Error("Brevo did not return a campaign ID.");
  if (input.send) await brevo("/emailCampaigns/" + data.id + "/sendNow");
  return data.id;
}
