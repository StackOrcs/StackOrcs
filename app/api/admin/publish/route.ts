import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { broadcastEmail } from "@/lib/email-templates";
import { cleanText, rateLimit } from "@/lib/request-guard";
import { publishNewsletter } from "@/lib/brevo";

function authorized(request: Request) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = process.env.ADMIN_PUBLISH_KEY || "";
  if (!supplied || !expected) return false;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ message: "Admin authorization failed." }, { status: 401 });
  }
  if (!rateLimit("admin-publish", 4, 60 * 60_000)) {
    return NextResponse.json({ message: "Publishing limit reached. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const title = cleanText(body.title, 140);
    const excerpt = cleanText(body.excerpt, 500);
    const category = cleanText(body.category, 60) || "Perspective";
    const url = cleanText(body.url, 500);
    const send = body.send === true;
    const parsedUrl = new URL(url);
    if (!title || excerpt.length < 30 || !["https:", "http:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { message: "Provide a title, useful excerpt, and valid published URL." },
        { status: 400 },
      );
    }
    const broadcastId = await publishNewsletter({
      title,
      html: broadcastEmail({ title, excerpt, url, category }),
      send,
    });
    return NextResponse.json({
      ok: true,
      broadcastId,
      mode: send ? "queued" : "draft",
    });
  } catch (error) {
    console.error("Broadcast publishing failed", error);
    return NextResponse.json(
      { message: "The broadcast could not be created." },
      { status: 503 },
    );
  }
}
