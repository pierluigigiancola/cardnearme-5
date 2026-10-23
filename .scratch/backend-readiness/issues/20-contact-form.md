# 20: Contact form

**What to build:** The contact form shows a toast and sends nothing. Make it a server function that sends the message by email. The email provider isn't chosen yet.

**Blocked by:** choice of email provider

**Status:** needs-triage

Spec: [../spec.md](../spec.md), decision 8

- [ ] Submitting sends one email to the site's contact address, with the sender's address as reply-to.
- [ ] Input is validated on the server, and the endpoint is rate-limited.
- [ ] The visitor sees success or a clear error.
