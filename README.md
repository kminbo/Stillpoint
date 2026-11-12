# Stillpoint

A desktop web app that watches your head direction and head tilt through your webcam, on-device, and nudges you (screen blur, sound, or desktop notification) back into focus when you drift.

## Development

Requires [Bun](https://bun.sh) (or Node.js with npm).

```sh
bun install
bun run dev
```

Other scripts: `bun run build`, `bun run lint`. Tests use Vitest: `npx vitest run` (not `bun test`, which lacks `vi.stubGlobal`).

Opt-in usage data and the reviewer page need `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env`.
