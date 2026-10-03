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
import { getEmailConfig, sendEmail, subscribeNewsletter } from "@/lib/brevo";

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
    const { from, replyTo, recipient } = getEmailConfig();
    await subscribeNewsletter(email, firstName);

    const [ownerDelivery, welcomeDelivery] = await Promise.allSettled([
      sendEmail({
        from,
        to: [recipient],
        replyTo: email,
        subject: firstName ? "New Field Notes subscriber — " + firstName : "New Field Notes subscriber",
        html: newsletterOwnerEmail(email, firstName),
      }),
      sendEmail({
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
