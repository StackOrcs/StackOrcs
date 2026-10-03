import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Resend, type CreateEmailOptions, type Response } from "resend";

const DEFAULT_FROM = "StackOrcs <updates@stackorcs.com>";
const DEFAULT_REPLY_TO = "vivekni1224@gmail.com";
const DEFAULT_NEWSLETTER_SEGMENT = "StackOrcs Field Notes";

let newsletterSegmentPromise: Promise<string> | undefined;

class EmailClient extends Resend {
  override fetchRequest<T>(path: string, options: RequestInit = {}) {
    return super.fetchRequest<T>(path, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(8_000),
    });
  }
}

// Retry temporary failures only; credentials, domain verification and quota
// failures need an account/configuration fix rather than repeated requests.
export async function resendRequest<T>(operation: () => Promise<Response<T>>) {
  for (let attempt = 0; ; attempt++) {
    const result = await operation();
    if (!result.error) return result.data;
    const error = result.error;
    const transient =
      error.name === "rate_limit_exceeded" ||
      error.name === "concurrent_idempotent_requests" ||
      error.statusCode === null ||
      (error.statusCode != null && error.statusCode >= 500);
    if (!transient || attempt >= 2) {
      throw Object.assign(new Error(error.message), {
        name: error.name,
        statusCode: error.statusCode,
      });
    }
    const retryAfter = Number(result.headers?.["retry-after"]);
    await delay(Math.min(5_000, Math.max(1_000 * 2 ** attempt, retryAfter * 1_000 || 0)));
  }
}

export function sendEmail(resend: Resend, email: CreateEmailOptions) {
  const idempotencyKey = randomUUID();
  return resendRequest(() => resend.emails.send(email, { idempotencyKey }));
}

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is missing from the server environment.");
  return new EmailClient(apiKey);
}

export function getEmailConfig() {
  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim();
  const configuredReplyTo = process.env.RESEND_REPLY_TO?.trim();
  const configuredRecipient = process.env.CONTACT_RECIPIENT?.trim();
  const from = configuredFrom || DEFAULT_FROM;
  const replyTo = configuredReplyTo || DEFAULT_REPLY_TO;
  const recipient = configuredRecipient || replyTo;
  if (/@resend\.dev(?:>|$)/i.test(from)) {
    throw new Error("RESEND_FROM_EMAIL must use a verified domain; resend.dev only supports test recipients.");
  }

  return { from, replyTo, recipient };
}

async function ensureNewsletterSegment(resend: Resend) {
  const listed = await resendRequest(() => resend.segments.list());

  const existing = listed.data.find(
    (segment) => segment.name === DEFAULT_NEWSLETTER_SEGMENT,
  );
  if (existing) return existing.id;

  const created = await resendRequest(() => resend.segments.create({ name: DEFAULT_NEWSLETTER_SEGMENT }));

  return created.id;
}

export function getNewsletterSegmentId(resend: Resend): Promise<string> {
  const configured = process.env.RESEND_NEWSLETTER_SEGMENT_ID;
  if (configured) return Promise.resolve(configured);

  if (!newsletterSegmentPromise) {
    newsletterSegmentPromise = ensureNewsletterSegment(resend).catch((error) => {
      newsletterSegmentPromise = undefined;
      throw error;
    });
  }

  return newsletterSegmentPromise;
}
