-- 009_user_preferences.sql
-- Store per-user notification preferences as a jsonb column on users.
-- Defaults: summary email on, action reminders on, bot joining confirmation off.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{
    "summary_email": true,
    "action_reminder_email": true,
    "bot_joining_confirmation": false
  }'::jsonb;
