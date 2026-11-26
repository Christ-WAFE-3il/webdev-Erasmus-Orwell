# Readiness

## 1. Live URL and how to verify it

Live URL: https://webdev-erasmus-orwell.onrender.com

To verify the app is up, run `curl -s https://webdev-erasmus-orwell.onrender.com/health`. It must answer status 200 with `{"status":"ok","db":"ok"}`. Then open the URL in a browser and sign in with a test account.

How I checked: I ran the curl command on the live site and got 200 with `{"status":"ok","db":"ok"}`. I also signed in from the browser.

Note: the free Render service and the Neon database sleep when unused, so the first request after a pause can take several seconds.

How I checked: I saw the slow first request in the browser (DevTools Network).

## 2. Environment variables

| Variable | Required | Where it is set | Purpose |
|---|---|---|---|
| DATABASE_URL | yes | Render dashboard (local: `.env`) | Connection to the production Neon database |
| SESSION_SECRET | yes | Render dashboard (local: `.env`) | Secret that signs the session cookie |
| PUBLIC_BASE_URL | no | Render dashboard (local: `.env`) | Public address of the app |
| TEST_DATABASE_URL | tests only | local `.env` and GitHub Actions secret, never on Render | Separate Neon `test` branch, so tests never touch production data |
| PORT | no | set by Render | Port the server listens on |
| GEMINI_API_KEY, MODEL_NAME | no | not set on Render yet | Model feature; without them the app uses a fallback text |
| MCP_TOKEN, MCP_USER_EMAIL | no | local only | MCP server settings |

The server refuses to start if DATABASE_URL or SESSION_SECRET is missing. `.env` is not committed and not copied into the Docker image.

How I checked: on the Render Environment page I see DATABASE_URL, PUBLIC_BASE_URL and SESSION_SECRET, and no GEMINI_API_KEY. I started the server without these variables and it exited with "Missing environment variable(s)". I read `.gitignore` and `.dockerignore` and both list `.env`. I ran `git log` to search the history for secrets and found none.

## 3. What happens when things fail

| Failure | What the user or caller sees | What I did to check |
|---|---|---|
| Database down or unreachable | `/health` answers 503 with `{"status":"error","db":"down"}`. Pages that need data answer a JSON error, and sign-in shows "Internal server error". The server stays up. | I broke the database connection on purpose and called `/health` and the sign-in. |
| Bad JSON sent to the API | 400 with `{"error":"Invalid request"}`, no stack trace | I sent garbage JSON with curl. |
| Unknown URL | 404 with `{"error":"Not found"}` | I called a URL that does not exist with curl. |
| Unexpected server error | 500 with a short message; the full error is only written in the server log | I read the error handler in `server/index.js` and the test in `health.test.js`. |
| Bad deploy | I roll back to the previous deploy in the Render dashboard. Rolling back turns Auto-Deploy off, so I turned it on again afterwards. | I did a rollback on the live service and checked the site still worked. |
| Database fails at startup | The container logs "Database initialisation failed" and keeps running, instead of crashing | I added a `.catch` on `initDb()` after a bad database URL crashed the container. |

## 4. Four states of one screen

Screen: the events list (`client/index.html`, title "Upcoming Events").

| State | What the user sees | Screenshot |
|---|---|---|
| Loading | "Loading events..." while the data is being fetched | `docs/ui/events-loading.png` |
| Error | A red banner such as "Failed to load events" or "Network error while loading events" | `docs/ui/events-error.png` |
| Empty | "No upcoming events available. Check back later or contact your club organizer to add new events." | `docs/ui/events-empty.png` |
| Content | The list of events with title, date, free places and the Sign up / Cancel / Full button | `docs/ui/events-content.png` |

How I checked: I used the live site and DevTools (Network throttling for loading, Offline mode for the error, an empty events table for the empty state) and took one screenshot per state.

## 5. Request waterfall

When the events page opens, the browser first loads the HTML, then calls `/api/auth/me`, and only after that calls `/api/events`. The two API calls run one after the other, not at the same time, so the list appears later than it could.

Screenshot: `docs/ui/waterfall.png`

How I checked: I opened DevTools, Network tab, reloaded the live page and looked at the order of the requests. This also matches the code in `client/index.html` (fetch `me` at line 57, fetch `events` at line 77).

## 6. Security basics checked

| Check | Result | How I checked |
|---|---|---|
| No secret in the repository | No key, password or secret in the code or the git history | I searched the code and `git log` for secrets; the old hard-coded session secret was moved to the SESSION_SECRET variable |
| `.env` is never committed or shipped | `.env` is listed in `.gitignore` and `.dockerignore` | I read both files |
| Session secret comes from the environment | The server refuses to start without SESSION_SECRET | I started it without the variable and it exited with an error |
| A user cannot cancel someone else's registration | Another account gets 403, no account gets 401, an unknown id gets 404 | I ran 4 curl commands on the live site with a second account (Bob) trying to delete Alice's registration, and each answer matched |
| Passwords are not stored in clear text | Passwords are hashed with bcrypt | I searched the code with `grep bcrypt` |
| SQL injection | All queries use `$1` placeholders, never text pasted into the SQL | I searched the data layer with grep |
| Errors do not leak details | The user sees a short message; the full error stays in the server log | I sent bad requests and read the answers |
| HTTPS | The live site is served over HTTPS by Render | I opened the live URL with `https://` |

## 7. Known gaps, ranked by risk

Ranked from the highest risk to the lowest.

