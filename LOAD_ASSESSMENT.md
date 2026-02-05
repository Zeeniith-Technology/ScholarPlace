# Load Assessment: 500 Students (Whole Project + Exam Spike)

## 1. Whole project: 500 students at once (all features)

**Can the project handle 500 students using the app at the same time (study, dashboard, tests, practice, profile, etc.)?**

### Backend (verified)

| Area | Status | Notes |
|------|--------|------|
| **HTTP API** | OK | Single Node process; 500 concurrent requests are within Node/Express capacity. No request timeout set globally (long-running routes like AI may hold connections; consider timeouts per route if needed). |
| **MongoDB** | OK | Pool size set to 200 (`methods.js`); `waitQueueTimeoutMS` 30s so requests fail fast if pool is exhausted. 500 users doing 1–2 DB ops each = well within 200 connections for typical read-heavy traffic. |
| **Socket.io** | OK | 500 concurrent WebSocket connections are fine on one Node server (Socket.io scales to thousands per machine). One connection per logged-in user when on study/capstone pages. |
| **Coding submit** | OK | Concurrency cap (default 50) + 503 + Retry-After; Piston API is protected from overload. |
| **Practice test save** | OK | DB-only (find + insert/update); no external API; 200-connection pool is sufficient for bursts. |
| **Syllabus / content** | OK | DB reads; cached per request. No heavy computation. |
| **Student progress** | OK | DB read/write; normal CRUD load. |
| **AI (Gemini)** | Caveat | Google enforces rate limits (RPM/TPM) per API key. If many students use hints/study-help at once, you may hit quota; consider rate limiting AI routes or upgrading Gemini tier. |
| **Body size** | OK | `express.json` limit set to 2MB (configurable) so large code submissions are accepted. |

### Frontend (verified)

| Area | Status | Notes |
|------|--------|------|
| **Next.js 14** | OK | Client-side rendering for student app; API calls on page load (useEffect). No server-side bottleneck for 500 users; each browser talks to your API. |
| **API calls** | OK | Typical page: 1–3 fetches on load. No aggressive polling; dashboard, tests, syllabus refresh every **30 seconds** (not every second). 500 users × 2 calls every 30s ≈ 33 req/s average — easily handled. |
| **Socket.io client** | OK | One socket per user when on pages that use `useSocket` (e.g. study, capstone). Reconnection and backoff are configured. |
| **Browser limits** | OK | Browsers allow ~6 HTTP/1.1 connections per domain; with HTTP/2 or many short-lived requests, 500 users still result in a manageable request rate to the backend. |

### Verdict: 500 students using the app at once

**Yes.** With the current backend (MongoDB pool 200, coding submit cap, 2MB body limit) and frontend (30s polling, no heavy polling), the project can handle **500 students** using the app at the same time for study, dashboard, tests, practice, profile, and syllabus. The main caveats are: (1) **AI (Gemini)** rate limits if many use hints/study-help simultaneously; (2) **coding submit** spike (see below); (3) running a single Node process (no clustering) means one crash affects everyone until you add PM2/cluster.

### Optional improvements for 500-student load

- **AI routes:** Add per-user or global rate limiting on `/ai/*` and `/study-help/*` so a burst of AI usage doesn’t hit Gemini quota (e.g. 10–20 AI requests/min per user).
- **Clustering:** Run 2–4 Node workers (PM2 or Node cluster) so one process crash doesn’t take down all 500 users.
- **Health + monitoring:** Keep `/health` and add simple metrics (e.g. active connections, DB pool usage) for alerts.

---

## 2. Exam spike: 300 submit at same time

**Can the project handle 500 students online and 300 clicking submit at the same time?**

- **Aptitude / practice test submit (MCQ):** **Likely OK** with the changes below (DB-only, no external API). 300 concurrent DB reads/writes are manageable with a larger MongoDB pool and a single Node process.
- **Coding exam submit (code run + save):** **Risky as-is.** The bottleneck is the **external Piston API** (emkc.org) used to run code. 300 simultaneous submits = 300 × (multiple Piston calls per submit). Piston is a public free API and will likely throttle or fail under that load from one IP. The app also has **no rate limiting or queue** on `/coding-problems/submit`.

So: **500 students online** is generally fine for normal usage (study, MCQ tests, progress). **300 coding submits at the exact same time** is where you need mitigations.

---

## Current Architecture (Relevant Parts)

| Component | Current state |
|-----------|----------------|
| **Server** | Single Node process (Express), no clustering |
| **MongoDB** | Single `MongoClient`, pool size 200, `waitQueueTimeoutMS` 30s |
| **Coding submit** | Concurrency cap (default 50); overflow gets 503 + Retry-After; each request calls Piston API per test case |
| **Practice test save** | DB only (find + insert/update), no external API |
| **Socket.io** | One server; 500 concurrent connections are fine |
| **Body parser** | JSON/urlencoded limit 2MB (configurable) for code submissions |

