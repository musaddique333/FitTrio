# Security notes

- Passwords use Node crypto scrypt with OWASP’s N=2^14/r=8/p=5 option, a random per-password salt, and a Worker-secret pepper. Secure hashing takes precedence over the free hosting CPU budget.
- Session tokens are random UUID-derived 256-bit values. Only SHA-256 hashes are stored in D1. Seven-day expiry, HTTP-only cookies, Secure production cookies, `__Host-` names, SameSite Strict, no-store responses, and ownership checks apply.
- Login and registration are limited to 20 attempts per IP and normalized email per 15-minute window, enforced with atomic D1 upserts. Cloudflare supplies the client IP. Expired rows are cleaned on auth requests.
- Writes require a matching Origin, JSON content type, and a custom request header. Explicit localhost origins are accepted only in development. No broad CORS policy.
- Zod limits input sizes/values and rejects unexpected write fields. SQL values use bound queries/Drizzle. Workout owner IDs are checked before delete. Foreign-key cascade removes exercises.
- Invitation consumption and account creation are a D1 transaction, bound to email and expiry. No default production account or public signup.
- React escapes text. Photo fields accept HTTPS links and render links rather than embedding third-party content. CSP denies arbitrary scripts and external connections; inline styles remain allowed for charts. Reduced motion, labelled inputs and focus rings are included.
- Shared group responses use an explicit allowlist, without email, calorie, private-note or photo fields. Exact weight is never shared.
- Logs omit request bodies, password values and database exception details. Do not enable body logging in your own observability systems.

Limitations: no CAPTCHA, self-service password recovery, email verification, account-deletion UI, audit history, external penetration test, or security certification. An invite verifies the administrator’s choice of email, not inbox ownership through a verification email. Back up fitness data and protect the pepper. This app is an accountability journal, not a clinical system.
