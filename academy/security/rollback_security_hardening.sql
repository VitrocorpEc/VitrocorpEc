-- VitroCorp Academy — rollback for the prepared security hardening scripts
-- REVIEW/PREPARATION ONLY. NOT APPLIED TO SUPABASE.
-- Run only if BOTH prepared scripts were applied and no later independent
-- changes were made to these same objects. This is not a database backup.
-- The original policy/default below were captured by read-only inspection
-- of the shared project on 2026-11-21.

begin;

-- Remove only the rate-limit objects introduced by the preparation script.
drop function if exists public.consume_certificate_verify_attempt(text);
drop table if exists private.certificate_verification_attempts;

-- Restore the certificate code generator observed before hardening (48-bit).
alter table public.academy_certificates
  alter column certificate_code
  set default ('VC-'::text || upper(encode(gen_random_bytes(6), 'hex'::text)));

-- Restore the exact original student-course visibility predicate.
drop policy if exists "Students can view their enrolled courses"
  on public.courses;

create policy "Students can view their enrolled courses"
  on public.courses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.enrollments e
      where e.course_id = courses.id
        and e.user_id = (select auth.uid())
    )
  );

commit;

-- Verify after rollback:
-- 1. Compare pg_policies for public.courses with the saved audit.
-- 2. Confirm certificate_code DEFAULT is gen_random_bytes(6).
-- 3. Confirm to_regclass('private.certificate_verification_attempts') is NULL.
-- 4. Confirm to_regprocedure('public.consume_certificate_verify_attempt(text)') is NULL.
-- 5. Run the Academy smoke tests before considering service restored.
