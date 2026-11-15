-- Optional written comment on a session review (architecturedoc principle 4).
-- Stored only for users who share, readable only by admins (existing row policy),
-- never sent to an AI model, and deleted by cascade when sharing is withdrawn.
-- The checks must match FEEDBACK_NOTE_MAX_CHARS and noteHasPersonalDetails in
-- src/lib/feedback-options.ts.

alter table public.session_feedback
  add column note text check (
    note is null or (
      char_length(note) between 1 and 500
      and note !~* '[[:alnum:]_.%+-]+@[[:alnum:]_.-]+\.[a-z]{2,}|https?://|www\.|\+?[0-9][0-9[:space:]().-]{8,}[0-9]'
    )
  );

create or replace function public.manage_usage_consent(_token text, _action text, _input jsonb default '{}'::jsonb)
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
  _note text;
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
    -- Feedback (including notes) is removed by cascade from its session.
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
      select 1 from jsonb_object_keys(_input) k where k not in ('session_id', 'rating', 'comment', 'note')
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
    _note := nullif(btrim(_input ->> 'note'), '');
    insert into public.session_feedback (session_id, rating, comment, note)
      values ((_input ->> 'session_id')::uuid, (_input ->> 'rating')::integer, _comment, _note)
      on conflict (session_id) do update set rating = excluded.rating, comment = excluded.comment, note = excluded.note
      returning id into _id;
    return jsonb_build_object('id', _id);
  end if;

  raise exception 'invalid action';
end;
$$;

revoke execute on function public.manage_usage_consent(text, text, jsonb) from public;
grant execute on function public.manage_usage_consent(text, text, jsonb) to anon, authenticated;
