-- VitroCorp Academy — course visibility RLS hardening
-- REVIEW SCRIPT ONLY. This file is intentionally NOT an applied migration.
-- Do not execute until a separate staging Supabase project is available,
-- or the user explicitly approves changing the shared Preview/Production database.
--
-- Existing policies retained:
--   "Admins can view all courses"
--   "Anyone can view published courses"
--
-- Tighten the enrolled-student policy so it never grants access to draft courses
-- and only recognizes a currently active enrollment.

begin;

drop policy if exists "Students can view their enrolled courses"
  on public.courses;

create policy "Students can view their enrolled courses"
  on public.courses
  for select
  to authenticated
  using (
    courses.status = 'published'
    and exists (
      select 1
      from public.enrollments as e
      where e.course_id = courses.id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and (e.starts_at is null or e.starts_at <= now())
        and (e.expires_at is null or e.expires_at > now())
    )
  );

commit;

-- Verification checklist to run in a dedicated staging database:
-- 1. Admin can still read draft and published courses.
-- 2. Anonymous users can read only published courses.
-- 3. Authenticated users cannot read draft courses, even with an active enrollment.
-- 4. Authenticated users can read published courses.
-- 5. Revoked, not-yet-started, expired, or otherwise non-active enrollments do not grant access.
-- 6. Confirm course enrollment/payment flows still work.
