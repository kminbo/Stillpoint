-- More fixed feedback topics so the review agent can act on common feedback
-- (blur helped, false alerts while thinking or reading notes, interruptions,
-- unclear distraction drops, remembering a session length) without ever
-- reading written comments. Must match FEEDBACK_OPTIONS in
-- src/lib/feedback-options.ts.

alter table public.session_feedback drop constraint if exists session_feedback_comment_check;
alter table public.session_feedback add constraint session_feedback_comment_check check (comment in (
  'Alerts felt too frequent',
  'Alerts were helpful',
  'Head tracking felt inaccurate',
  'Camera setup was difficult',
  'The session timer was helpful',
  'The app felt slow',
  'The session helped me focus',
  'The screen blur was helpful',
  'Alerts fired while I was just thinking',
  'Looking down at notes counted as a distraction',
  'Reminders interrupted my concentration',
  'Fewer distractions, but not sure why',
  'Remember my usual session length'
));
