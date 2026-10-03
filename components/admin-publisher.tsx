"use client";

import { FormEvent, useState } from "react";
import { Check, PaperPlaneTilt, SpinnerGap, Warning } from "@phosphor-icons/react";

export function AdminPublisher() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const adminKey = String(formData.get("adminKey") || "");
    const payload = {
      title: formData.get("title"),
      category: formData.get("category"),
      excerpt: formData.get("excerpt"),
      url: formData.get("url"),
      send: formData.get("send") === "on",
    };

    try {
      const response = await fetch("/api/admin/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminKey,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Publishing failed.");
      setStatus("success");
      setMessage(
        result.mode === "queued"
          ? "Broadcast queued for the Field Notes list."
          : "Broadcast draft created in Brevo for final review.",
      );
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Publishing failed.");
    }
  }

  return (
    <form className="admin-publisher" onSubmit={publish}>
      <div className="admin-publisher__status">
        <span>RELEASE DESK / AUTHORIZED OPERATORS</span>
        <i />
      </div>
      <label>
        <span>Admin publishing key</span>
        <input name="adminKey" type="password" autoComplete="off" required />
      </label>
      <div className="field-row">
        <label>
          <span>Field note title</span>
          <input name="title" type="text" maxLength={140} required />
        </label>
        <label>
          <span>Category</span>
          <select name="category" defaultValue="Engineering">
            <option>Engineering</option>
            <option>Applied AI</option>
            <option>Cloud systems</option>
            <option>Security</option>
            <option>Digital operations</option>
            <option>Company update</option>
          </select>
        </label>
      </div>
      <label>
        <span>Published URL</span>
        <input name="url" type="url" placeholder="https://stackorcs.com/insights/..." required />
      </label>
      <label>
        <span>Email excerpt</span>
        <textarea name="excerpt" rows={5} minLength={30} maxLength={500} required />
      </label>
      <label className="admin-send-toggle">
        <input name="send" type="checkbox" />
        <span>
          <strong>Send immediately</strong>
          Leave off to create a reviewable draft in Brevo.
        </span>
      </label>
      <button className="button-link" type="submit" disabled={status === "sending"}>
        {status === "sending" ? (
          <>Creating broadcast <SpinnerGap className="spin" /></>
        ) : (
          <>Publish notification <PaperPlaneTilt /></>
        )}
      </button>
      {message ? (
        <div className={"admin-message admin-message--" + status} role="status">
          {status === "success" ? <Check /> : <Warning />}
          {message}
        </div>
      ) : null}
    </form>
  );
}
