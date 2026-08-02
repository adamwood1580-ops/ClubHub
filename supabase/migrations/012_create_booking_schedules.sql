begin;

-- =========================================================
-- BOOKING SCHEDULES
--
-- Defines when a course normally offers tee times.
-- Actual tee_times rows will be generated from these records.
-- =========================================================

create table public.booking_schedules (
    id uuid primary key default gen_random_uuid(),

    course_id uuid not null
        references public.courses(id)
        on delete cascade,

    name text not null,

    first_tee_time time without time zone not null,
    last_tee_time time without time zone not null,

    interval_minutes smallint not null,
    max_players smallint not null default 4,

    monday boolean not null default true,
    tuesday boolean not null default true,
    wednesday boolean not null default true,
    thursday boolean not null default true,
    friday boolean not null default true,
    saturday boolean not null default true,
    sunday boolean not null default true,

    effective_from date not null,
    effective_to date,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint booking_schedules_name_not_blank
        check (length(trim(name)) > 0),

    constraint booking_schedules_times_valid
        check (last_tee_time >= first_tee_time),

    constraint booking_schedules_interval_valid
        check (interval_minutes between 1 and 60),

    constraint booking_schedules_max_players_valid
        check (max_players between 1 and 8),

    constraint booking_schedules_dates_valid
        check (
            effective_to is null
            or effective_to >= effective_from
        ),

    constraint booking_schedules_has_active_day
        check (
            monday
            or tuesday
            or wednesday
            or thursday
            or friday
            or saturday
            or sunday
        ),

    constraint booking_schedules_course_name_dates_unique
        unique (
            course_id,
            name,
            effective_from
        )
);

create index booking_schedules_course_id_idx
on public.booking_schedules (course_id);

create index booking_schedules_active_dates_idx
on public.booking_schedules (
    course_id,
    is_active,
    effective_from,
    effective_to
);

create trigger set_booking_schedules_updated_at
before update on public.booking_schedules
for each row
execute function public.set_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY
--
-- Schedules are operational ClubHub data.
-- Only authorised staff roles may read them in the browser.
-- Direct browser writes remain disabled for now.
-- =========================================================

alter table public.booking_schedules
enable row level security;

create policy "Club staff can read booking schedules"
on public.booking_schedules
for select
to authenticated
using (
    exists (
        select 1
        from public.courses as c
        join public.club_memberships as cm
            on cm.club_id = c.club_id
        where c.id = booking_schedules.course_id
          and cm.profile_id = auth.uid()
          and cm.status = 'active'
          and cm.role in (
              'starter',
              'reception',
              'professional',
              'manager',
              'club_admin'
          )
    )
);

revoke all
on public.booking_schedules
from anon;

revoke all
on public.booking_schedules
from authenticated;

grant select
on public.booking_schedules
to authenticated;

commit;