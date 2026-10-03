import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test, after } from "node:test";
import { getEmailConfig, getResend, sendEmail } from "../lib/resend.ts";

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const originalError = console.error;
console.warn = () => {};
console.error = () => {};
const originalEnv = { ...process.env };
after(() => { globalThis.fetch = originalFetch; process.env = originalEnv; console.warn = originalWarn; console.error = originalError; });
process.env.RESEND_API_KEY = "re_test_only";
process.env.RESEND_NEWSLETTER_SEGMENT_ID = "segment-test";
process.env.NODE_ENV = "production";
delete process.env.RESEND_FROM_EMAIL;

async function route(path) {
  const source = stripTypeScriptTypes(await readFile(new URL(path, import.meta.url), "utf8"))
    .replaceAll('"next/server"', JSON.stringify(new URL("../node_modules/next/server.js", import.meta.url).href))
    .replace(/"@\/lib\/([^"]+)"/g, (_, name) => JSON.stringify(new URL("../lib/" + name + ".ts", import.meta.url).href));
  return (await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"))).POST;
}
const contact = await route("../app/api/contact/route.ts");
const newsletter = await route("../app/api/newsletter/route.ts");
let requestId = 0;
function request(path, body) {
  return new Request("https://stackorcs.com/api/" + path, {
    method: "POST",
    headers: { origin: "https://stackorcs.com", host: "stackorcs.com", "content-type": "application/json", "x-real-ip": String(++requestId) },
    body: JSON.stringify(body),
  });
}
function response(data, status = 200) { return Response.json(data, { status }); }
const invalidKey = { name: "invalid_api_key", statusCode: 401, message: "Invalid API key" };
const missing = { name: "not_found", statusCode: 404, message: "Contact not found" };

test("verified domain overrides and recipient overrides survive", () => {
  process.env.RESEND_FROM_EMAIL = "StackOrcs <mail@stackorcs.com>";
  process.env.RESEND_REPLY_TO = "hello@stackorcs.com";
  process.env.CONTACT_RECIPIENT = "inbox@stackorcs.com";
  assert.deepEqual(getEmailConfig(), { from: process.env.RESEND_FROM_EMAIL, replyTo: process.env.RESEND_REPLY_TO, recipient: process.env.CONTACT_RECIPIENT });
  delete process.env.RESEND_FROM_EMAIL;
  assert.equal(getEmailConfig().from, "StackOrcs <updates@stackorcs.com>");
});

test("test-only sender and missing credentials fail explicitly", () => {
  process.env.RESEND_FROM_EMAIL = "StackOrcs <onboarding@resend.dev>";
  assert.throws(getEmailConfig, /verified domain/);
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_API_KEY;
  assert.throws(getResend, /RESEND_API_KEY/);
  process.env.RESEND_API_KEY = "re_test_only";
});

test("temporary rate limit retries with the same idempotency key and a timeout", async () => {
  const attempts = [];
  globalThis.fetch = async (_url, options) => {
    attempts.push(options);
    return attempts.length === 1
      ? response({ name: "rate_limit_exceeded", statusCode: 429, message: "Slow down" }, 429)
      : response({ id: "email-id" });
  };
  assert.deepEqual(await sendEmail(getResend(), { from: "updates@stackorcs.com", to: "reader@example.com", subject: "Test", html: "Hello" }), { id: "email-id" });
  assert.equal(attempts.length, 2);
  assert.ok(attempts[0].headers.get("Idempotency-Key"));
  assert.equal(attempts[0].headers.get("Idempotency-Key"), attempts[1].headers.get("Idempotency-Key"));
  assert.ok(attempts.every(options => options.signal instanceof AbortSignal));
});

test("invalid API key fails once instead of retrying or sending an acknowledgement", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response(invalidKey, 401); };
  const result = await contact(request("contact", { name: "Test", email: "reader@example.com", challenge: "A project brief with sufficient context." }));
  assert.equal(result.status, 503);
  assert.equal(calls, 1);
});

test("owner delivery survives a failed acknowledgement", async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? response({ id: "owner-email" }) : response(invalidKey, 401);
  const result = await contact(request("contact", { name: "Test", email: "reader@example.com", challenge: "A project brief with sufficient context." }));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true, confirmationSent: false });
});

test("a failed contact save never reports a successful subscription or sends emails", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push([url, options.method]);
    return options.method === "GET" ? response(missing, 404) : response(invalidKey, 401);
  };
  const result = await newsletter(request("newsletter", { email: "reader@example.com" }));
  assert.equal(result.status, 503);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(([url]) => !url.endsWith("/emails")));
});

test("a saved subscriber stays subscribed when notifications fail", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push([url, options.method]);
    if (options.method === "GET") return response(missing, 404);
    if (url.endsWith("/contacts")) return response({ id: "saved-contact" });
    return response(invalidKey, 401);
  };
  const result = await newsletter(request("newsletter", { email: "reader@example.com" }));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true, existing: false, welcomeSent: false });
  assert.ok(calls[1][0].endsWith("/contacts"));
  assert.ok(calls.slice(2).every(([url]) => url.endsWith("/emails")));
});

test("existing subscribers are restored to the segment before notification", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push([url, options.method, options.body && JSON.parse(options.body)]);
    return response({ id: "existing-contact", email: "reader@example.com", unsubscribed: true });
  };
  const result = await newsletter(request("newsletter", { email: "reader@example.com" }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).existing, true);
  assert.equal(calls[1][1], "PATCH");
  assert.equal(calls[1][2].unsubscribed, false);
  assert.ok(calls[2][0].includes("/segments/"));
  assert.ok(calls.slice(3).every(([url]) => url.endsWith("/emails")));
});
