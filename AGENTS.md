<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep focus/posture tracking preferences separate from alert preferences so detection and response choices remain independently configurable.
- Use only Face Landmarker transformation-matrix rotation for head direction and tilt, normalizing scale and ignoring translation; never add body-pose tracking or use frame position, nose-drop ratios, or face size as posture signals, so a new seating position does not interrupt focus.
- Preserve the existing `posture` preference/usage key for head-tilt tracking to keep historical usage compatible without a schema change.
- Persist review suggestions and decisions through admin-checked server functions and admin-only row policies; acceptance records intent, never executes product changes.
- Collect usage and feedback only through validated consent-capability RPCs; serialize writes and revocation in the database, keep only capability hashes server-side and retain revoked hashes to reject delayed writes.
- Keep privacy controls available during every session phase; persist pending deletion locally and retain its capability until server deletion succeeds so withdrawal can be retried.
- Keep the logo menu present throughout sessions; browser-local profiles and history deletion remain separate from capability-based shared-data withdrawal to preserve deletion retries.
- Accept only fixed feedback topics through strict client/server schemas and database validation; arbitrary text must never reach persistence or model input.
- Give the tool-free AI reviewer only validated aggregate counts, validate output before saving, and never execute suggestions; this removes user-text instruction and data-exfiltration channels.
- Provision reviewer admins explicitly, never through self-signup; otherwise the first visitor could gain access to other users' insights.
- Use preset non-personal profile labels rather than arbitrary stored names; this prevents the browser profile from retaining sensitive user-entered text.
