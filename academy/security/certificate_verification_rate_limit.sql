-- VitroCorp Academy — certificate verification protection
-- REVIEW/PREPARATION ONLY. NOT APPLIED TO SUPABASE.
-- Apply only after reviewing the shared Preview/Production database impact.
begin;

-- New certificates receive 128-bit random codes. Existing codes remain valid.
alter table public.academy_certificates
  alter column certificate_code
  set default ('VC-' || upper(encode(gen_random_bytes(16), 'hex')));

-- Store only a keyed hash of the caller IP, never the raw IP address.
create table if not exists private.certificate_verification_attempts (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  constraint certificate_verification_attempts_hash_format
    check (ip_hash ~ '^[a-f0-9]{64}$'),
  constraint certificate_verification_attempts_count_positive
    check (attempt_count > 0)
);

alter table private.certificate_verification_attempts enable row level security;
revoke all on table private.certificate_verification_attempts
  from public, anon, authenticated, service_role;

-- Called only by the Edge Function using the service-role key.
-- 20 attempts per IP hash in each rolling 10-minute window.
create or replace function public.consume_certificate_verify_attempt(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate-limit key';
  end if;

  insert into private.certificate_verification_attempts as current_window
    (ip_hash, window_started_at, attempt_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set window_started_at = case
          when current_window.window_started_at <= now() - interval '10 minutes'
            then now()
          else current_window.window_started_at
        end,
        attempt_count = case
          when current_window.window_started_at <= now() - interval '10 minutes'
            then 1
          else current_window.attempt_count + 1
        end
  returning attempt_count into v_count;

  return v_count <= 20;
end;
$function$;

revoke all on function public.consume_certificate_verify_attempt(text)
  from public, anon, authenticated;
grant execute on function public.consume_certificate_verify_attempt(text)
  to service_role;

commit;

-- Operational note: schedule periodic deletion of rows whose window_started_at
-- is older than 24 hours after choosing an approved maintenance mechanism.
-- This script does not create a cron job or apply itself.