---

## Bottlenecks for “300 submit at same time”

### 1. Coding submit (`POST /coding-problems/submit`)

- **Flow per request:** Read problem from DB → run **each test case** via **Piston API** (external HTTP) → write submission to DB → (if passed) trigger async AI review.
- **Issue:** 300 concurrent requests ⇒ 300 × N Piston calls (N = test cases per problem). Piston (emkc.org) will likely rate-limit or become slow; requests will block until Piston responds, so the server can get stuck and timeouts/errors will spike.
- **No protection:** No per-user or global rate limit, no queue, no cap on concurrent submits.

### 2. MongoDB connection pool

- **Default:** `maxPoolSize` = 100. With 300 concurrent API requests (each doing 1–2 DB ops), the pool can be exhausted; extra requests wait in the queue and may hit timeouts.
- **Mitigation:** Increase pool size (e.g. 200–250) and optionally set `waitQueueTimeoutMS` so requests fail fast instead of hanging.

### 3. Single Node process

- One process = one CPU-bound event loop. Under heavy I/O (many concurrent HTTP calls to Piston + DB), Node handles concurrency well, but if the process crashes or blocks, everything is down.
- **Mitigation:** Use Node cluster mode (e.g. 2–4 workers) behind a load balancer or process manager (PM2) so one crash doesn’t take down all users.

---

## What Was Done in Code (Recommendations Implemented)

1. **MongoDB:** Connection options added in `methods.js` so you can set `maxPoolSize` (and optionally `waitQueueTimeoutMS`) via environment or defaults suitable for hundreds of concurrent requests.
2. **Coding submit:** A **concurrency cap** was added so only a limited number of submit handlers run at once (e.g. 50). Extra requests get **503** with **Retry-After** so the frontend can retry instead of overloading Piston and the server. You can tune the limit via env.

---

## Recommendations Checklist

- [x] **Increase MongoDB pool size** (e.g. 200) and optional `waitQueueTimeoutMS` — done in code; set env if needed.
- [x] **Limit concurrent coding submits** (e.g. 50) and return 503 + Retry-After for overflow — done in code.
- [ ] **Load test:** Run 300 simulated coding submits (and 300 practice-test submits) against staging with the new settings; measure P95/P99 latency and error rate.
- [ ] **Piston:** For high-stakes exams, consider a **dedicated code execution service** (self-hosted Piston, or another provider with SLA) and keep the concurrency cap to avoid overloading it.
- [ ] **Production:** Use **Node cluster** or **PM2** with 2–4 workers so a single process crash doesn’t affect everyone.
- [ ] **Frontend:** On **503** from submit, show “Server busy, please try again in a few seconds” and retry with backoff (e.g. 2–5 s) so users don’t need to refresh manually.

---

## Verdict

- **500 students online at the same time (browsing, MCQ, study):** **Yes**, the project can handle this with the MongoDB pool and concurrency cap in place, and optional clustering.
- **300 students clicking coding submit at the exact same time:** **Smooth only with the above mitigations.** Without the concurrency cap and larger pool, you risk Piston throttling, DB pool exhaustion, and timeouts. With the cap + pool + retry on 503, behavior under spike should be predictable and “smooth” in the sense of controlled load and clear retry path.

Run a load test (e.g. k6 or Artillery) with 300 concurrent coding submits and 300 practice-test submits before relying on this for a real exam.

---

## Optional environment variables

| Variable | Default | Purpose |
|---------|---------|---------|
| `MONGO_MAX_POOL_SIZE` | 200 | Max MongoDB connections in the pool (increase if you run multiple app instances or very high concurrency). |
| `MONGO_WAIT_QUEUE_TIMEOUT_MS` | 30000 | Max ms a request waits for a free connection; then it fails (avoids hanging). |
| `MAX_CONCURRENT_CODING_SUBMITS` | 50 | Max number of coding submit handlers running at once. Extra requests get 503 + Retry-After. Increase only if your code execution service (e.g. Piston) can handle more. |
| `BODY_JSON_LIMIT` | 2mb | Max request body size for JSON (e.g. code submissions). |
| `BODY_URLENC_LIMIT` | 2mb | Max request body size for urlencoded. |
| `USE_CLUSTER` | (unset) | Set to `true` to run multiple Node workers (resilience). When `true`, primary spawns workers and restarts them on crash. |
| `CLUSTER_WORKERS` | (CPU count, max 4) | Number of workers when `USE_CLUSTER=true`. Default: min(CPU cores, 4). Set e.g. `2` or `4` to override. |
