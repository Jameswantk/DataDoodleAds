"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "submitting" | "error";

export function AuditForm() {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError("");

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const attribution = Object.fromEntries(
      new URLSearchParams(window.location.search).entries(),
    );

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, attribution }),
      });
      const result = (await response.json()) as {
        error?: string;
        reportUrl?: string;
      };

      if (!response.ok || !result.reportUrl) {
        throw new Error(result.error ?? "We could not complete the audit.");
      }

      window.location.assign(result.reportUrl);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
      setState("error");
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field-grid">
        <label>
          <span>Contact name</span>
          <input
            name="contactName"
            autoComplete="name"
            placeholder="Your name"
            required
            maxLength={100}
          />
        </label>
        <label>
          <span>Business email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            maxLength={254}
          />
        </label>
        <label>
          <span>Mobile number</span>
          <input
            name="mobile"
            type="tel"
            autoComplete="tel"
            placeholder="+60 12 345 6789"
            required
            maxLength={32}
          />
        </label>
        <label>
          <span>Website URL</span>
          <input
            name="websiteUrl"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://company.com"
            required
            maxLength={2048}
          />
        </label>
      </div>

      <label className="consent">
        <input name="auditConsent" type="checkbox" value="yes" required />
        <span>
          I authorize a technical audit of this public website and agree to the
          privacy notice.
        </span>
      </label>
      <label className="consent secondary">
        <input name="marketingConsent" type="checkbox" value="yes" />
        <span>Send me occasional AI visibility insights.</span>
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={state === "submitting"}>
        <span>
          {state === "submitting"
            ? "Inspecting your website…"
            : "Generate my complimentary audit"}
        </span>
        <span className="button-arrow" aria-hidden="true">
          →
        </span>
      </button>
      <p className="form-note">
        Your result is created from observable website evidence. Typical
        processing time: under one minute.
      </p>
    </form>
  );
}
