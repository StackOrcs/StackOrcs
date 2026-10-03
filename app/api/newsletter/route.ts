import { NextResponse } from "next/server";
import {
  newsletterOwnerEmail,
  newsletterWelcomeEmail,
} from "@/lib/email-templates";
import {
  cleanText,
  clientAddress,
  isAllowedOrigin,
  rateLimit,
  validEmail,
} from "@/lib/request-guard";
import {
  getEmailConfig,
  getNewsletterSegmentId,
  getResend,
  resendRequest,
  sendEmail,
} from "@/lib/resend";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  if (!rateLimit(`newsletter:${clientAddress(request)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ message: "Please wait before trying again." }, { status: 429 });
  }
  try {
    const body = await request.json();
    if (cleanText(body.website, 200)) return NextResponse.json({ ok: true });
    const email = cleanText(body.email, 254).toLowerCase();
    const firstName = cleanText(body.firstName, 80);
    if (!validEmail(email)) {
      return NextResponse.json({ message: "Enter a valid work email." }, { status: 400 });
    }
    const resend = getResend();
    const { from, replyTo, recipient } = getEmailConfig();
    // A signup succeeds only after the contact is saved in the mailing list.
    const segmentId = await getNewsletterSegmentId(resend);
    let existing = false;
    try {
      await resendRequest(() => resend.contacts.get({ email }));
      existing = true;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "not_found") throw error;
    }
    if (existing) {
      await resendRequest(() => resend.contacts.update({
        email,
        firstName: firstName || undefined,
        unsubscribed: false,
      }));
      await resendRequest(() => resend.contacts.segments.add({ email, segmentId }));
    } else {
      await resendRequest(() => resend.contacts.create({
        email,
        firstName: firstName || undefined,
        unsubscribed: false,
        segments: [{ id: segmentId }],
      }));
    }

    const [ownerDelivery, welcomeDelivery] = await Promise.allSettled([
      sendEmail(resend, {
        from,
        to: [recipient],
        replyTo: email,
        subject: firstName ? "New Field Notes subscriber — " + firstName : "New Field Notes subscriber",
        html: newsletterOwnerEmail(email, firstName),
      }),
      sendEmail(resend, {
        from,
        to: [email],
        replyTo,
        subject: "Welcome to StackOrcs Field Notes",
        html: newsletterWelcomeEmail(firstName),
      }),
    ]);
    if (ownerDelivery.status === "rejected") {
      console.warn("Newsletter owner notification failed", ownerDelivery.reason);
    }
    if (welcomeDelivery.status === "rejected") {
      console.warn("Newsletter welcome delivery failed", welcomeDelivery.reason);
    }

    return NextResponse.json({
      ok: true,
      existing,
      welcomeSent: welcomeDelivery.status === "fulfilled",
    });
  } catch (error) {
    console.error("Newsletter subscription failed", error);
    return NextResponse.json(
      { message: "Subscription is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
