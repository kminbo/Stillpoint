-- Stillpoint shared-data schema: opt-in usage, fixed-topic feedback, reviewer suggestions.
-- See architecturedoc.md ("Shared data" and "Reviewer page") for the rules this enforces.

-- ── Roles ────────────────────────────────────────────────────────────────────
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

-- Security definer so row policies can check roles without exposing user_roles.
create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ── Consent capabilities ─────────────────────────────────────────────────────
-- Only SHA-256 hashes of browser-held tokens are stored. Revoked hashes are kept
-- so delayed writes from a withdrawn browser are rejected.
create table public.usage_consents (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz
);

-- ── Usage sessions (one summary row per finished session) ────────────────────
create table public.usage_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  consent_hash text references public.usage_consents (token_hash) on delete cascade,
  seconds integer not null check (seconds between 1 and 86400),
  distractions integer not null check (distractions between 0 and 10000),
  focus_tracking boolean not null,
  -- Legacy name: means head-tilt tracking, kept for historical compatibility.
  posture_tracking boolean not null,
  blur boolean not null,
  sound boolean not null,
  notification boolean not null,
  timer_minutes integer check (timer_minutes between 1 and 600),
  ended_by text not null check (ended_by in ('manual', 'timer'))
);
create index usage_sessions_consent_hash_idx on public.usage_sessions (consent_hash);
create index usage_sessions_created_at_idx on public.usage_sessions (created_at);

-- ── Feedback (fixed topics only; must match src/lib/feedback-options.ts) ─────
create table public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null unique references public.usage_sessions (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment in (
    'Alerts felt too frequent',
    'Alerts were helpful',
    'Head tracking felt inaccurate',
    'Camera setup was difficult',
    'The session timer was helpful',
    'The app felt slow',
    'The session helped me focus'
  ))
);
create index session_feedback_created_at_idx on public.session_feedback (created_at);

-- ── Reviewer suggestions (records intent only; never executed) ───────────────
create table public.review_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  generated_by uuid not null references auth.users (id),
  session_count integer not null check (session_count >= 0),
  summary text not null check (char_length(summary) between 1 and 2000),
  title text not null check (char_length(title) between 1 and 160),
  why text not null check (char_length(why) between 1 and 2000),
  change text not null check (char_length(change) between 1 and 2000),
  impact text not null check (impact in ('high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  decided_at timestamptz,
  decided_by uuid references auth.users (id),
  implemented_at timestamptz,
  check (implemented_at is null or status = 'accepted')
);

-- ── The only write path for anonymous users ──────────────────────────────────
-- Locks the consent row so writes and withdrawal for one token are serialized.
create function public.manage_usage_consent(_token text, _action text, _input jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _hash text;
  _revoked timestamptz;
  _id uuid;
  _comment text;
begin
  if _token is null or _token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid token';
  end if;
  _hash := encode(sha256(convert_to(_token, 'UTF8')), 'hex');

  if _action = 'withdraw' then
    insert into public.usage_consents (token_hash, revoked_at) values (_hash, now())
      on conflict (token_hash) do nothing;
    perform 1 from public.usage_consents where token_hash = _hash for update;
    update public.usage_consents set revoked_at = coalesce(revoked_at, now()) where token_hash = _hash;
    -- Feedback is removed by cascade from its session.
    delete from public.usage_sessions where consent_hash = _hash;
    return jsonb_build_object('ok', true);
  end if;

  insert into public.usage_consents (token_hash) values (_hash) on conflict (token_hash) do nothing;
  select revoked_at into _revoked from public.usage_consents where token_hash = _hash for update;
  if _revoked is not null then
    raise exception 'consent withdrawn';
  end if;

  if _action = 'record' then
    if _input is null or jsonb_typeof(_input) <> 'object' or exists (
      select 1 from jsonb_object_keys(_input) k where k not in (
        'seconds', 'distractions', 'focus_tracking', 'posture_tracking',
        'blur', 'sound', 'notification', 'timer_minutes', 'ended_by')
    ) then
      raise exception 'invalid usage input';
    end if;
    insert into public.usage_sessions (
      consent_hash, seconds, distractions, focus_tracking, posture_tracking,
      blur, sound, notification, timer_minutes, ended_by
    ) values (
      _hash,
      (_input ->> 'seconds')::integer,
      (_input ->> 'distractions')::integer,
      (_input ->> 'focus_tracking')::boolean,
      (_input ->> 'posture_tracking')::boolean,
      (_input ->> 'blur')::boolean,
      (_input ->> 'sound')::boolean,
      (_input ->> 'notification')::boolean,
      (_input ->> 'timer_minutes')::integer,
      _input ->> 'ended_by'
    ) returning id into _id;
    return jsonb_build_object('id', _id);
  end if;

  if _action = 'feedback' then
    if _input is null or jsonb_typeof(_input) <> 'object' or exists (
      select 1 from jsonb_object_keys(_input) k where k not in ('session_id', 'rating', 'comment')
    ) then
      raise exception 'invalid feedback input';
    end if;
    -- Feedback may only attach to a session recorded with the same token.
    if not exists (
      select 1 from public.usage_sessions
      where id = (_input ->> 'session_id')::uuid and consent_hash = _hash
    ) then
      raise exception 'unknown session';
    end if;
    _comment := nullif(_input ->> 'comment', '');
    insert into public.session_feedback (session_id, rating, comment)
      values ((_input ->> 'session_id')::uuid, (_input ->> 'rating')::integer, _comment)
      on conflict (session_id) do update set rating = excluded.rating, comment = excluded.comment
      returning id into _id;
    return jsonb_build_object('id', _id);
  end if;

  raise exception 'invalid action';
end;
$$;

-- ── Access control ───────────────────────────────────────────────────────────
alter table public.user_roles enable row level security;
alter table public.usage_consents enable row level security;
alter table public.usage_sessions enable row level security;
alter table public.session_feedback enable row level security;
alter table public.review_suggestions enable row level security;

-- Nobody reads or writes these tables directly except signed-in admins (below).
revoke all on public.user_roles, public.usage_consents, public.usage_sessions,
  public.session_feedback, public.review_suggestions from anon, authenticated;
grant select on public.usage_sessions, public.session_feedback to authenticated;
grant select, insert, update on public.review_suggestions to authenticated;

create policy "admins read usage" on public.usage_sessions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins read feedback" on public.session_feedback
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins read suggestions" on public.review_suggestions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins add suggestions" on public.review_suggestions
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and generated_by = auth.uid());
create policy "admins decide suggestions" on public.review_suggestions
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
-- user_roles and usage_consents have no policies: admins are provisioned in the SQL editor.

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
revoke execute on function public.manage_usage_consent(text, text, jsonb) from public;
grant execute on function public.manage_usage_consent(text, text, jsonb) to anon, authenticated;
