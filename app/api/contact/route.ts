import { NextResponse } from "next/server";
import {
  inquiryConfirmationEmail,
  inquiryOwnerEmail,
} from "@/lib/email-templates";
import {
  cleanText,
  clientAddress,
  isAllowedOrigin,
  rateLimit,
  validEmail,
} from "@/lib/request-guard";
import { getEmailConfig, getResend, sendEmail } from "@/lib/resend";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  if (!rateLimit(`contact:${clientAddress(request)}`, 3, 10 * 60_000)) {
    return NextResponse.json(
      { message: "Please wait before sending another brief." },
      { status: 429 },
    );
  }
  try {
    const body = await request.json();
    if (cleanText(body.website, 200)) return NextResponse.json({ ok: true });
    const input = {
      name: cleanText(body.name, 100),
      email: cleanText(body.email, 254).toLowerCase(),
      company: cleanText(body.company, 140),
      service: cleanText(body.service, 100),
      timeline: cleanText(body.timeline, 100),
      challenge: cleanText(body.challenge, 4_000),
    };
    if (!input.name || !validEmail(input.email) || input.challenge.length < 20) {
      return NextResponse.json(
        { message: "Please provide your name, a valid email, and useful project context." },
        { status: 400 },
      );
    }
    const resend = getResend();
    const { from, replyTo, recipient } = getEmailConfig();
    await sendEmail(resend, {
      from,
      to: [recipient],
      replyTo: input.email,
      subject: `Project signal — ${input.name}${input.company ? ` / ${input.company}` : ""}`,
      html: inquiryOwnerEmail(input),
    });
    let confirmationSent = false;
    try {
      await sendEmail(resend, {
        from,
        to: [input.email],
        replyTo,
        subject: "Your StackOrcs project brief is in",
        html: inquiryConfirmationEmail(input.name),
      });
      confirmationSent = true;
    } catch (error) {
      console.warn("Contact confirmation delivery failed", error);
    }
    return NextResponse.json({ ok: true, confirmationSent });
  } catch (error) {
    console.error("Contact delivery failed", error);
    return NextResponse.json(
      { message: "The signal could not be delivered right now. Please try again shortly." },
      { status: 503 },
    );
  }
}
