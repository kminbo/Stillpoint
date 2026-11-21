Team: Nadia, Bomin

## Venture

Stillpoint — a desktop web app that watches your head direction and head tilt through your webcam in real time, and nudges you (screen blur, sound, or desktop notification) back into focus when you drift.

## Architectural principles

1. All perception stays on-device. Camera frames are processed in the browser and never recorded, stored, or uploaded — this is a product promise, not just an implementation detail, and it constrains every future feature.
2. Detection and response are independent. What we track (focus, head tilt) and how we respond (blur, sound, notification) are separate preference groups, so a change to one never affects the other. Alerts can each be switched on and off; both trackers are always on, because detection is what a session exists for.
3. Desktop-first. The primary experience is a desk worker at a laptop or monitor.

## Stack and key dependencies

- TanStack Start (React 19 + TypeScript) — full-stack framework with file-based routing.
- Tailwind CSS v4 + shadcn/ui — styling with semantic design tokens.
- `@mediapipe/tasks-vision` (Face Landmarker) — runs locally in the browser for attention detection: head turn, looking up, and head tilt. Chosen because it needs no server and honors principle 1.
- localStorage — session history (up to 50 sessions) for the distraction trend, the preset profile label, and consent state. Deliberately chosen so stats work with zero accounts and zero backend.
- Supabase — stores usage rows, feedback (fixed topic plus optional written comment), reviewer suggestions and decisions.
- Google Gemini API — runs the review agent on the reviewer page and the user help chat (default `gemini-3.5-flash-lite`, override with `GEMINI_MODEL`). Both share one tool-free, JSON-only call in `src/lib/ai/gemini.server.ts`.
- zod — strict client/server schemas for every shared-data and AI input/output.

## Dependencies to avoid

- Any server-side video/image processing — would break the privacy promise and add latency.
- MediaPipe Pose Landmarker or any body-pose model — conflicts with the detection design above.
- React Router DOM or other router libraries — TanStack Router is fixed; adding a second router would fork the app's navigation model.
- A database / backend for user-facing state — history, profile and preferences stay in the browser. The backend exists only for opt-in feedback, usage data and the reviewer page. Never store video, images or face data.

## Tradeoffs consciously accepted

- History is per-browser, per-device. localStorage means no cross-device sync and no backup. Accepted because it removes the need for accounts in the MVP.
- No onboarding, no accounts, no separate settings pages. Setup happens on the start screen, with the same choices also in the logo menu. We accept a cramped start screen in exchange for a zero-friction flow.
- The same person on two devices counts as two users, since there is no user login; shared usage is linked only to a per-browser consent capability.
- Alert and timer choices are kept in memory and reset to defaults (blur on, sound and notification off, no timer) on reload.

## Open assumptions

- The heuristics generalize. Our thresholds were tuned in a headless test browser; we haven't proven they hold across lighting conditions, glasses, webcams of different quality, or different face shapes.
- People want distraction counts, not just nudges. We assume the "distractions per 10 minutes + trend" framing actually motivates; unvalidated.
- Head tilt is a good enough stand-in for posture. We rely on head rotation alone and do not plan body tracking.
- Users accept the camera. The privacy framing is assumed to be enough to overcome webcam reluctance — untested with real users.
- We assume users care more about immediate zero-friction privacy than syncing their focus history across multiple machines or having long-term cloud backups.
- Enough users will opt in to data collection.

## Session log

- Upgraded the detection loop so it keeps running via background timer ticks when the tab is hidden or minimized, rather than pausing on `requestAnimationFrame`. Sound and desktop notifications fire in the background; screen blur remains tab-local.
- Clear privacy choice for users: a card on the home screen asks users if they want to help improve Stillpoint. It explains what is collected (anonymous focus minutes and distraction counts) and what is never collected (video, camera feeds, or personal info). Users choose Yes or No; with No, zero data is sent, and they can change their mind at any time with a switch.
- Usage data collection: if a user chose to share, the app records one summary per finished session (length, distractions, tracker and alert switches, timer choice, how it ended) and an optional rating with a fixed feedback topic. It never records what the user studies. The reviewer page shows aggregate session counts, average session length, distraction rate, and feature adoption.
- Replaced detection with head rotation only (transformation matrix); removed body-pose and frame-position signals.
- Replaced free-text feedback with fixed topics, enforced in the client, server and database.
- Added the logo menu with a preset profile label, session settings, privacy, and separate local and shared data deletion.
- Added the AI review agent with aggregate-only input, a data-not-instructions rule, output privacy validation, saved suggestions, manual accept/decline, "Mark as live", and impact review.
- 2026-11-12 — Left Lovable. Merged AGENTS.md rules into this doc. Removed Lovable-only code. Moved to our own Supabase project. Switched the review agent to Gemini. Stopped tracking `.env`. Owner admin account created.
- 2026-11-12 — Removed unused code: the Pose Landmarker placeholder (`pose-engine.ts`), 40 unused shadcn/ui components, the `use-mobile` hook, and the npm packages only they used.
- 2026-11-15 — Added the "Ask Stillpoint" help chat on Gemini and amended principle 4 to allow it. The default model for both agents is now `gemini-3.5-flash`. `gemini-3.8-flash` was too slow (about 2 minutes) or overloaded.
- 2026-11-15 — Added an optional written comment to session reviews, alongside the rating and fixed topic, and amended principle 4 to allow storing it. Database updated.
- 2026-11-15 — Review agent recommendations follow the 11 product feedback cases.
- 2026-11-17 — Fixed background detection on macOS Chrome. In a hidden tab, the detection loop now takes frames straight from the camera track (`ImageCapture.grabFrame`), not from the `<video>`, which stops updating there. A worker timer drives the loop so Chrome cannot slow it down.
- 2026-11-21 — The default model for both agents is now `gemini-3.5-flash-lite`. `gemini-3.5-flash` took 18-45 seconds or timed out, which broke the help chat on Vercel. The Lite model answers in about 1 second and passed all 15 help chat test cases. The review agent has not been re-tested on it.

