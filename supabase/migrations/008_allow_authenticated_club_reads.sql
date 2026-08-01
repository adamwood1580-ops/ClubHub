begin;

alter table public.clubs
enable row level security;

drop policy if exists
    "Authenticated users can read clubs"
on public.clubs;

create policy
    "Authenticated users can read clubs"
on public.clubs
for select
to authenticated
using (true);

commit;