-- Track granted Gmail OAuth scopes (modify required for cleanup).

alter table public.gmail_oauth_tokens
  add column if not exists scopes text;
