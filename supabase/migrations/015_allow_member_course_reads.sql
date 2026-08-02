begin;

alter table public.courses
enable row level security;

drop policy if exists
    "Members can read their club courses"
on public.courses;

create policy
    "Members can read their club courses"
on public.courses
for select
to authenticated
using (
    is_active = true
    and exists (
        select 1
        from public.club_memberships as cm
        where cm.club_id = courses.club_id
          and cm.profile_id = auth.uid()
          and cm.status = 'active'
    )
);

grant select
on public.courses
to authenticated;

commit;