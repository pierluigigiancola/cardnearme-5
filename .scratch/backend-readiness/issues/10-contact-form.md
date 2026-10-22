# 10 — Contact form

Status: needs-triage
Blocked by: choice of email provider

Spec: [../spec.md](../spec.md), decision 8

## What

The contact form shows a toast and sends nothing. Make it a server function that sends the message by email. The email provider isn't chosen yet.

## Acceptance criteria

- [ ] Submitting sends one email to the site's contact address, with the sender's reply-to address.
- [ ] Input is validated on the server, and the endpoint is rate-limited.
- [ ] The visitor sees success or a clear error.
