import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test, after } from "node:test";
import { getEmailConfig, sendEmail, publishNewsletter } from "../lib/brevo.ts";

const previous = { fetch: globalThis.fetch, env: { ...process.env }, warn: console.warn, error: console.error };
after(() => { globalThis.fetch = previous.fetch; process.env = previous.env; console.warn = previous.warn; console.error = previous.error; });
console.warn = console.error = () => {};
process.env.BREVO_API_KEY = "test-key";
process.env.BREVO_FROM_EMAIL = "mail@stackorcs.com";
process.env.BREVO_NEWSLETTER_LIST_ID = "7";

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
  return new Request("https://stackorcs.com/api/" + path, { method: "POST",
    headers: { origin: "https://stackorcs.com", host: "stackorcs.com", "content-type": "application/json", "x-real-ip": String(++requestId) },
    body: JSON.stringify(body) });
}
const brief = { name: "Test", email: "reader@example.com", challenge: "A project brief with sufficient context." };
const denied = () => Response.json({ code: "unauthorized", message: "Invalid API key" }, { status: 401 });

test("Brevo receives the configured sender, recipient, reply-to and server-only key", async () => {
  let sent;
  globalThis.fetch = async (url, options) => { sent = { url, options }; return Response.json({ messageId: "accepted" }, { status: 201 }); };
  const { from, replyTo } = getEmailConfig();
  await sendEmail({ from, to: [brief.email], replyTo, subject: "Test", html: "Hello" });
  assert.equal(sent.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(sent.options.headers["api-key"], "test-key");
  assert.ok(sent.options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(sent.options.body), { sender: from, to: [{ email: brief.email }], replyTo: { email: replyTo }, subject: "Test", htmlContent: "Hello" });
  delete process.env.BREVO_API_KEY;
  await assert.rejects(sendEmail({ from, to: [brief.email], replyTo, subject: "Test", html: "Hello" }), /BREVO_API_KEY/);
  process.env.BREVO_API_KEY = "test-key";
});

test("a rejected owner email fails the contact request without sending a confirmation", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return denied(); };
  assert.equal((await contact(request("contact", brief))).status, 503);
  assert.equal(calls, 1);
});

test("a failed subscriber save does not send mail or report success", async () => {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(url); return denied(); };
  assert.equal((await newsletter(request("newsletter", { email: brief.email }))).status, 503);
  assert.deepEqual(calls, ["https://api.brevo.com/v3/contacts"]);
});

test("existing contacts can subscribe again, and failed notifications retain the saved signup", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return url.endsWith("/contacts") ? new Response(null, { status: 204 }) : denied();
  };
  const result = await newsletter(request("newsletter", { email: brief.email, firstName: "Test" }));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true, welcomeSent: false });
  assert.deepEqual(calls[0].body, { email: brief.email, attributes: { FIRSTNAME: "Test" }, listIds: [7], updateEnabled: true, emailBlacklisted: false });
  assert.ok(calls.slice(1).every(call => call.url.endsWith("/smtp/email")));
});

test("missing list configuration fails before making a provider request", async () => {
  delete process.env.BREVO_NEWSLETTER_LIST_ID;
  globalThis.fetch = async () => { assert.fail("Provider must not be called"); };
  assert.equal((await newsletter(request("newsletter", { email: brief.email }))).status, 503);
  process.env.BREVO_NEWSLETTER_LIST_ID = "7";
});

test("campaigns stay drafts by default and only queue delivery when explicitly requested", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: options.body && JSON.parse(options.body) });
    return url.endsWith("/sendNow") ? new Response(null, { status: 204 }) : Response.json({ id: 42 }, { status: 201 });
  };
  const input = { title: "Field Note", html: '<a href="{{ unsubscribe }}">Unsubscribe</a>', send: false };
  assert.equal(await publishNewsletter(input), 42);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body.recipients, { listIds: [7] });
  assert.equal(calls[0].body.htmlContent, input.html);
  assert.equal(await publishNewsletter({ ...input, send: true }), 42);
  assert.equal(calls[2].url, "https://api.brevo.com/v3/emailCampaigns/42/sendNow");
});
