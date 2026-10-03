const ink = "#080807";
const paper = "#fffdf7";
const orange = "#ff5a1f";
const muted = "#6f6c66";

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] || character,
  );
}

function shell(content: string, preview: string) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(preview)}</title></head>
<body style="margin:0;background:${ink};font-family:Inter,Arial,sans-serif;color:${ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${ink};padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:${paper};border-radius:20px;overflow:hidden">
<tr><td style="padding:26px 32px;background:${ink};border-bottom:3px solid ${orange}"><div style="font-size:20px;font-weight:800;letter-spacing:-.7px;color:${paper}">Stack<span style="color:${orange}">Orcs</span></div></td></tr>
<tr><td style="padding:42px 32px">${content}</td></tr>
<tr><td style="padding:24px 32px;background:#f3eee5;color:${muted};font-size:12px;line-height:1.6">Digital systems, built to move.<br><a href="https://stackorcs.com" style="color:${orange};text-decoration:none">stackorcs.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function inquiryOwnerEmail(input: {
  name: string;
  email: string;
  company: string;
  service: string;
  timeline: string;
  challenge: string;
}) {
  const rows = [
    ["Name", input.name],
    ["Email", input.email],
    ["Company", input.company || "Not provided"],
    ["Capability", input.service || "Not selected"],
    ["Timeline", input.timeline || "Not selected"],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:11px 0;color:${muted};font-size:12px;border-bottom:1px solid #ded8cf">${escapeHtml(label)}</td><td style="padding:11px 0;text-align:right;font-weight:650;border-bottom:1px solid #ded8cf">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return shell(
    `<div style="color:${orange};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">New project signal</div>
<h1 style="margin:14px 0 12px;font-size:36px;line-height:1.05;letter-spacing:-1.5px">A new conversation<br>is ready to begin.</h1>
<p style="margin:0 0 28px;color:${muted};font-size:15px;line-height:1.65">A prospective client submitted a project brief through stackorcs.com.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
<div style="margin-top:28px;padding:22px;background:#f3eee5;border-left:3px solid ${orange};border-radius:0 12px 12px 0"><div style="margin-bottom:8px;color:${muted};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Challenge</div><div style="font-size:15px;line-height:1.65;white-space:pre-wrap">${escapeHtml(input.challenge)}</div></div>`,
    `New project inquiry from ${input.name}`,
  );
}

export function inquiryConfirmationEmail(name: string) {
  return shell(
    `<div style="color:${orange};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">Signal received</div>
<h1 style="margin:14px 0 18px;font-size:38px;line-height:1.04;letter-spacing:-1.8px">Thanks, ${escapeHtml(name)}.<br>We have the context.</h1>
<p style="margin:0;color:${muted};font-size:16px;line-height:1.7">Your project brief reached StackOrcs. We will review the goals, constraints, and timing before responding so the first conversation can be useful—not a generic sales call.</p>
<div style="margin-top:30px;padding:18px 20px;background:${ink};border-radius:12px;color:${paper}"><div style="font-size:11px;color:${orange};font-weight:800;letter-spacing:1px;text-transform:uppercase">What happens next</div><p style="margin:9px 0 0;font-size:14px;line-height:1.6">We read the context → clarify the fit → shape a practical next step.</p></div>`,
    "StackOrcs received your project brief",
  );
}

export function newsletterWelcomeEmail(firstName?: string) {
  const greeting = firstName
    ? `Welcome, ${escapeHtml(firstName)}.`
    : "Welcome to the signal.";
  return shell(
    `<div style="color:${orange};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">StackOrcs Field Notes</div>
<h1 style="margin:14px 0 18px;font-size:38px;line-height:1.04;letter-spacing:-1.8px">${greeting}</h1>
<p style="margin:0;color:${muted};font-size:16px;line-height:1.7">You are subscribed to concise perspectives on product engineering, cloud systems, applied AI, security, and digital operations. No noise. Only material we believe is worth your attention.</p>
<a href="https://stackorcs.com/insights" style="display:inline-block;margin-top:28px;padding:14px 20px;background:${orange};border-radius:999px;color:white;font-size:13px;font-weight:750;text-decoration:none">Explore field notes →</a>`,
    "Welcome to StackOrcs Field Notes",
  );
}

export function newsletterOwnerEmail(email: string, firstName?: string) {
  return shell(
    `<div style="color:${orange};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">New Field Notes subscriber</div>
<h1 style="margin:14px 0 18px;font-size:38px;line-height:1.04;letter-spacing:-1.8px">The audience<br>just grew.</h1>
<p style="margin:0 0 24px;color:${muted};font-size:16px;line-height:1.7">A new reader subscribed through stackorcs.com.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="padding:11px 0;color:${muted};font-size:12px;border-bottom:1px solid #ded8cf">Name</td><td style="padding:11px 0;text-align:right;font-weight:650;border-bottom:1px solid #ded8cf">${escapeHtml(firstName || "Not provided")}</td></tr>
<tr><td style="padding:11px 0;color:${muted};font-size:12px;border-bottom:1px solid #ded8cf">Email</td><td style="padding:11px 0;text-align:right;font-weight:650;border-bottom:1px solid #ded8cf">${escapeHtml(email)}</td></tr>
</table>`,
    `New Field Notes subscriber: ${email}`,
  );
}

export function broadcastEmail(input: {
  title: string;
  excerpt: string;
  url: string;
  category: string;
}) {
  return shell(
    `<div style="color:${orange};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(input.category)} / New field note</div>
<h1 style="margin:14px 0 18px;font-size:38px;line-height:1.04;letter-spacing:-1.8px">${escapeHtml(input.title)}</h1>
<p style="margin:0;color:${muted};font-size:16px;line-height:1.7">${escapeHtml(input.excerpt)}</p>
<a href="${escapeHtml(input.url)}" style="display:inline-block;margin-top:28px;padding:14px 20px;background:${orange};border-radius:999px;color:white;font-size:13px;font-weight:750;text-decoration:none">Read the field note →</a>
<p style="margin:34px 0 0;color:${muted};font-size:11px;line-height:1.6">You receive Field Notes because you subscribed on stackorcs.com. <a href="{{ unsubscribe }}" style="color:${orange}">Unsubscribe</a>.</p>`,
    input.title,
  );
}