1. **Two people can take the last free place at the same time.** The check "are there places left" and the insert are not locked together, so two simultaneous sign-ups could both succeed and the event would be over-booked. Fix: lock the event row (`SELECT ... FOR UPDATE`) inside the transaction. How I know: I read the sign-up code in `eventService.js` and the data layer; I have not run a parallel test.
2. **The test accounts have a known password and the sessions live in memory.** The seed creates `student@club.com` with `password123`, and the live database also has `bob@club.com`; anyone who reads the repository knows them. Also, sessions are kept in the server memory (MemoryStore), so every restart or deploy signs everybody out. Fix: remove or change the test accounts in production and store sessions in the database. How I know: I read `server/db.js` (seed accounts), and `grep store server/index.js` finds nothing, so no session store is configured and the default MemoryStore is used.
3. **No limit on sign-in attempts.** Someone can try many passwords without being slowed down. Fix: add a rate limit on `/api/auth/signin`. How I know: `grep -rni "rate-limit\|rateLimit\|express-rate" server package.json` finds nothing.
4. **The events page makes two requests one after the other** (`me`, then `events`), so it is slower than needed. Fix: start both requests together. How I know: the waterfall screenshot (section 5).
5. **The server announces it is Express** (`X-Powered-By` header). It is a small information leak. Fix: disable that header. How I know: `curl -sI https://webdev-erasmus-orwell.onrender.com/health` shows `x-powered-by: Express`.
6. **The new layout and the model screen are tested locally, not yet on the live site until this change is deployed, and the touch-target size was set in the CSS but not measured on a real phone.** Fix: after the deploy, repeat the checks on the live URL and on a phone. How I know: see `docs/UI.md`.

## 8. Model feature

The feature suggests an event description from a title and keywords. The code is `suggestDescription` in `server/services/descriptionService.js`. It calls the Gemini API (`generateContent`) with the title and keywords.

| Point | What the code does | How I checked |
|---|---|---|
| API key | Read from the GEMINI_API_KEY variable, sent in the `x-goog-api-key` header, never written in the code | I read the file and searched the repository for keys |
| Model name | Read from MODEL_NAME, default `gemini-2.5-flash` | I read the file |
| Slow model | After 3 seconds the call is abandoned and the fallback text is returned | I read the timeout in the code; a test in `description.test.js` covers it |
| Model error (rate limit 429, other API error, network error) | The fallback text is returned, never a crash | I read the `try/catch`; tests mock `fetch` with `mock.method` and check this case |
| Bad answer (not text, empty, longer than 300 characters) | The fallback text is returned | I read the check on `output`; a test covers it |
| No API key | The fallback text is returned without calling the API | I read the code; a test covers it |
| Empty title | Error 422 "Title is required" | I read the code; a test covers it |
| Long or strange input | The title is cut to 100 characters and the keywords to 200 before being sent | I read the code |

The fallback text is `Event: <title>. Keywords: <keywords>`, cut to 300 characters. The user always gets a usable description, even when the model fails.

The client has a screen for this feature at the bottom of the events page: it shows 'Thinking...' while waiting, a readable sentence when it fails, and labels the text as an AI suggestion. Screenshots: `docs/ui/model-thinking.png`, `docs/ui/model-result.png`, `docs/ui/model-failed.png` (see `docs/UI.md`, section Evidence).

### What data leaves the app

When the model feature runs, the server sends to the provider (Google, Gemini API) only the event title (cut to 100 characters), the keywords (cut to 200 characters) and the API key in a header. It does not send emails, names, passwords, the session cookie or any registration data. The model's answer comes back and is only used as a suggested text. How I checked: I read `suggestDescription` in `server/services/descriptionService.js`; the request body contains only the prompt built from the title and keywords. I did not read the provider's rules on how it uses the text it receives.

### Price of one model call

Model: `gemini-2.5-flash` (the default of MODEL_NAME). List price on the Google Cloud pricing page, checked on 26 November 2026: $0.30 per 1 million input tokens and $2.50 per 1 million output tokens (thinking tokens are counted as output).

One request is about 100 input tokens (the instruction plus the title and keywords) and about 75 output tokens (at most 300 characters). That is about $0.00003 for the input plus $0.00019 for the output, so about $0.0002 per request. If the model also uses 1000 thinking tokens, it is about $0.003 per request. So 1000 requests cost between about $0.2 and $3. How I checked: the prices come from the pricing page above; the token counts are my own estimate, not measured.

## 9. MCP

The MCP server is `mcp-server/server.js`. It talks JSON-RPC over stdin/stdout. It is run locally and in CI; it is not deployed on Render.

Tools: `find_lecture`, `list_lectures`, `list_events`, `find_event`, `register_for_event`.

| Point | Result | How I checked |
|---|---|---|
| Protocol conformance | 12 of 12 checks pass (initialize, tools/list, schemas, descriptions, tool error for an unknown lecture, error -32602 for an unknown tool, error -32601 for an unknown method, only protocol on stdout) | I ran `node mcp-server/check.mjs -- node mcp-server/server.js` and read `12/12 checks passed` |
| Starts without a database | The server does not open the database at startup; the lecture tools never use it. The user is looked up only when an event tool needs it (`getMcpUser`). | The check passes with no database reachable, and the CI job `mcp` runs the same check |
| Acting user | The event tools act as the account in MCP_USER_EMAIL (default `student@club.com`) | I read `getMcpUser` in `mcp-server/server.js` |