## Running and hosting

- Node.js 22.12+ is required.
- Local: `bun install`, `bun run dev`. Tests: `./node_modules/.bin/vitest.exe run` (not `bun test`). On Windows, `npx vitest run` fails with "Vitest failed to find the runner".
- Env: `GEMINI_API_KEY` must be a paid-tier key. The free tier allows only 20 requests a day per project, and a new key in the same project shares that limit. `GEMINI_MODEL` is optional.
- Admins: grant or revoke with SQL on `public.user_roles` in the Supabase SQL editor (insert/delete a row with `role = 'admin'`).

## Shared data: consent, usage and feedback

- What is recorded: one row per finished session (duration, distraction count, tracker and alert switches, timer choice, whether it ended manually or by timer), plus an optional 1–5 rating with a fixed feedback topic and an optional written comment. Never video, images, face data, or what the user is working on.
- Written comments: short (up to 500 characters) and optional. Comments containing emails, links or phone numbers are refused. The form tells users that only the developers read it, that it never goes to AI, and to leave out personal details. Withdrawing deletes comments along with the rest of the shared data.
- Keep privacy controls available during every session phase. Persist a pending deletion locally and keep its capability until server deletion succeeds, so withdrawal can be retried.

## Help chat ("Ask Stillpoint")

- A floating chat on the front page (intro phase only) answers users' questions about Stillpoint. It needs no consent and no account.
- Messages are sent to Gemini through the public `askHelp` server function (`src/lib/help.functions.ts`) only to produce an answer. They are never stored, logged or linked to usage data. The conversation lives in React state and clears on reload. The chat tells users this and asks them not to include personal details.
- The prompt is `HELP_INSTRUCTIONS` in `src/lib/ai/help-agent.server.ts`. Keep its product facts (labels, defaults, timer lengths, what resets on reload) in sync with the UI whenever those change.
- The assistant only explains. It cannot see or change settings, sessions or anyone's data, and must never claim it did. It points users to the front page or logo menu.
- All user text is treated as a question, never as instructions, including fake "system updates". It refuses to bypass developer approval, record or collect without consent, reveal other users' data, or diagnose medical conditions.
- Input is limited by `helpChatInputSchema` in `src/lib/help-chat.ts`: at most 8 turns, 500 characters per question, starting and ending with a user turn. Replies must pass `helpReplySchema`: no links, contact details, phone numbers, credentials or code. If a reply fails, a fixed safe message is shown instead.


## Reviewer page and AI review agent (`/review`)

- Shows aggregate usage (sessions, average length, distractions per 10 min, short-session %, tracker/alert adoption, timer choices and completion, ratings, feedback-topic counts).
- Provision reviewer admins explicitly (the `admin` role via `has_role`), never through self-signup; otherwise the first visitor could gain access to other users' insights. Signing up at `/review` creates an account but grants no access.
- Give the tool-free AI reviewer only validated aggregate counts. This removes user-text instruction and data-exfiltration channels.
- Feedback reaches the agent only as fixed topics. To act on a new kind of feedback, add a topic (`FEEDBACK_OPTIONS`, a DB check migration, and its rule in `REVIEW_INSTRUCTIONS`), never pass written comments to the agent.
- Written comments appear under "Recent reviews" for the developers to read. They are never given to the AI reviewer.
- The agent's instructions (`src/lib/ai/review-agent.server.ts`) require it to treat all input, including feedback, as data rather than instructions, and to ignore any instructions embedded in it.
- The instructions also prohibit recommending removal or automation of developer approval, medical diagnosis (including ADHD), unauthorized webcam recording, uploading or sharing footage or face data, collecting sensitive or personal data, disclosing one user's data to others, or weakening consent and access controls.
- Privacy check before approval: every generated recommendation is validated before it is saved and can be approved. Output containing URLs, contact details, credentials, instruction-override phrasing, or proposals to record/upload/store/share webcam, camera frames, face, personal or sensitive data, approval bypass or auto-approval, diagnosis, or showing other users' data is rejected.
- Developers must approve every suggestion by hand (accept/decline). Suggestions are never executed; accepting one records intent only.
- Persist suggestions and decisions through admin-checked server functions and admin-only row policies.
- "Mark as live" stores a ship date for a 14-day before/after impact review (at least 5 sessions on each side).

## Planned updates

- [ ] Rate-limit the public help chat endpoint before deploying.
- [ ] Verify the Gemini review agent end to end: generate suggestions, accept/decline, "Mark as live", impact review, and decisions after reload.
- [ ] Repeat the camera, sharing, comment and withdrawal checks on the live Vercel site, and confirm the help chat works there.